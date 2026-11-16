import { first, hostPattern, scriptName, slugPattern } from './shared.js';

function missing() {
  return new Response('Project not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    const hostname = new URL(request.url).hostname.toLowerCase();
    if (!hostPattern.test(hostname) || !['GET', 'HEAD'].includes(request.method)) return missing();
    const suffix = `.${env.PROJECT_DOMAIN}`;
    const slug = hostname.endsWith(suffix) ? hostname.slice(0, -suffix.length) : null;
    if (slug !== null && !slugPattern.test(slug)) return missing();

    try {
      const cached = await env.ROUTES.get(hostname);
      // Validate published state in D1 so stale KV cannot revive a deleted or suspended site.
      const row = slug === null
        ? await first(env, `SELECT p.active_deployment_id FROM custom_domains d JOIN projects p ON p.id=d.project_id
            WHERE d.domain=? AND d.status='active' AND p.deleted_at IS NULL AND p.suspended_at IS NULL`, hostname)
        : await first(env, `SELECT active_deployment_id FROM projects WHERE name=? AND deleted_at IS NULL AND suspended_at IS NULL`, slug);
      if (!row?.active_deployment_id) return missing();
      const expected = scriptName(row.active_deployment_id);
      const headers = new Headers();
      for (const key of ['accept', 'accept-encoding', 'accept-language', 'if-none-match', 'if-modified-since', 'range']) {
        if (request.headers.has(key)) headers.set(key, request.headers.get(key));
      }
      const response = await env.TENANTS.get(cached === expected ? cached : expected).fetch(
        new Request(request.url, { method: request.method, headers })
      );
      const output = new Response(response.body, response);
      output.headers.set('X-Content-Type-Options', 'nosniff');
      output.headers.delete('set-cookie');
      return output;
    } catch (error) {
      console.error('dispatch_error', { name: error.name });
      return new Response('Project temporarily unavailable', { status: 503 });
    }
  },
};
