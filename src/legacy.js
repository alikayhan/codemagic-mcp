const string = { type: 'string', minLength: 1 };
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
// Every legacy operation is in the core toolset. buildAction marks mutations allowed in builds mode.
function operation(name, method, path, description, { pathFields = [], body, buildAction = false } = {}) {
  const properties = {};
  if (pathFields.length) properties.path = object(Object.fromEntries(pathFields.map(key => [key, string])));
  if (body) properties.body = body;
  return { name, method, path, origin: 'https://api.codemagic.io', description, core: true, buildAction, inputSchema: object(properties) };
}
export const legacyOperations = [
  operation('cm_get_app', 'GET', '/apps/{app_id}', 'Get application details using the documented legacy API.', { pathFields: ['app_id'] }),
  operation('cm_add_app', 'POST', '/apps', 'Add a repository to Codemagic.', { body: object({ repositoryUrl: string, teamId: string }, ['repositoryUrl']) }),
  operation('cm_add_private_app', 'POST', '/apps/new', 'Add a private repository with an SSH key. Arguments contain credentials; use a trusted MCP client.', { body: object({
    repositoryUrl: string, teamId: string, projectType: string,
    sshKey: object({ data: string, passphrase: { type: ['string', 'null'] } }),
  }, ['repositoryUrl', 'sshKey']) }),
  operation('cm_cancel_build', 'POST', '/builds/{build_id}/cancel', 'Cancel a build. HTTP 208 means it has already finished.', { pathFields: ['build_id'], buildAction: true }),
  operation('cm_list_caches', 'GET', '/apps/{app_id}/caches', 'List application build caches.', { pathFields: ['app_id'] }),
  operation('cm_delete_caches', 'DELETE', '/apps/{app_id}/caches', 'Delete all application caches asynchronously.', { pathFields: ['app_id'], buildAction: true }),
  operation('cm_delete_cache', 'DELETE', '/apps/{app_id}/caches/{cache_id}', 'Delete one application cache asynchronously.', { pathFields: ['app_id', 'cache_id'], buildAction: true }),
  operation('cm_create_artifact_link', 'POST', '/artifacts/{artifact_path}/public-url', 'Create a public artifact download link. Anyone with the link can download the artifact until expiry. Use the path after /artifacts/ in its download URL.', { pathFields: ['artifact_path'], body: object({ expiresAt: { type: 'integer', minimum: 1 } }), buildAction: true }),
];
