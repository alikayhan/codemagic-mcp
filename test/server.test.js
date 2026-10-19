import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { createServer, configureCommandFor } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { availableOperations, operations, validateInput } from '../src/catalog.js';
import { CodemagicClient, requestUrl, redact } from '../src/client.js';
import { fileURLToPath } from 'node:url';

const config = (overrides = {}) => ({ ...readConfig({ CODEMAGIC_API_TOKEN: 'test-only-token' }), ...overrides });
const op = name => operations.find(item => item.name === name);
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } });
/** A fetch stub that records every call as { url, init } and answers with the given response. */
function recordingFetch(calls, respond = () => json({ data: {} })) {
  return async (url, init) => { calls.push({ url: String(url), init }); return respond(); };
}
const capabilities = async client => JSON.parse((await client.readResource({ uri: 'codemagic://capabilities' })).contents[0].text);
async function session(t, settings = {}, fetchImpl = async () => json({ data: [] })) {
  const server = createServer(config(settings), fetchImpl);
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b);
  await client.connect(a);
  t.after(async () => { await client.close(); await server.close(); });
  return client;
}

test('default MCP session advertises core read tools plus build, cache and artifact-link actions', async t => {
  const client = await session(t);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 17);
  const mutating = tools.filter(tool => !tool.annotations.readOnlyHint).map(tool => tool.name).sort();
  assert.deepEqual(mutating, ['cm_cancel_build', 'cm_create_artifact_link', 'cm_delete_cache', 'cm_delete_caches', 'cm_start_build']);
  assert.ok(tools.find(tool => tool.name === 'cm_get_build'));
  assert.ok(!tools.find(tool => tool.name === 'cm_add_app'));
  assert.ok(!JSON.stringify(tools).includes('test-only-token'));
  const info = await capabilities(client);
  assert.equal(info.configured, true);
  assert.equal(info.mode, 'builds');
  assert.equal(info.tools.length, 17);
});

test('read-only mode exposes only GET tools', async t => {
  const client = await session(t, { mode: 'read-only' });
  const { tools } = await client.listTools();
  assert.equal(tools.length, 12);
  assert.ok(tools.every(tool => tool.annotations.readOnlyHint));
  assert.equal((await capabilities(client)).mode, 'read-only');
});

test('MCP app discovery sends a token only in the auth header and preserves pagination', async t => {
  const calls = [];
  const client = await session(t, {}, recordingFetch(calls, () => json({ data: [{ id: 'app-1' }], next: 'cursor-2' })));
  const result = await client.callTool({ name: 'cm_list_apps', arguments: { query: { page: 2, page_size: 10 } } });
  assert.equal(result.isError, false);
  assert.equal(result.structuredContent.data.next, 'cursor-2');
  assert.match(calls[0].url, /^https:\/\/codemagic.io\/api\/v3\/user\/apps\?/);
  assert.equal(new URL(calls[0].url).searchParams.get('page'), '2');
  assert.equal(calls[0].init.headers['x-auth-token'], 'test-only-token');
  assert.equal(calls[0].init.redirect, 'error');
  assert.ok(!calls[0].url.includes('test-only-token'));
});

test('build mode starts a build using v3 snake_case fields', async t => {
  const calls = [];
  const client = await session(t, { mode: 'builds' }, recordingFetch(calls, () => json({ data: { id: 'build-1' } }, 201)));
  const body = { workflow_id: 'ios-release', branch: 'feature/a', inputs: { count: 3, enabled: true }, environment: { variables: { TENANT: 'example' } } };
  const result = await client.callTool({ name: 'cm_start_build', arguments: { path: { app_id: 'app-1' }, body } });
  assert.equal(result.isError, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://codemagic.io/api/v3/apps/app-1/builds');
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), body);
});

test('missing, conflicting, invalid and unknown build fields fail before fetch', async t => {
  let calls = 0;
  const client = await session(t, { mode: 'builds' }, async () => { calls++; return json({}); });
  for (const body of [
    { workflow_id: 'ios' },
    { workflow_id: 'ios', branch: 'main', tag: 'v1' },
    { workflow_id: 'ios', branch: ' ' },
    { workflowId: 'ios', branch: 'main' },
    { workflow_id: 'ios', branch: 'main', unexpected: true },
    { workflow_id: 'ios', branch: 'main', environment: { variables: { 'invalid-name': 'value' } } },
  ]) {
    const result = await client.callTool({ name: 'cm_start_build', arguments: { path: { app_id: 'app-1' }, body } });
    assert.equal(result.isError, true, JSON.stringify(body));
  }
  assert.equal(calls, 0);
});

test('read-only and builds modes cannot invoke hidden mutations', async t => {
  let calls = 0;
  for (const mode of ['read-only', 'builds']) {
    const client = await session(t, { mode, toolset: 'all' }, async () => { calls++; return json({}); });
    const name = mode === 'read-only' ? 'cm_start_build' : 'cm_add_app';
    try {
      const result = await client.callTool({ name, arguments: { path: { app_id: 'app-1' } } });
      assert.equal(result.isError, true);
    } catch (error) { assert.match(error.message, /not found|unknown|not registered/i); }
  }
  assert.equal(calls, 0);
});

test('legacy cancel supports already-finished HTTP 208 without retry', async t => {
  const calls = [];
  const client = await session(t, { mode: 'builds' }, recordingFetch(calls, () => new Response(null, { status: 208 })));
  const result = await client.callTool({ name: 'cm_cancel_build', arguments: { path: { build_id: 'build-1' } } });
  assert.equal(result.isError, false);
  assert.equal(result.structuredContent.status, 208);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.codemagic.io/builds/build-1/cancel');
});

test('validation enforces page sizes and rejects unknown query parameters', () => {
  assert.throws(() => validateInput(op('cm_list_builds'), { path: { team_id: 'team-1' }, query: { page_size: 101 } }));
  assert.throws(() => validateInput(op('cm_list_builds'), { path: { team_id: 'team-1' }, query: { arbitrary: true } }));
});

test('query encoding preserves branches, repeated labels and cursor', () => {
  const url = requestUrl(op('cm_list_builds'), { path: { team_id: 'team-1' }, query: { branch: 'feature/a&b', label: ['ios', 'release'], cursor: 'abc+/=' } });
  assert.equal(url.searchParams.get('branch'), 'feature/a&b');
  assert.deepEqual(url.searchParams.getAll('label'), ['ios', 'release']);
  assert.equal(url.searchParams.get('cursor'), 'abc+/=');
});

test('path traversal and arbitrary hosts are rejected', () => {
  for (const app_id of ['.', '..', '../user', '%2e%2e', 'a/b', 'a\\b', '//evil.example', 'a?b', 'a\nb']) {
    assert.throws(() => requestUrl(op('cm_get_app'), { path: { app_id } }));
  }
  assert.throws(() => requestUrl({ ...op('cm_get_app'), origin: 'https://evil.example' }, { path: { app_id: 'app-1' } }));
  for (const artifact_path of ['../key', 'a/../key', 'https://evil.example', '/absolute', 'a/%2e%2e/key']) {
    assert.throws(() => requestUrl(op('cm_create_artifact_link'), { path: { artifact_path } }));
  }
  assert.equal(requestUrl(op('cm_create_artifact_link'), { path: { artifact_path: 'a/b/my app.ipa' } }).href, 'https://api.codemagic.io/artifacts/a/b/my%20app.ipa/public-url');
});

test('auth failures and rate limits do not echo response secrets or retry', async () => {
  for (const status of [400, 401, 403, 404, 429, 500]) {
    let calls = 0;
    const client = new CodemagicClient(config(), async () => {
      calls++; return json({ error: 'private-secret' }, status, { 'ratelimit-reset': '120' });
    });
    const result = await client.execute(op('cm_get_user'), {});
    assert.equal(result.ok, false);
    assert.equal(result.status, status);
    assert.equal(result.rateLimit['ratelimit-reset'], '120');
    assert.ok(!JSON.stringify(result).includes('private-secret'));
    assert.equal(calls, 1);
  }
});

test('mutation transport failures report unknown outcome and never retry', async () => {
  let calls = 0;
  const client = new CodemagicClient(config(), async () => { calls++; throw new Error('do not leak test-only-token'); });
  await assert.rejects(client.execute(op('cm_cancel_build'), { path: { build_id: 'b' } }), /outcome is UNKNOWN/);
  assert.equal(calls, 1);
});

test('timeout propagates an aborted signal to fetch', async () => {
  const client = new CodemagicClient(config({ timeoutMs: 100 }), async (_, { signal }) => new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 1000);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  }));
  await assert.rejects(client.execute(op('cm_get_user'), {}), /timeout/);
});

test('response size is bounded and non-JSON audit output is supported', async () => {
  const client = new CodemagicClient(config({ maxResponseBytes: 5 }), async () => new Response('too much data'));
  await assert.rejects(client.execute(op('cm_get_user'), {}), /response size/);
  const csv = new CodemagicClient(config(), async () => new Response('event,actor\nlogin,user\n', { headers: { 'Content-Type': 'text/csv' } }));
  assert.equal((await csv.execute(op('cm_get_user'), {})).data, 'event,actor\nlogin,user\n');
});

test('redaction preserves IDs while removing credential fields and token echoes', () => {
  const result = redact({ id: 'abc', token: 'secret', password: 'pw', variables: [{ secure: true, value: 'hidden' }], text: 'echo auth-token' }, 'auth-token');
  assert.deepEqual(result, { id: 'abc', token: '[REDACTED]', password: '[REDACTED]', variables: [{ secure: true, value: '[REDACTED]' }], text: 'echo [REDACTED]' });
});

test('redaction preserves plaintext variables and removes deployment and billing secrets', () => {
  assert.deepEqual(redact({ key: 'deployment-secret', sca_secret: 'billing-secret', variable: { secure: false, value: 'main' } }), {
    key: '[REDACTED]', sca_secret: '[REDACTED]', variable: { secure: false, value: 'main' },
  });
});

test('mutation 5xx responses report unknown outcome', async () => {
  const client = new CodemagicClient(config(), async () => json({}, 503));
  const result = await client.execute(op('cm_cancel_build'), { path: { build_id: 'b' } });
  assert.equal(result.outcomeUnknown, true);
  assert.match(result.error, /UNKNOWN/);
});

test('administrative calls use the documented paths, body structures and date filters', async t => {
  const calls = [];
  const client = await session(t, { mode: 'all', toolset: 'all' }, recordingFetch(calls));
  const cases = [
    ['cm_post_teams_variable_groups', { path: { team_id: 'team-1' }, body: { name: 'staging', advanced_security: { enabled: true, selected_apps: ['app-1'] } } }, '/api/v3/teams/team-1/variable-groups', 'POST'],
    ['cm_patch_variable_groups_variables_by_variable_id', { path: { variable_group_id: 'group-1', variable_id: 'var-1' }, body: { value: 'test-secret', secure: true } }, '/api/v3/variable-groups/group-1/variables/var-1', 'PATCH'],
    ['cm_post_tester_groups_contacts', { path: { tester_group_id: 'testers-1' }, body: { emails: ['test@example.com'] } }, '/api/v3/tester-groups/testers-1/contacts', 'POST'],
    ['cm_post_builds_preview', { path: { build_id: 'build-1' }, body: { artifact_path: 'my-app.apk' } }, '/api/v3/builds/build-1/preview', 'POST'],
    ['cm_get_teams_analytics_summary', { path: { team_id: 'team-1' }, query: { period_from: '2026-10-01T00:00:00Z', period_to: '2026-10-19T00:00:00Z' } }, '/api/v3/teams/team-1/analytics/summary', 'GET'],
  ];
  for (const [name, args, path, method] of cases) {
    const result = await client.callTool({ name, arguments: args });
    assert.equal(result.isError, false, name);
    const call = calls.at(-1);
    assert.equal(new URL(call.url).pathname, path);
    assert.equal(call.init.method, method);
    if (args.body) assert.deepEqual(JSON.parse(call.init.body), args.body);
    if (args.query) for (const [key, value] of Object.entries(args.query)) assert.equal(new URL(call.url).searchParams.get(key), value);
  }
  const badDate = await client.callTool({ name: 'cm_get_teams_analytics_summary', arguments: { path: { team_id: 'team-1' }, query: { period_from: 'yesterday', period_to: null } } });
  assert.equal(badDate.isError, true);
  assert.equal(calls.length, cases.length);
});

test('public artifact links require explicit future expiry', async t => {
  const calls = [];
  const client = await session(t, { mode: 'all' }, recordingFetch(calls, () => json({ url: 'https://api.codemagic.io/artifacts/public-link' })));
  const args = { path: { artifact_path: 'a/b/my app.ipa' }, body: { expiresAt: Math.floor(Date.now() / 1000) + 600 } };
  const result = await client.callTool({ name: 'cm_create_artifact_link', arguments: args });
  assert.equal(result.isError, false);
  assert.equal(calls[0].url, 'https://api.codemagic.io/artifacts/a/b/my%20app.ipa/public-url');
  assert.deepEqual(JSON.parse(calls[0].init.body), args.body);
  const expired = await client.callTool({ name: 'cm_create_artifact_link', arguments: { ...args, body: { expiresAt: 1 } } });
  assert.equal(expired.isError, true);
  assert.equal(calls.length, 1);
});

test('MCP client cancellation reaches the outgoing request', { timeout: 3000 }, async t => {
  let started;
  let cancelled;
  const fetching = new Promise(resolve => { started = resolve; });
  const aborted = new Promise(resolve => { cancelled = resolve; });
  const client = await session(t, {}, async (_, { signal }) => new Promise((resolve, reject) => {
    started();
    signal.addEventListener('abort', () => { cancelled(); reject(signal.reason); }, { once: true });
  }));
  const controller = new AbortController();
  const pending = client.callTool({ name: 'cm_get_user', arguments: {} }, { signal: controller.signal });
  const rejection = assert.rejects(pending);
  await fetching;
  controller.abort(new Error('test cancellation'));
  await rejection;
  await Promise.race([aborted, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Cancellation did not propagate')), 1000); timer.unref(); })]);
});

test('missing credentials fail without fetching and config rejects invalid options', async () => {
  let calls = 0;
  const client = new CodemagicClient(config({ token: undefined }), async () => { calls++; return json({}); });
  await assert.rejects(client.execute(op('cm_get_user'), {}), /CODEMAGIC_API_TOKEN/);
  assert.equal(calls, 0);
  for (const env of [{ CODEMAGIC_MODE: 'write' }, { CODEMAGIC_TOOLSET: 'unknown' }, { CODEMAGIC_TIMEOUT_MS: '-1' }, { CODEMAGIC_API_TOKEN: 'a\nb' }]) assert.throws(() => readConfig(env));
});

test('all tools expose schemas and token lifecycle routes are absent', async t => {
  const client = await session(t, { mode: 'all', toolset: 'all' });
  const { tools } = await client.listTools();
  assert.equal(tools.length, availableOperations({ mode: 'all', toolset: 'all' }).length);
  assert.ok(!operations.some(item => item.path.endsWith('/user/api-key')));
  for (const tool of tools) assert.equal(tool.inputSchema.type, 'object');
});

test('without a token the server runs in setup mode with a single status tool', async t => {
  const client = await session(t, { token: undefined });
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name), ['cm_setup_status']);
  assert.ok(tools[0].annotations.readOnlyHint);
  const result = await client.callTool({ name: 'cm_setup_status', arguments: {} });
  assert.notEqual(result.isError, true);
  assert.equal(result.structuredContent.configured, false);
  assert.match(result.structuredContent.configureCommand, /configure$/);
  assert.ok(result.structuredContent.steps.some(step => /reconnect/i.test(step)));
  assert.ok(!JSON.stringify(result).includes('test-only-token'));
  const info = await capabilities(client);
  assert.equal(info.configured, false);
  assert.deepEqual(info.tools, []);
  assert.equal(info.setup.configured, false);
  await assert.rejects(client.callTool({ name: 'cm_get_user', arguments: {} }));
});

test('setup mode suggests the npm form of configure when running from an npm install', () => {
  assert.equal(configureCommandFor('/home/me/.npm/_npx/abc/node_modules/@alikayhan/codemagic-mcp/src/cli.js'), 'npx -y @alikayhan/codemagic-mcp configure');
  assert.equal(configureCommandFor('C:\\Users\\me\\AppData\\Roaming\\npm\\node_modules\\@alikayhan\\codemagic-mcp\\src\\cli.js'), 'npx -y @alikayhan/codemagic-mcp configure');
  assert.equal(configureCommandFor('/home/me/.npm/_npx/abc/node_modules/.bin/codemagic-mcp'), 'npx -y @alikayhan/codemagic-mcp configure');
  assert.equal(configureCommandFor('/opt/codemagic-mcp/src/cli.js'), 'node /opt/codemagic-mcp/src/cli.js configure');
  assert.equal(configureCommandFor(undefined), 'node <path to server> configure');
});

test('real stdio process without a token initializes in setup mode and points to configure', async t => {
  const transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../src/cli.js', import.meta.url))], env: { CODEMAGIC_MODE: 'read-only', CODEMAGIC_API_TOKEN: '', CODEMAGIC_CONFIG_DIR: '/nonexistent/codemagic-mcp-test' }, stderr: 'pipe' });
  const client = new Client({ name: 'stdio-test', version: '1.0.0' });
  t.after(() => client.close());
  await client.connect(transport);
  assert.match(client.getInstructions(), /setup mode/);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name), ['cm_setup_status']);
  const result = await client.callTool({ name: 'cm_setup_status', arguments: {} });
  assert.match(result.structuredContent.configureCommand, /cli\.js configure$/);
  assert.match(result.structuredContent.credentialsPath, /credentials\.env$/);
});
