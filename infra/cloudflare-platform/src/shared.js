export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const utf8 = new TextEncoder();
export const decode = new TextDecoder();
export const shaPattern = /^[0-9a-f]{40}$/;
export const keyPattern = /^[A-Z_][A-Z0-9_]{0,63}$/;
export const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
export const hostPattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
export const uuid = () => crypto.randomUUID();
export const hex = (bytes) => Array.from(bytes, (n) => n.toString(16).padStart(2, '0')).join('');
export const hash = async (value) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? utf8.encode(value) : value)));
export const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const b64 = (bytes) => {
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
};
export const unb64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
export const b64url = (bytes) => b64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
export const json = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export const first = (env, statement, ...args) => env.DB.prepare(statement).bind(...args).first();
export const all = async (env, statement, ...args) => (await env.DB.prepare(statement).bind(...args).all()).results;
export const run = (env, statement, ...args) => env.DB.prepare(statement).bind(...args).run();
export const projectHost = (name, env) => `${name}.${env.PROJECT_DOMAIN}`;
export const scriptName = (id) => `site-${id.replaceAll('-', '')}`;
export const cookie = (name, value, age) => `__Host-${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
export const readCookie = (request, name) => {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  const prefix = `__Host-${name}=`;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
  }
  return undefined;
};

export async function readLimited(response, max) {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) throw new HttpError(413, 'Payload exceeds limit.');
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

export async function seal(env, value, context) {
  const key = await crypto.subtle.importKey('raw', unb64(env.ENCRYPTION_KEY), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: utf8.encode(context) }, key, utf8.encode(value));
  return `${b64(iv)}.${b64(new Uint8Array(data))}`;
}
export async function unseal(env, value, context) {
  const [iv, data] = value.split('.').map(unb64);
  const key = await crypto.subtle.importKey('raw', unb64(env.ENCRYPTION_KEY), 'AES-GCM', false, ['decrypt']);
  return decode.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: utf8.encode(context) }, key, data));
}
