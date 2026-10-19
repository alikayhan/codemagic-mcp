import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv/dist/2020.js';
import { VERSION } from '../src/version.js';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
test('portable plugin manifests validate against the published Agent Plugins schemas', () => {
  const ajv = new Ajv({ strict: false });
  for (const name of ['plugin', 'mcp']) {
    const validate = ajv.compile(read(`./fixtures/${name}.schema.json`));
    assert.ok(validate(read(`../${name}.json`)), ajv.errorsText(validate.errors));
  }
  assert.equal(read('../plugin.json').version, VERSION);
  assert.equal(read('../package.json').version, VERSION);
  assert.match(VERSION, /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/, 'version must be SemVer');
  const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  assert.ok(changelog.includes(`## [${VERSION}]`), `CHANGELOG.md lacks a ## [${VERSION}] section`);
  const server = read('../mcp.json').mcpServers.codemagic;
  assert.deepEqual(server.args, ['${PLUGIN_ROOT}/dist/server.mjs']);
  assert.equal(server.env, undefined);
});
