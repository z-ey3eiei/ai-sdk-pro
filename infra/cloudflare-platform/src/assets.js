import { unzipSync } from 'fflate';
import { b64, hash, unb64 } from './shared.js';
import { cloudflare } from './cloudflare.js';

const types = {
  html:'text/html', css:'text/css', js:'text/javascript', mjs:'text/javascript', json:'application/json',
  txt:'text/plain', xml:'application/xml', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg',
  gif:'image/gif', ico:'image/x-icon', webp:'image/webp', svg:'image/svg+xml', avif:'image/avif',
  woff:'font/woff', woff2:'font/woff2', wasm:'application/wasm', webmanifest:'application/manifest+json',
};
const safePath = (path) => path.length <= 240 && path.split('/').every((part) => /^[A-Za-z0-9_][A-Za-z0-9_.@-]*$/.test(part) && !/^(?:node_modules|vendor|credentials|secrets?)$/i.test(part));
export function assetType(path) {
  const extension = path.split('.').at(-1).toLowerCase();
  return safePath(path) && Object.hasOwn(types, extension) ? types[extension] : undefined;
}

export function sourceFiles(archive) {
  let sourceSize = 0;
  let files = 0;
  const zip = unzipSync(archive, { filter(file) {
    const parts = file.name.split('/');
    const path = parts.slice(1).join('/');
    if (file.name.endsWith('/') || !parts[0] || !safePath(path)) return false;
    sourceSize += file.originalSize;
    if (++files > 500 || sourceSize > 16_000_000) throw new Error('Repository exceeds the pilot source limits.');
    return true;
  } });
  return Object.fromEntries(Object.entries(zip).map(([key, bytes]) => [key.slice(key.indexOf('/') + 1), bytes]));
}

export function normalizeAssets(files) {
  const accepted = {};
  let size = 0;
  let count = 0;
  for (const [path, content] of Object.entries(files)) {
    if (!assetType(path) || /(?:^|\/)(?:package(?:-lock)?\.json|tsconfig\.json|_aisdk-commit\.json)$/i.test(path)) continue;
    if (typeof content === 'string' && content.length > 2_666_672) throw new Error('Asset exceeds the per-file limit.');
    const bytes = typeof content === 'string' ? unb64(content) : content;
    size += bytes.length;
    if (++count > 300 || bytes.length > 2_000_000 || size > 8_000_000) throw new Error('Build output exceeds the pilot asset limits.');
    accepted[path] = b64(bytes);
  }
  if (!Object.hasOwn(accepted, 'index.html')) throw new Error('No index.html in the selected output directory.');
  return accepted;
}

export async function deployAssets(env, name, artifacts, bindings) {
  const account = `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}`;
  const script = `${account}/workers/dispatch/namespaces/${encodeURIComponent(env.DISPATCH_NAMESPACE)}/scripts/${name}`;
  const manifest = {};
  const files = new Map();
  for (const [path, base64] of Object.entries(artifacts)) {
    const bytes = unb64(base64);
    const type = assetType(path);
    // Include the MIME type in the hash to keep equal bytes with different types distinct.
    const digest = (await hash(`${type}\n${base64}`)).slice(0, 32);
    manifest[`/${path}`] = { hash: digest, size: bytes.length };
    files.set(digest, { base64, type });
  }
  const session = await cloudflare(`${script}/assets-upload-session`, env.CLOUDFLARE_DEPLOY_TOKEN, 'POST', { manifest });
  if (!session?.jwt) throw new Error('Missing asset upload session.');
  let completion = session.jwt;
  for (const bucket of session.buckets ?? []) {
    const form = new FormData();
    for (const digest of bucket) {
      const file = files.get(digest);
      if (!file) throw new Error('Cloudflare returned an unknown asset hash.');
      form.set(digest, new Blob([file.base64], { type: file.type }), digest);
    }
    const result = await cloudflare(`${account}/workers/assets/upload?base64=true`, session.jwt, 'POST', form);
    if (result?.jwt) completion = result.jwt;
  }
  const form = new FormData();
  form.set('metadata', new Blob([JSON.stringify({
    main_module: 'index.js', compatibility_date: '2026-11-16',
    assets: { jwt: completion, config: { html_handling: 'auto-trailing-slash' } },
    bindings: [{ name: 'ASSETS', type: 'assets' }, ...bindings],
  })], { type: 'application/json' }), 'metadata.json');
  form.set('index.js', new Blob([
    'export default { fetch(request, env) { return env.ASSETS.fetch(request); } };',
  ], { type: 'application/javascript+module' }), 'index.js');
  await cloudflare(script, env.CLOUDFLARE_DEPLOY_TOKEN, 'PUT', form);
}
