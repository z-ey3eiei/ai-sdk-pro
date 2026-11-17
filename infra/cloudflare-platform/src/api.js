import {
  all, b64url, cookie, decode, first, hash, hostPattern, HttpError, json, keyPattern, projectHost, random, readCookie,
  readLimited, run, seal, shaPattern, slugPattern, unseal, utf8, uuid,
} from './shared.js';
import { github, githubExchange, installationToken, githubAppIssuer, verifySignature } from './github.js';
import { cloudflare } from './cloudflare.js';
import { readBridgeMessage } from './bridge.js';
export { DeploymentWorkflow, BuildSandbox, ContainerProxy } from './pipeline.js';

const projectColumns = 'id,name,repo_full_name,repo_id,branch,framework,build_command,output_dir,auto_deploy,active_deployment_id,created_at';
const quotaError = (error) => /(?:project|deployment|concurrent|variable|domain)_quota/.test(error.message);
const outputPath = /^(?=.{1,96}$)[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/;
const callback = (env) => `${env.API_ORIGIN}/auth/github/callback`;

async function body(request) {
  try { return JSON.parse(decode.decode(await readLimited(request, 32_768))); }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'Invalid JSON.'); }
}

async function auth(request, env, url) {
  if (url.pathname === '/auth/github') {
    const state = random();
    const verifier = random();
    const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8.encode(verifier))));
    const githubUrl = new URL('https://github.com/login/oauth/authorize');
    githubUrl.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: callback(env), state,
      code_challenge: challenge, code_challenge_method: 'S256' });
    const headers = new Headers({ Location: githubUrl.href, 'Cache-Control': 'no-store' });
    headers.append('Set-Cookie', cookie('oauth', state + verifier, 600));
    return new Response(null, { status: 302, headers });
  }
  if (url.pathname !== '/auth/github/callback') throw new HttpError(404, 'Not found.');
  const saved = readCookie(request, 'oauth');
  const code = url.searchParams.get('code');
  if (saved?.length !== 128 || saved.slice(0, 64) !== url.searchParams.get('state') || !code)
    throw new HttpError(400, 'Invalid OAuth state.');
  const token = await githubExchange(env, code, saved.slice(64), callback(env));
  const profile = await github('/user', token);
  const githubId = typeof profile.id === 'number' ? profile.id : Number(profile.id);
  if (!Number.isSafeInteger(githubId) || typeof profile.login !== 'string') throw new HttpError(502, 'Invalid GitHub profile.');
  const allowlist = (env.BETA_GITHUB_IDS ?? '').split(',').map((id) => id.trim());
  if (!allowlist.includes(String(githubId))) throw new HttpError(403, 'This deployment dashboard is invite-only.');
  const email = typeof profile.email === 'string' ? profile.email : null;
  await run(env, `INSERT INTO users(id,github_id,username,email) VALUES(?,?,?,?)
    ON CONFLICT(github_id) DO UPDATE SET username=excluded.username,email=excluded.email`,
    uuid(), githubId, profile.login, email);
  const user = await first(env, 'SELECT id FROM users WHERE github_id=?', githubId);
  if (!user?.id) throw new HttpError(500, 'Could not persist user profile.');
  const secret = random();
  const tokenHash = await hash(secret);
  let encrypted;
  try {
    encrypted = await seal(env, token, tokenHash);
  } catch {
    throw new HttpError(503, 'Session encryption is misconfigured.');
  }
  await run(env, 'INSERT INTO sessions VALUES(?,?,unixepoch()+28800,?)', tokenHash, user.id, encrypted);
  const headers = new Headers({ Location: '/', 'Cache-Control': 'no-store' });
  headers.append('Set-Cookie', cookie('oauth', '', 0));
  headers.append('Set-Cookie', cookie('session', secret, 28800));
  return new Response(null, { status: 303, headers });
}

async function session(request, env) {
  const secret = readCookie(request, 'session');
  if (secret?.length !== 64) throw new HttpError(401, 'Sign in with GitHub.');
  const tokenHash = await hash(secret);
  const user = await first(env, `SELECT u.*,s.github_token_encrypted FROM users u JOIN sessions s ON s.user_id=u.id
      WHERE s.token_hash=? AND s.expires_at>unixepoch()`, tokenHash);
  if (!user) throw new HttpError(401, 'Session expired.');
  return { ...user, tokenHash };
}

async function githubUserToken(env, user) {
  try {
    return await unseal(env, user.github_token_encrypted, user.tokenHash);
  } catch {
    throw new HttpError(401, 'Session expired. Sign in with GitHub again.');
  }
}

async function enqueue(env, project, sha, delivery = null) {
  const id = uuid();
  const row = await first(env, `INSERT INTO deployments(id,project_id,user_id,commit_sha,github_delivery)
    VALUES(?,?,?,?,?) ON CONFLICT(project_id,github_delivery) DO NOTHING RETURNING id`, id, project.id, project.user_id, sha, delivery);
  if (row) await sendPending(env, row.id);
  return row;
}

async function sendPending(env, id) {
  try {
    await env.DEPLOY_QUEUE.send({ id });
    await run(env, "UPDATE deployments SET enqueued_at=unixepoch() WHERE id=? AND status='pending'", id);
  } catch {
    console.error('queue_send_failed', { id });
    // Pending D1 rows are retried by the scheduled outbox sweep.
  }
}

async function webhook(request, env) {
  const bytes = await readLimited(request, 2_000_000);
  if (!await verifySignature(bytes, request.headers.get('x-hub-signature-256'), env.GITHUB_WEBHOOK_SECRET))
    throw new HttpError(401, 'Invalid GitHub signature.');
  const event = request.headers.get('x-github-event');
  if (event !== 'push') return json({ accepted: true });
  const payload = JSON.parse(decode.decode(bytes));
  const installation = payload.installation?.id;
  const repo = payload.repository?.id;
  const delivery = request.headers.get('x-github-delivery');
  if (payload.deleted || !shaPattern.test(payload.after ?? '') || !Number.isSafeInteger(installation) ||
      !Number.isSafeInteger(repo) || !payload.ref?.startsWith('refs/heads/') || !/^[a-f0-9-]{36}$/i.test(delivery ?? ''))
    return json({ accepted: true, queued: 0 });
  const projects = await all(env, `SELECT id,user_id FROM projects WHERE installation_id=? AND repo_id=? AND branch=?
    AND auto_deploy=1 AND deleted_at IS NULL AND suspended_at IS NULL`, installation, repo, payload.ref.slice(11));
  let queued = 0;
  let limited = 0;
  for (const project of projects) {
    try { if (await enqueue(env, project, payload.after, delivery)) queued++; }
    catch (error) { if (!quotaError(error)) throw error; limited++; }
  }
  return json({ queued, limited }, 202);
}

function settings(input) {
  const output = input.output_dir || null;
  const framework = input.framework ?? 'auto';
  const command = input.build_command || null;
  if (!['auto', 'static', 'astro', 'nextjs'].includes(framework) ||
      (output !== null && !outputPath.test(output)) || (command !== null && command !== 'npm run build'))
    throw new HttpError(400, 'Invalid build settings. Supported build command: npm run build.');
  return [framework, command, output];
}

async function domains(request, env, project, id) {
  if (!id && request.method === 'GET') return json(await all(env, 'SELECT id,domain,status FROM custom_domains WHERE project_id=?', project.id));
  if (!env.SAAS_ZONE_ID || !env.SAAS_API_TOKEN) throw new HttpError(503, 'Custom domains are not configured.');
  const base = `/zones/${env.SAAS_ZONE_ID}/custom_hostnames`;
  if (!id && request.method === 'POST') {
    const { domain } = await body(request);
    const host = typeof domain === 'string' ? domain.toLowerCase().trim() : '';
    if (!hostPattern.test(host) || [env.PROJECT_DOMAIN, new URL(env.API_ORIGIN).hostname].some((suffix) =>
      host === suffix || host.endsWith(`.${suffix}`)) || host === 'ai-sdk.pro' || host.endsWith('.ai-sdk.pro'))
      throw new HttpError(400, 'Enter an external hostname.');
    const domainId = uuid();
    await run(env, 'INSERT INTO custom_domains(id,project_id,domain) VALUES(?,?,?)', domainId, project.id, host);
    let remote;
    try {
      remote = await cloudflare(base, env.SAAS_API_TOKEN, 'POST', { hostname: host, ssl: { method: 'txt', type: 'dv' } });
    } catch (error) {
      // Keep the reservation when the outcome is ambiguous so another owner cannot claim it.
      await run(env, "UPDATE custom_domains SET status='error' WHERE id=?", domainId);
      throw error;
    }
    await run(env, 'UPDATE custom_domains SET cloudflare_id=? WHERE id=?', remote.id, domainId);
    return json({ id: domainId, domain: host, status: remote.status, cname_target: env.SAAS_CNAME_TARGET,
      ownership_verification: remote.ownership_verification, ssl: remote.ssl }, 201);
  }
  const domain = await first(env, 'SELECT * FROM custom_domains WHERE id=? AND project_id=?', id ?? '', project.id);
  if (!domain) throw new HttpError(404, 'Domain not found.');
  if (request.method === 'DELETE') {
    await run(env, "UPDATE custom_domains SET status='disabled' WHERE id=?", domain.id);
    await env.ROUTES.delete(domain.domain);
    if (!domain.cloudflare_id) throw new HttpError(409, 'Provider state requires operator reconciliation.');
    try { await cloudflare(`${base}/${domain.cloudflare_id}`, env.SAAS_API_TOKEN, 'DELETE'); }
    catch (error) { if (error.status !== 404) throw error; }
    await run(env, 'DELETE FROM custom_domains WHERE id=?', domain.id);
    return json({ removed: true });
  }
  if (request.method !== 'POST' || !domain.cloudflare_id || domain.status === 'disabled') throw new HttpError(409, 'Hostname cannot be checked.');
  const remote = await cloudflare(`${base}/${domain.cloudflare_id}`, env.SAAS_API_TOKEN);
  const status = remote.status === 'active' && remote.ssl?.status === 'active' ? 'active' : 'pending';
  await run(env, "UPDATE custom_domains SET status=? WHERE id=? AND status!='disabled'", status, domain.id);
  return json({ status, cname_target: env.SAAS_CNAME_TARGET, ownership_verification: remote.ownership_verification, ssl: remote.ssl });
}

async function api(request, env, url) {
  const user = await session(request, env);
  const method = request.method;
  const [, , area, id, action, item, extra] = url.pathname.split('/');
  if (extra) throw new HttpError(404, 'Not found.');
  if (area === 'me' && method === 'GET') return json({ username: user.username, plan: user.plan, project_domain: env.PROJECT_DOMAIN, github_app: env.GITHUB_APP_SLUG });
  if (area === 'logout' && method === 'POST') {
    await run(env, 'DELETE FROM sessions WHERE token_hash=?', user.tokenHash);
    return new Response(null, { status: 204, headers: { 'Set-Cookie': cookie('session', '', 0) } });
  }
  if (area === 'repos' && method === 'GET') {
    const token = await githubUserToken(env, user);
    const installation = url.searchParams.get('installation');
    const page = Math.min(Math.max(parseInt(url.searchParams.get('page') ?? '1', 10) || 1, 1), 100);
    if (installation) {
      if (!/^[1-9][0-9]{0,14}$/.test(installation)) throw new HttpError(400, 'Invalid installation.');
      const result = await github(`/user/installations/${installation}/repositories?per_page=30&page=${page}`, token);
      const repositories = Array.isArray(result.repositories) ? result.repositories : [];
      return json({ items: repositories.map((r) => ({ id:r.id, full_name:r.full_name, default_branch:r.default_branch, private:r.private })), total: result.total_count ?? repositories.length });
    }
    const result = await github(`/user/installations?per_page=30&page=${page}`, token);
    const installations = Array.isArray(result.installations) ? result.installations : [];
    return json({ items: installations.map((i) => ({ id:i.id, name:i.account.login })), total: result.total_count ?? installations.length });
  }
  if (area !== 'projects') throw new HttpError(404, 'Not found.');
  if (!id && method === 'GET') return json(await all(env, `SELECT ${projectColumns} FROM projects WHERE user_id=? AND deleted_at IS NULL ORDER BY created_at DESC`, user.id));
  if (!id && method === 'POST') {
    const input = await body(request);
    const { name, installation_id, repository } = input;
    if (!slugPattern.test(name ?? '') || ['www', 'api', 'deploy', 'deploy-staging', 'preview', 'origin', 'staging', 'docs', 'mcp', 'sub', 'os', 'turbo', 'mail', 'urban-couscous'].includes(name) ||
        !Number.isSafeInteger(installation_id) || installation_id < 1 || !/^[\w.-]+\/[\w.-]+$/.test(repository ?? ''))
      throw new HttpError(400, 'Invalid project name, installation, or repository.');
    const token = await githubUserToken(env, user);
    const repo = await github(`/repos/${repository}`, token);
    if (!repo.permissions?.push && !repo.permissions?.admin) throw new HttpError(403, 'Repository write access required.');
    const installed = await installationToken(env, installation_id, repo.id);
    await github(`/repos/${repo.full_name}`, installed);
    const project = { id: uuid(), user_id: user.id };
    await run(env, `INSERT INTO projects(id,user_id,name,repo_full_name,repo_id,installation_id,branch,framework,build_command,output_dir)
      VALUES(?,?,?,?,?,?,?,?,?,?)`, project.id, user.id, name, repo.full_name, repo.id, installation_id, repo.default_branch, ...settings(input));
    return json({ id: project.id, hostname: projectHost(name, env) }, 201);
  }
  const project = await first(env, 'SELECT * FROM projects WHERE id=? AND user_id=? AND deleted_at IS NULL', id ?? '', user.id);
  if (!project) throw new HttpError(404, 'Project not found.');
  if (!action && method === 'PATCH') {
    const input = await body(request);
    if (input.branch !== undefined && (typeof input.branch !== 'string' || !input.branch.trim() || input.branch.length > 180))
      throw new HttpError(400, 'Invalid branch.');
    await run(env, `UPDATE projects SET branch=?,framework=?,build_command=?,output_dir=?,auto_deploy=? WHERE id=?`,
      input.branch ?? project.branch, ...settings({ ...project, ...input }),
      input.auto_deploy === undefined ? project.auto_deploy : Number(Boolean(input.auto_deploy)), project.id);
    return json({ saved: true });
  }
  if (!action && method === 'DELETE') {
    const domains = await first(env, 'SELECT count(*) AS count FROM custom_domains WHERE project_id=?', project.id);
    if (domains.count) throw new HttpError(409, 'Remove custom domains first.');
    await env.DB.batch([
      env.DB.prepare('UPDATE projects SET deleted_at=unixepoch(),active_deployment_id=NULL WHERE id=?').bind(project.id),
      env.DB.prepare('DELETE FROM env_vars WHERE project_id=?').bind(project.id),
    ]);
    await env.ROUTES.delete(projectHost(project.name, env));
    return json({ removed: true });
  }
  if (action === 'deployments' && !item && method === 'POST') {
    if (project.suspended_at) throw new HttpError(403, 'Project suspended.');
    const userToken = await githubUserToken(env, user);
    const repo = await github(`/repos/${project.repo_full_name}`, userToken);
    if (repo.id !== project.repo_id || (!repo.permissions?.push && !repo.permissions?.admin))
      throw new HttpError(403, 'Repository write access required.');
    const token = await installationToken(env, project.installation_id, project.repo_id);
    const commit = await github(`/repos/${project.repo_full_name}/commits/${encodeURIComponent(project.branch)}`, token);
    if (!shaPattern.test(commit.sha)) throw new HttpError(502, 'GitHub did not return a commit.');
    return json(await enqueue(env, project, commit.sha), 202);
  }
  if (action === 'deployments' && !item && method === 'GET') return json(await all(env,
    'SELECT id,commit_sha,status,url,created_at,finished_at FROM deployments WHERE project_id=? ORDER BY seq DESC LIMIT 50', project.id));
  if (action === 'logs' && item && method === 'GET') {
    const deployment = await first(env, 'SELECT build_log_key FROM deployments WHERE project_id=? AND id=?', project.id, item);
    if (!deployment?.build_log_key) throw new HttpError(404, 'Build log not available.');
    const log = await env.BUILD_DATA.get(deployment.build_log_key);
    if (!log) throw new HttpError(404, 'Build log expired.');
    return new Response(log.body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  if (action === 'domains') return domains(request, env, project, item);
  if (action === 'env' && !item && method === 'GET') return json(await all(env, 'SELECT key,created_at FROM env_vars WHERE project_id=? ORDER BY key', project.id));
  if (action === 'env' && item && keyPattern.test(item)) {
    if (method === 'DELETE') {
      await run(env, 'DELETE FROM env_vars WHERE project_id=? AND key=?', project.id, item);
      return json({ removed: true });
    }
    if (method === 'PUT') {
      const { value } = await body(request);
      if (typeof value !== 'string' || utf8.encode(value).length > 4096 || item === 'ASSETS') throw new HttpError(400, 'Invalid variable.');
      let valueEncrypted;
      try {
        valueEncrypted = await seal(env, value, `${project.id}:${item}`);
      } catch {
        throw new HttpError(503, 'Session encryption is misconfigured.');
      }
      await run(env, `INSERT INTO env_vars(project_id,key,value_encrypted) VALUES(?,?,?)
        ON CONFLICT(project_id,key) DO UPDATE SET value_encrypted=excluded.value_encrypted`,
        project.id, item, valueEncrypted);
      return json({ saved: true });
    }
  }
  throw new HttpError(404, 'Not found.');
}


/** First-party ai-sdk.pro workspace backend: Better Auth remains the sole user login. */
async function internalWorkspace(request, env) {
  if (env.PLATFORM_BRIDGE_ENABLED !== 'true') throw new HttpError(503, 'Unified deployment is not enabled.');
  const input = await readBridgeMessage(request, env);
  const actor = input.actor;
  // Keep this pilot invite-only until external builds and routing are verified.
  const permitted = (env.BETA_GITHUB_IDS ?? '').split(',').map(value => value.trim()).includes(String(actor.githubId));
  if (!permitted) throw new HttpError(403, 'Deployment pilot is not enabled for this account.');
  await run(env, 'INSERT INTO users(id,github_id,username) VALUES(?,?,?) ' +
    'ON CONFLICT(github_id) DO UPDATE SET username=excluded.username',
    uuid(), actor.githubId, actor.login);
  const user = await first(env, 'SELECT id,plan FROM users WHERE github_id=?', actor.githubId);
  if (!user?.id) throw new HttpError(503, 'Deployment account is unavailable.');

  if (input.operation === 'list') {
    const items = await all(env, 'SELECT ' + projectColumns +
      ' FROM projects WHERE user_id=? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 50', user.id);
    return json({
      projects: items,
      routingReady: env.PROJECT_ROUTING_READY === 'true',
      frameworkBuilds: env.FRAMEWORK_BUILDS === 'enabled',
      projectDomain: env.PROJECT_DOMAIN,
    });
  }

  if (input.operation === 'import') {
    const { name, repository, repoId, installationId, framework, outputDir } = input;
    if (!slugPattern.test(name ?? '') ||
        ['www','api','deploy','deploy-staging','preview','origin','staging','docs','mcp','sub','os','turbo','mail','urban-couscous'].includes(name) ||
        !new RegExp('^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$').test(repository ?? '') ||
        !Number.isSafeInteger(repoId) || repoId < 1 ||
        !Number.isSafeInteger(installationId) || installationId < 1)
      throw new HttpError(400, 'Invalid deployment project.');
    // Reverify the source with the existing GitHub App installation, not a browser-supplied token.
    const token = await installationToken(env, installationId, repoId);
    const repo = await github('/repos/' + repository, token);
    if (repo.id !== repoId || repo.full_name.toLowerCase() !== repository.toLowerCase())
      throw new HttpError(403, 'GitHub App does not have access to this repository.');
    const defaults = settings({ framework: framework || 'auto', output_dir: outputDir || null });
    const projectId = uuid();
    await run(env, 'INSERT INTO projects(id,user_id,name,repo_full_name,repo_id,installation_id,branch,framework,build_command,output_dir) ' +
      'VALUES(?,?,?,?,?,?,?,?,?,?)', projectId, user.id, name, repo.full_name, repo.id,
      installationId, repo.default_branch, ...defaults);
    return json({ id: projectId, hostname: projectHost(name, env) }, 201);
  }

  if (typeof input.projectId !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.projectId))
    throw new HttpError(400, 'Invalid project selection.');
  const project = await first(env, 'SELECT * FROM projects WHERE id=? AND user_id=? AND deleted_at IS NULL',
    input.projectId, user.id);
  if (!project) throw new HttpError(404, 'Project not found.');

  if (input.operation === 'history') {
    const items = await all(env, 'SELECT id,commit_sha,status,url,created_at,finished_at ' +
      'FROM deployments WHERE project_id=? ORDER BY seq DESC LIMIT 30', project.id);
    return json({ deployments: items, routingReady: env.PROJECT_ROUTING_READY === 'true' });
  }
  if (input.operation === 'deploy') {
    if (env.PROJECT_ROUTING_READY !== 'true') throw new HttpError(503, 'Project DNS and Worker routing are not configured.');
    if (project.suspended_at) throw new HttpError(403, 'Project suspended.');
    if (!/^[0-9a-f-]{36}$/i.test(input.deliveryId ?? ''))
      throw new HttpError(400, 'Invalid deployment request ID.');
    const token = await installationToken(env, project.installation_id, project.repo_id);
    const commit = await github('/repos/' + project.repo_full_name + '/commits/' +
      encodeURIComponent(project.branch), token);
    if (!shaPattern.test(commit.sha)) throw new HttpError(502, 'GitHub did not return a commit.');
    const queued = await enqueue(env, project, commit.sha, input.deliveryId);
    return json({ queued: Boolean(queued), deploymentId: queued?.id ?? null }, queued ? 202 : 200);
  }
  throw new HttpError(404, 'Unsupported deployment operation.');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.origin !== env.API_ORIGIN) return json({ error: 'Unknown platform host.' }, 404);
    try {
      if (url.pathname === '/health' && request.method === 'GET') {
        await first(env, 'SELECT 1');
        const diagnostics = { status: 'ok', d1: true, crypto: false, github_app_issuer: (() => { try { return Boolean(githubAppIssuer(env)); } catch { return false; } })() };
        try {
          const probe = random();
          await seal(env, probe, probe);
          diagnostics.crypto = true;
        } catch {
          diagnostics.status = 'degraded';
        }
        return json(diagnostics, diagnostics.status === 'ok' ? 200 : 503);
      }
      if (url.pathname === '/internal/workspace') return await internalWorkspace(request, env);
      if (url.pathname === '/api/github/webhook' && request.method === 'POST') return await webhook(request, env);
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && request.headers.get('origin') !== url.origin)
        throw new HttpError(403, 'Invalid request origin.');
      if (request.method === 'GET' && url.pathname.startsWith('/auth/')) return await auth(request, env, url);
      if (url.pathname.startsWith('/api/')) return await api(request, env, url);
      return env.DASHBOARD.fetch(request);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      if (quotaError(error)) return json({ error: 'Plan limit reached. Review your project or deployment quota.' }, 429);
      if (/UNIQUE constraint failed/.test(error.message)) return json({ error: 'Name or hostname is already reserved.' }, 409);
      console.error('api_error', { name: error.name, message: error.message, path: url.pathname });
      const debug = env.PLATFORM_DEBUG_ERRORS === 'true' || env.PLATFORM_DEBUG_ERRORS === '1';
      return json({ error: 'Platform request failed.', ...(debug && error?.message ? { detail: error.message } : {}) }, 500);
    }
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      const { id } = message.body ?? {};
      if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) { message.ack(); continue; }
      try {
        const row = await first(env, 'SELECT status FROM deployments WHERE id=?', id);
        if (row?.status === 'pending') {
          try { await env.DEPLOYMENT.create({ id, params: { id } }); }
          catch (error) {
            const existing = await env.DEPLOYMENT.get(id);
            await existing.status().catch(() => { throw error; });
          }
        }
        message.ack();
      } catch {
        message.retry({ delaySeconds: 30 });
      }
    }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil((async () => {
      const pending = await all(env, `SELECT id FROM deployments WHERE status='pending'
        AND (enqueued_at IS NULL OR enqueued_at<unixepoch()-300) ORDER BY seq LIMIT 30`);
      for (const { id } of pending) await sendPending(env, id);
      await run(env, 'DELETE FROM sessions WHERE expires_at<unixepoch()');
    })());
  },
};
