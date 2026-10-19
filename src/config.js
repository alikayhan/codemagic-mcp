export const MODES = ['read-only', 'builds', 'all'];
export const TOOLSETS = ['core', 'all'];
export const DEFAULT_MODE = 'builds';
export const DEFAULT_TOOLSET = 'core';
export function readConfig(env = process.env) {
  const mode = env.CODEMAGIC_MODE || DEFAULT_MODE;
  const toolset = env.CODEMAGIC_TOOLSET || DEFAULT_TOOLSET;
  const timeoutMs = Number(env.CODEMAGIC_TIMEOUT_MS || 30_000);
  if (!MODES.includes(mode)) throw new Error(`CODEMAGIC_MODE must be one of: ${MODES.join(', ')}.`);
  if (!TOOLSETS.includes(toolset)) throw new Error(`CODEMAGIC_TOOLSET must be one of: ${TOOLSETS.join(', ')}.`);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000) throw new Error('CODEMAGIC_TIMEOUT_MS must be 100–120000.');
  const token = env.CODEMAGIC_API_TOKEN?.trim();
  if (token && /[\r\n]/.test(token)) throw new Error('CODEMAGIC_API_TOKEN must be a single line.');
  return { token, mode, toolset, timeoutMs, maxResponseBytes: 2 * 1024 * 1024 };
}
