import { NonRetryableError } from 'cloudflare:workflows';
import { WorkflowEntrypoint } from 'cloudflare:workers';
import { ContainerProxy, Sandbox, getSandbox } from '@cloudflare/sandbox';
import { all, b64, decode, first, projectHost, run, scriptName, shaPattern, unseal, utf8, uuid } from './shared.js';
import { getArchive, installationToken } from './github.js';
import { deployAssets, normalizeAssets, sourceFiles } from './assets.js';

export { ContainerProxy };
export class BuildSandbox extends Sandbox {
  enableInternet = false;
  allowedHosts = ['registry.npmjs.org'];
  interceptHttps = true;
  sleepAfter = '2m';
}

const packer = `
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[1];
if (fs.realpathSync(root) !== root) throw Error('Output directory must be a regular directory.');
const files = Object.create(null);
let total = 0;
let count = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!/^[A-Za-z0-9_][A-Za-z0-9_.@-]*$/.test(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (!entry.isFile()) continue;
    const stat = fs.statSync(full);
    total += stat.size;
    if (++count > 300 || total > 8000000 || stat.size > 2000000) throw Error('Asset limit exceeded.');
    files[path.relative(root, full)] = fs.readFileSync(full).toString('base64');
  }
}
walk(root);
process.stdout.write(JSON.stringify(files));
`;

const outputPattern = /^(?=.{1,96}$)[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/;
const safeShell = (value) => "'" + value.replaceAll("'", "'\\''") + "'";
function framework(files, selected) {
  if (selected !== 'auto') return selected;
  const manifest = files['package.json'] ? JSON.parse(decode.decode(files['package.json'])) : {};
  const deps = { ...manifest.devDependencies, ...manifest.dependencies };
  if (deps.astro) return 'astro';
  if (deps.next) return 'nextjs';
  return 'static';
}

async function buildInSandbox(env, files, output, logs) {
  if (!outputPattern.test(output)) throw new Error('Invalid output directory.');
  if (!files['package-lock.json'] || !files['package.json']) throw new Error('Framework builds require npm package-lock.json.');
  if (env.FRAMEWORK_BUILDS !== 'enabled') throw new Error('Container framework builds are disabled until the operator verifies network policy.');
  const sandbox = getSandbox(env.BUILD_SANDBOX, `deploy-${uuid()}`);
  const root = '/workspace/source';
  try {
    const dirs = new Set([root]);
    for (const path of Object.keys(files)) {
      const relativeDir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      if (relativeDir) dirs.add(`${root}/${relativeDir}`);
    }
    const init = await sandbox.exec(`mkdir -p ${[...dirs].map(safeShell).join(' ')}`, { timeout: 20_000 });
    if (!init.success) throw new Error('Could not initialize build sandbox.');
    for (const [path, bytes] of Object.entries(files)) {
      const written = await sandbox.writeFile(`${root}/${path}`, b64(bytes), { encoding: 'base64' });
      if (!written.success) throw new Error('Could not write source to build sandbox.');
    }
    const childEnv = { NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org/', NEXT_TELEMETRY_DISABLED: '1', ASTRO_TELEMETRY_DISABLED: '1' };
    for (const command of ['npm ci --ignore-scripts --no-audit --no-fund', 'npm run build']) {
      const result = await sandbox.exec(`(ulimit -f 512 && ${command}) > /tmp/build.log 2>&1; result=$?; tail -c 48000 /tmp/build.log; exit "$result"`, {
        cwd: root, timeout: 150_000, env: childEnv,
      });
      logs.push(`$ ${command}\n${result.stdout.slice(-48_000)}`);
      if (!result.success) throw new Error(`${command} failed (exit ${result.exitCode}).`);
    }
    const result = await sandbox.exec(`node -e ${safeShell(packer)} ${safeShell(`${root}/${output}`)} > /tmp/assets.json`, { cwd: root, timeout: 20000 });
    if (!result.success) throw new Error('Build output could not be collected. Next.js requires a static export and Astro requires static output.');
    const metadata = await sandbox.exec('wc -c < /tmp/assets.json', { timeout: 10000 });
    if (!metadata.success || !/^[0-9]+$/.test(metadata.stdout.trim()) || Number(metadata.stdout) > 11_000_000) throw new Error('Invalid build output size.');
    const bundle = await sandbox.readFile('/tmp/assets.json');
    if (!bundle.success || bundle.content.length > 11_000_000) throw new Error('Invalid build output.');
    return normalizeAssets(JSON.parse(bundle.content));
  } finally {
    await sandbox.destroy().catch(() => {});
  }
}

export class DeploymentWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const env = this.env;
    const { id } = event.payload;
    const logKey = `logs/${id}.txt`;
    const artifactKey = `artifacts/${id}.json`;
    try {
      const row = await step.do('claim queue entry', async () => {
        const item = await first(env, `SELECT d.*,p.name,p.repo_full_name,p.repo_id,p.installation_id,p.framework,p.output_dir,
          p.deleted_at,p.suspended_at FROM deployments d JOIN projects p ON p.id=d.project_id WHERE d.id=?`, id);
        if (!item || !shaPattern.test(item.commit_sha) || item.deleted_at || item.suspended_at) throw new NonRetryableError('Deployment is unavailable.');
        if (!['pending', 'building'].includes(item.status)) return null;
        await run(env, "UPDATE deployments SET status='building',started_at=coalesce(started_at,unixepoch()) WHERE id=? AND status='pending'", id);
        return item;
      });
      if (!row) return;
      await step.do('build pinned source', { retries: { limit: 0, delay: '1 second' }, timeout: '10 minutes' }, async () => {
        const logs = [`Building commit ${row.commit_sha}`];
        try {
          const token = await installationToken(env, row.installation_id, row.repo_id);
          const files = sourceFiles(await getArchive(row.repo_full_name, token, row.commit_sha));
          const detected = framework(files, row.framework);
          logs.push(`Framework: ${detected}`);
          let assets;
          if (detected === 'static') {
            const folder = row.output_dir || (files['public/index.html'] ? 'public' : '');
            const prefix = folder ? `${folder}/` : '';
            assets = normalizeAssets(Object.fromEntries(Object.entries(files)
              .filter(([path]) => path.startsWith(prefix)).map(([path, value]) => [path.slice(prefix.length), value])));
          } else {
            assets = await buildInSandbox(env, files, row.output_dir || (detected === 'nextjs' ? 'out' : 'dist'), logs);
          }
          assets['_aisdk-commit.json'] = b64(utf8.encode(JSON.stringify({ commit: row.commit_sha })));
          await env.BUILD_DATA.put(artifactKey, JSON.stringify(assets));
          logs.push(`Prepared ${Object.keys(assets).length} assets.`);
        } catch (error) {
          logs.push(`Build failed: ${error.message.slice(0, 350)}`);
          throw error;
        } finally {
          await env.BUILD_DATA.put(logKey, logs.join('\n'));
          await run(env, 'UPDATE deployments SET build_log_key=? WHERE id=?', logKey, id);
        }
      });
      await step.do('publish immutable worker', { retries: { limit: 2, delay: '10 seconds' }, timeout: '4 minutes' }, async () => {
        const artifact = await env.BUILD_DATA.get(artifactKey);
        if (!artifact) throw new Error('Build artifact was not found.');
        const vars = await all(env, 'SELECT key,value_encrypted FROM env_vars WHERE project_id=?', row.project_id);
        const bindings = await Promise.all(vars.map(async (variable) => ({
          name: variable.key, type: 'secret_text', text: await unseal(env, variable.value_encrypted, `${row.project_id}:${variable.key}`),
        })));
        await deployAssets(env, scriptName(id), await artifact.json(), bindings);
      });
      await step.do('promote routing', async () => {
        const url = `https://${projectHost(row.name, env)}/`;
        await env.DB.batch([
          env.DB.prepare(`UPDATE projects SET active_deployment_id=? WHERE id=? AND deleted_at IS NULL AND suspended_at IS NULL
            AND coalesce((SELECT seq FROM deployments WHERE id=projects.active_deployment_id),0)<=?`).bind(id, row.project_id, row.seq),
          env.DB.prepare(`UPDATE deployments SET status=CASE WHEN (SELECT active_deployment_id FROM projects WHERE id=?)=?
            THEN 'success' ELSE 'superseded' END,artifact_key=?,url=?,finished_at=unixepoch() WHERE id=?`)
            .bind(row.project_id, id, artifactKey, url, id),
        ]);
        const active = await first(env, 'SELECT active_deployment_id FROM projects WHERE id=? AND deleted_at IS NULL AND suspended_at IS NULL', row.project_id);
        if (active?.active_deployment_id === id) {
          await env.ROUTES.put(projectHost(row.name, env), scriptName(id)).catch(() => {});
          const domains = await all(env, "SELECT domain FROM custom_domains WHERE project_id=? AND status='active'", row.project_id);
          await Promise.all(domains.map(({domain}) => env.ROUTES.put(domain, scriptName(id)).catch(() => {})));
        }
      });
    } catch (error) {
      await step.do('record failed deployment', async () => {
        const old = await env.BUILD_DATA.get(logKey);
        const detail = (await old?.text()) ?? '';
        await env.BUILD_DATA.put(logKey, detail + `\nDeployment failed: ${error.message.slice(0, 350)}`);
        await run(env, "UPDATE deployments SET status='failed',finished_at=unixepoch(),build_log_key=? WHERE id=? AND status IN ('pending','building')", logKey, id);
      });
      throw error;
    }
  }
}
