import { HttpError } from './shared.js';

export async function cloudflare(path, token, method = 'GET', body) {
  const form = body instanceof FormData;
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method, redirect: 'error',
    headers: { Authorization: `Bearer ${token}`, ...(body && !form ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? form ? body : JSON.stringify(body) : undefined,
  });
  const output = await response.json();
  if (!response.ok || !output.success) throw new HttpError(response.status === 404 ? 404 : 502, `Cloudflare API failed (HTTP ${response.status}).`);
  return output.result;
}
