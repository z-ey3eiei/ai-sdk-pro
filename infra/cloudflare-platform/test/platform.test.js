import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { zipSync } from 'fflate';
import { normalizeAssets, sourceFiles } from '../src/assets.js';
import dispatch from '../src/dispatch.js';
import { b64, readCookie, seal, unseal, utf8 } from '../src/shared.js';

test('readCookie parses __Host cookies regardless of spacing', () => {
  const oauth = 'a'.repeat(128);
  const request = new Request('https://deploy-staging.ai-sdk.pro/auth/github/callback', {
    headers: { Cookie: `other=1; __Host-oauth=${oauth}; __Host-session=${'b'.repeat(64)}` },
  });
  assert.equal(readCookie(request, 'oauth'), oauth);
  assert.equal(readCookie(request, 'session'), 'b'.repeat(64));
  assert.equal(readCookie(new Request('https://x'), 'oauth'), undefined);
});

test('archive selection omits hidden files and paths that escape the project', () => {
  const zip = zipSync({
    'repo/index.html': utf8.encode('<h1>OK</h1>'),
    'repo/.env': utf8.encode('hidden'),
    'repo/../escape.html': utf8.encode('invalid'),
    'repo/node_modules/package/index.js': utf8.encode('invalid'),
  });
  const selected = sourceFiles(zip);
  assert.deepEqual(Object.keys(selected), ['index.html']);
  assert.deepEqual(Object.keys(normalizeAssets(selected)), ['index.html']);
  assert.throws(() => normalizeAssets({ 'styles.css': utf8.encode('body{}') }), /No index.html/);
});

test('encrypted project values cannot be moved to a different key', async () => {
  const env = { ENCRYPTION_KEY: b64(crypto.getRandomValues(new Uint8Array(32))) };
  const encrypted = await seal(env, 'value', 'project:KEY');
  assert.equal(await unseal(env, encrypted, 'project:KEY'), 'value');
  await assert.rejects(unseal(env, encrypted, 'project:OTHER'));
});

test('D1 schema enforces project and concurrent deployment limits and webhook dedupe', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_platform.sql', import.meta.url), 'utf8'));
  db.exec("INSERT INTO users(id,github_id,username) VALUES('u',1,'user')");
  const insert = db.prepare("INSERT INTO projects(id,user_id,name,repo_full_name,repo_id,installation_id,branch) VALUES(?,'u',?,'u/repo',1,2,'main')");
  for (const id of ['one','two','three']) insert.run(id, id);
  assert.throws(() => insert.run('four','four'), /project_quota/);
  const queue = db.prepare(`INSERT INTO deployments(id,project_id,user_id,commit_sha,github_delivery)
    VALUES(?,'one','u',?,?) ON CONFLICT(project_id,github_delivery) DO NOTHING`);
  assert.equal(queue.run('first', 'a'.repeat(40), 'event').changes, 1);
  assert.equal(queue.run('duplicate', 'a'.repeat(40), 'event').changes, 0);
  assert.throws(() => queue.run('other', 'b'.repeat(40), 'other'), /concurrent_quota/);
});

test('dispatcher ignores stale KV after a project is removed', async () => {
  const env = {
    PROJECT_DOMAIN:'ai-sdk.pro',
    ROUTES:{get:async () => 'old'},
    DB:{prepare:() => ({bind:() => ({first:async () => null})})},
    TENANTS:{get:() => assert.fail('stale tenant was dispatched')},
  };
  assert.equal((await dispatch.fetch(new Request('https://project.ai-sdk.pro/'), env)).status, 404);
});

test('dispatcher uses D1 publication when KV is stale and strips platform credentials', async () => {
  const env = {
    PROJECT_DOMAIN:'ai-sdk.pro',
    ROUTES:{get:async () => 'old'},
    DB:{prepare:() => ({bind:() => ({first:async () => ({active_deployment_id:'test-uuid'})})})},
    TENANTS:{get:(name) => {
      assert.equal(name,'site-testuuid');
      return { fetch:async (request) => {
        assert.equal(request.headers.get('cookie'), null);
        assert.equal(request.headers.get('authorization'), null);
        return new Response('site', { headers: { 'set-cookie':'test=1' } });
      } };
    }},
  };
  const response = await dispatch.fetch(new Request('https://project.ai-sdk.pro/', {
    headers: { Cookie:'session=secret', Authorization:'Bearer secret' }
  }), env);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(await response.text(), 'site');
});
