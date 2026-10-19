import { readFileSync } from 'node:fs';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { legacyOperations } from './legacy.js';

const contract = JSON.parse(readFileSync(new URL('../schema/operations.json', import.meta.url), 'utf8'));
export const operations = [...contract.operations, ...legacyOperations];
const ajv = new Ajv({ strict: false, allErrors: false, validateFormats: true });
addFormats(ajv);
const validators = new Map();
export function validateInput(operation, input) {
  let validate = validators.get(operation.name);
  if (!validate) {
    validate = ajv.compile(operation.inputSchema);
    validators.set(operation.name, validate);
  }
  if (!validate(input)) {
    // Do not echo submitted values, which may contain secrets.
    throw new Error(`Invalid arguments: ${ajv.errorsText(validate.errors, { dataVar: 'arguments' })}`);
  }
  if (operation.name === 'cm_start_build') {
    const { branch, tag } = input.body;
    if (Boolean(branch) === Boolean(tag)) throw new Error('Supply exactly one of body.branch or body.tag.');
  }
  if (operation.name === 'cm_create_artifact_link' && input.body.expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new Error('body.expiresAt must be a future Unix timestamp in seconds.');
  }
}
export function availableOperations(config) {
  return operations.filter(op =>
    (config.toolset === 'all' || op.core) &&
    (op.method === 'GET' || config.mode === 'all' || (config.mode === 'builds' && op.buildAction))
  );
}
export const schemaMetadata = contract.source;
