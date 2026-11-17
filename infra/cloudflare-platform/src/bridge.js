import { decode, HttpError, readLimited, utf8 } from './shared.js';

/**
 * Server-to-server HTTPS-only control-plane message.
 * Only the ai-sdk.pro Better Auth server knows PLATFORM_BRIDGE_SECRET.
 * No browser or GitHub OAuth token is forwarded to Cloudflare.
 */
export async function readBridgeMessage(request, env, now = Date.now()) {
  if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
  if (!env.PLATFORM_BRIDGE_SECRET || utf8.encode(env.PLATFORM_BRIDGE_SECRET).length < 32)
    throw new HttpError(503, 'Deployment bridge is not configured.');
  const timestamp = request.headers.get('x-aisdk-timestamp');
  const signature = request.headers.get('x-aisdk-signature');
  if (!/^[0-9]{13}$/.test(timestamp ?? '') || Math.abs(now - Number(timestamp)) > 30000 ||
      !/^[a-f0-9]{64}$/.test(signature ?? ''))
    throw new HttpError(401, 'Invalid bridge authorization.');
  const bytes = await readLimited(request, 8192);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hexDigest = Array.from(digest, v => v.toString(16).padStart(2, '0')).join('');
  const signingText = ['POST', '/internal/workspace', timestamp, hexDigest].join('\n');
  const key = await crypto.subtle.importKey('raw', utf8.encode(env.PLATFORM_BRIDGE_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const signatureBytes = Uint8Array.from(signature.match(/../g), item => Number.parseInt(item, 16));
  if (!await crypto.subtle.verify('HMAC', key, signatureBytes, utf8.encode(signingText)))
    throw new HttpError(401, 'Invalid bridge authorization.');
  let payload;
  try { payload = JSON.parse(decode.decode(bytes)); }
  catch { throw new HttpError(400, 'Invalid workspace request.'); }
  const a = payload?.actor;
  if (!a || !Number.isSafeInteger(a.githubId) || a.githubId <= 0 ||
      typeof a.login !== 'string' || !/^[A-Za-z0-9-]{1,39}$/.test(a.login) ||
      !['list', 'import', 'history', 'deploy'].includes(payload.operation))
    throw new HttpError(400, 'Invalid workspace identity or operation.');
  return payload;
}
