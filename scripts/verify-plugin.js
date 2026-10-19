import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { VERSION } from '../src/version.js';
import { saveSettings, credentialsPath } from '../src/credentials.js';
import { availableOperations } from '../src/catalog.js';
import { readConfig } from '../src/config.js';

// Local absolute paths that must not leak into a portable release.
const localPaths = [homedir(), fileURLToPath(new URL('../', import.meta.url)), process.cwd(), tmpdir()];
const expectedToolCount = availableOperations(readConfig({ CODEMAGIC_API_TOKEN: 'x', CODEMAGIC_MODE: 'builds' })).length;

const temp = await mkdtemp(join(tmpdir(), 'codemagic-plugin-install-'));
try {
  const extracted = join(temp, 'a folder with spaces');
  const files = unzipSync(await readFile(new URL(`../release/codemagic-plugin-${VERSION}.zip`, import.meta.url)));
  for (const [path, bytes] of Object.entries(files)) {
    assert.ok(!path.includes('..') && !path.startsWith('/'));
    assert.ok(!/node_modules|credentials\.env|\.env$|\/test\//.test(path));
    const contents = Buffer.from(bytes).toString('utf8');
    for (const local of localPaths) assert.ok(!contents.includes(local), `Local path ${local} in ${path}`);
    const target = join(extracted, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  const marketplace = JSON.parse(await readFile(join(extracted, '.agents/plugins/marketplace.json'), 'utf8'));
  const root = resolve(extracted, marketplace.plugins[0].source.path);
  const manifest = JSON.parse(await readFile(join(root, 'plugin.json'), 'utf8'));
  assert.equal(manifest.version, VERSION);
  const mcp = JSON.parse(await readFile(join(root, 'mcp.json'), 'utf8')).mcpServers.codemagic;
  assert.equal(mcp.type, 'stdio');
  await assert.rejects(stat(join(root, 'node_modules')), { code: 'ENOENT' });
  for (const configured of [false, true]) {
    const env = { CODEMAGIC_CONFIG_DIR: join(temp, configured ? 'configured-user' : 'new-user') };
    if (configured) saveSettings('fake-package-test-token', { mode: 'builds' }, env);
    const transport = new StdioClientTransport({ command: process.execPath, args: mcp.args.map(arg => arg.replaceAll('${PLUGIN_ROOT}', root)), cwd: mcp.cwd.replaceAll('${PLUGIN_ROOT}', root), env, stderr: 'pipe' });
    const client = new Client({ name: 'clean-plugin-install', version: '1.0.0' });
    try {
      await client.connect(transport);
      const { tools } = await client.listTools();
      assert.equal(tools.length, configured ? expectedToolCount : 1);
      if (!configured) {
        assert.equal(tools[0].name, 'cm_setup_status');
        const result = await client.callTool({ name: 'cm_setup_status', arguments: {} });
        assert.equal(result.structuredContent.configured, false);
        assert.match(result.structuredContent.configureCommand, /server\.mjs configure$/);
        assert.equal(result.structuredContent.credentialsPath, credentialsPath(env));
      }
    } finally { await client.close(); }
  }
  console.log('Clean ZIP verified: isolated users, paths with spaces, no node_modules, setup mode without a token, saved-token build mode, MCP handshake and tool discovery.');
} finally { await rm(temp, { recursive: true, force: true }); }
