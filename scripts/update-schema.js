import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const url = 'https://codemagic.io/api/v3/schema/openapi.json';
const input = process.argv[2];
const raw = input ? await readFile(input, 'utf8') : await (async () => {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: 'error' });
  if (!response.ok) throw new Error(`Schema download failed: HTTP ${response.status}`);
  return response.text();
})();
const spec = JSON.parse(raw);
if (spec.openapi !== '3.1.0' || !spec.paths) throw new Error('Unexpected OpenAPI version or missing paths.');
const aliases = {
  'GET /api/v3/user': 'cm_get_user',
  'GET /api/v3/user/apps': 'cm_list_apps',
  'GET /api/v3/user/teams': 'cm_list_teams',
  'GET /api/v3/teams/{team_id}': 'cm_get_team',
  'GET /api/v3/teams/{team_id}/apps': 'cm_list_team_apps',
  'GET /api/v3/teams/{team_id}/builds': 'cm_list_builds',
  'GET /api/v3/apps/{app_id}/workflows': 'cm_list_workflows',
  'POST /api/v3/apps/{app_id}/builds': 'cm_start_build',
  'GET /api/v3/builds/{build_id}': 'cm_get_build',
  'GET /api/v3/builds/{build_id}/actions': 'cm_get_build_actions',
  'GET /api/v3/builds/{build_id}/remote-access': 'cm_get_build_remote_access',
};
function resolve(schema, stack = []) {
  if (Array.isArray(schema)) return schema.map(item => resolve(item, stack));
  if (!schema || typeof schema !== 'object') return schema;
  if (schema.$ref) {
    if (!schema.$ref.startsWith('#/components/schemas/') || stack.includes(schema.$ref)) throw new Error(`Unsupported reference: ${schema.$ref}`);
    const target = spec.components.schemas[schema.$ref.split('/').at(-1)];
    if (!target) throw new Error(`Missing reference: ${schema.$ref}`);
    const { $ref, ...siblings } = schema;
    return resolve({ ...target, ...siblings }, [...stack, $ref]);
  }
  const result = {};
  for (const [key, value] of Object.entries(schema)) {
    if (['title', 'examples', 'example'].includes(key)) continue;
    // Codemagic models unions with oneOf, including overlapping integer/number members.
    result[key === 'oneOf' ? 'anyOf' : key] = resolve(value, stack);
  }
  if (result.type === 'object' && result.properties && result.additionalProperties === undefined) result.additionalProperties = false;
  return result;
}
const object = () => ({ type: 'object', properties: {}, required: [], additionalProperties: false });
const operations = [];
const excluded = [];
for (const [path, methods] of Object.entries(spec.paths)) {
  if (!path.startsWith('/api/v3/')) throw new Error(`Unexpected path: ${path}`);
  for (const [method, op] of Object.entries(methods)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
    if (path === '/api/v3/user/api-key') {
      excluded.push({ method: method.toUpperCase(), path, reason: 'Do not expose or revoke the server authentication token.' });
      continue;
    }
    const key = `${method.toUpperCase()} ${path}`;
    let name = aliases[key] || `cm_${method}_${path.slice(8).split('/').filter(s => !s.startsWith('{')).join('_').replaceAll('-', '_')}`;
    const lastParameter = path.match(/\{([^}]+)\}$/)?.[1];
    if (!aliases[key] && lastParameter) name += `_by_${lastParameter}`;
    if (name.length > 64) name = `${name.slice(0, 55)}_${createHash('sha256').update(key).digest('hex').slice(0, 8)}`;
    const schema = object();
    for (const param of [...(methods.parameters || []), ...(op.parameters || [])]) {
      if (!['path', 'query'].includes(param.in)) throw new Error(`Unsupported parameter location: ${key}`);
      if (param.style || param.explode !== undefined) throw new Error(`Review explicit parameter serialization: ${key}`);
      const group = schema.properties[param.in] ||= object();
      group.properties[param.name] = resolve(param.schema || {});
      if (param.in === 'path') group.properties[param.name] = { ...group.properties[param.name], type: 'string', minLength: 1 };
      if (param.name === 'cursor') group.properties[param.name] = { type: 'string', minLength: 1, description: 'Cursor from the previous response.' };
      if (param.required) group.required.push(param.name);
    }
    for (const [group, value] of Object.entries(schema.properties)) if (value.required.length) schema.required.push(group);
    if (op.requestBody) {
      const content = op.requestBody.content;
      if (!content['application/json'] || Object.keys(content).length !== 1) throw new Error(`Review request media type: ${key}`);
      schema.properties.body = resolve(content['application/json'].schema);
      if (op.requestBody.required) schema.required.push('body');
    }
    if (name === 'cm_start_build' && !schema.required.includes('body')) schema.required.push('body');
    operations.push({ name, method: method.toUpperCase(), path, origin: 'https://codemagic.io', description: op.summary || key,
      core: Boolean(aliases[key]), buildAction: name === 'cm_start_build', inputSchema: schema });
  }
}
if (new Set(operations.map(op => op.name)).size !== operations.length) throw new Error('Duplicate tool names; add explicit aliases.');
operations.sort((a, b) => a.name.localeCompare(b.name));
await mkdir(new URL('../schema/', import.meta.url), { recursive: true });
await writeFile(new URL('../schema/operations.json', import.meta.url), JSON.stringify({
  source: { url, retrievedOn: new Date().toISOString().slice(0, 10), sha256: createHash('sha256').update(raw).digest('hex'), apiVersion: spec.info.version }, excluded, operations,
}, null, 2) + '\n');
console.log(`Generated ${operations.length} operations; ${excluded.length} explicitly excluded. Review the diff before release.`);
