import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { operations, availableOperations, compileInput, schemaMetadata } from '../src/catalog.js';
import { createServer } from '../src/server.js';
import { readConfig, MODES, TOOLSETS } from '../src/config.js';
assert.equal(new Set(operations.map(op => op.name)).size, operations.length);
for (const op of operations) {
  assert.match(op.name, /^[a-zA-Z0-9_-]{1,64}$/);
  compileInput(op);
  const pathParams = [...op.path.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
  assert.deepEqual(pathParams.sort(), [...(op.inputSchema.properties.path?.required || [])].sort());
}
for (const toolset of TOOLSETS) for (const mode of MODES) {
  // A token puts the server in ready mode so every tool of this combination is really registered.
  const config = readConfig({ CODEMAGIC_API_TOKEN: 'check-only-token', CODEMAGIC_MODE: mode, CODEMAGIC_TOOLSET: toolset });
  const server = createServer(config);
  await server.close();
  console.log(`${toolset}/${mode}: ${availableOperations(config).length} tools`);
}
const lines = [
  '# API coverage', '', `Contract retrieved: ${schemaMetadata.retrievedOn}. [Official OpenAPI](${schemaMetadata.url}).`, '',
  'Generated from the bundled contract. These are implemented mappings, not claims of live-account validation.', '',
  'The v3 API-token read/revoke routes are excluded. Deprecated OTA aliases are included alongside their canonical routes. Legacy routes supplement gaps in v3. No private browser endpoints are used.', '',
  '| Tool | Method | Route | Toolset | Write mode |', '| --- | --- | --- | --- | --- |',
  ...operations.map(op => `| ${op.name} | ${op.method} | ${op.path} | ${op.core ? 'core + all' : 'all'} | ${op.method === 'GET' ? 'any' : op.buildAction ? 'builds / all' : 'all'} |`), '',
];
await mkdir(new URL('../docs/', import.meta.url), { recursive: true });
await writeFile(new URL('../docs/coverage.md', import.meta.url), lines.join('\n'));
console.log(`Validated ${operations.length} schemas and generated docs/coverage.md.`);
