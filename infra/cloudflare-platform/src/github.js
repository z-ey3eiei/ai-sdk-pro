import { b64url, decode, HttpError, readLimited, unb64, utf8 } from './shared.js';

const rejectRedirect = (response) => {
  if (response.status >= 300 && response.status < 400) throw new HttpError(502, 'Unexpected redirect from GitHub.');
};

export async function github(path, token, init = {}) {
  let response;
  try {
    response = await fetch(`https://api.github.com${path}`, {
      ...init, redirect: 'manual', headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
        'User-Agent': 'ai-sdk-pro-platform',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch (error) {
    throw new HttpError(502, error instanceof Error ? error.message : 'GitHub API unreachable.');
  }
  rejectRedirect(response);
  if (!response.ok) throw new HttpError(response.status === 404 ? 404 : 502, `GitHub request failed (HTTP ${response.status}).`);
  return response.json();
}

/**
 * GitHub accepts the OAuth client ID as the JWT issuer (and recommends it).
 * The staging GitHub App may not have a numeric GITHUB_APP_ID configured.
 * Never confuse this with the installation ID.
 */
export function githubAppIssuer(env) {
  const appId = typeof env.GITHUB_APP_ID === 'string' ? env.GITHUB_APP_ID.trim() : '';
  if (/^\d{4,12}$/.test(appId)) return appId;
  const clientId = typeof env.GITHUB_CLIENT_ID === 'string' ? env.GITHUB_CLIENT_ID.trim() : '';
  if (/^Iv\d{2}[A-Za-z0-9]{16,}$/.test(clientId)) return clientId;
  throw new HttpError(503, 'GitHub App identity is not configured.');
}

export async function installationToken(env, installation, repository) {
  const now = Math.floor(Date.now() / 1000);
  const pem = env.GITHUB_APP_PRIVATE_KEY.trim().replaceAll('\\n', '\n');
  const body = pem.replace(/-----[^-]+-----|\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', unb64(body), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const appId = githubAppIssuer(env);
  const payload = [JSON.stringify({ alg: 'RS256', typ: 'JWT' }), JSON.stringify({
    iat: now - 30, exp: now + 300, iss: appId,
  })].map((value) => b64url(utf8.encode(value))).join('.');
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, utf8.encode(payload));
  const jwt = `${payload}.${b64url(new Uint8Array(signature))}`;
  const response = await github(`/app/installations/${installation}/access_tokens`, jwt, {
    method: 'POST', body: JSON.stringify({ repository_ids: [repository], permissions: { contents: 'read' } }),
  });
  return response.token;
}

export async function getArchive(repo, token, sha) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Invalid repository.');
  const response = await fetch(`https://api.github.com/repos/${repo}/zipball/${sha}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'ai-sdk-pro-platform', 'X-GitHub-Api-Version': '2026-03-10' },
    redirect: 'manual',
  });
  const url = new URL(response.headers.get('location') ?? 'https://invalid.invalid');
  if (response.status !== 302 || url.origin !== 'https://codeload.github.com' || url.username || url.password)
    throw new Error('GitHub did not return a trusted archive URL.');
  const archive = await fetch(url, { redirect: 'manual' });
  rejectRedirect(archive);
  if (!archive.ok) throw new Error(`GitHub source download failed (HTTP ${archive.status}).`);
  return readLimited(archive, 12_000_000);
}

export async function verifySignature(bytes, signature, secret) {
  if (!/^sha256=[a-f0-9]{64}$/.test(signature ?? '')) return false;
  const key = await crypto.subtle.importKey('raw', utf8.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytesFromHeader = Uint8Array.from(signature.slice(7).match(/../g), (value) => Number.parseInt(value, 16));
  return crypto.subtle.verify('HMAC', key, bytesFromHeader, bytes);
}

export async function githubExchange(env, code, verifier, callback) {
  let response;
  try {
    response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST', redirect: 'manual',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code,
        code_verifier: verifier, redirect_uri: callback }),
    });
  } catch (error) {
    throw new HttpError(502, error instanceof Error ? error.message : 'GitHub token exchange failed.');
  }
  rejectRedirect(response);
  let grant;
  try {
    grant = JSON.parse(decode.decode(await readLimited(response, 65536)));
  } catch {
    throw new HttpError(502, 'GitHub authorization response was invalid.');
  }
  if (!response.ok || !grant.access_token) {
    const reason = typeof grant.error_description === 'string' ? grant.error_description
      : typeof grant.error === 'string' ? grant.error : 'GitHub authorization failed.';
    throw new HttpError(401, reason);
  }
  return grant.access_token;
}
