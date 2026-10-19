export function readConfig(env = process.env) {
  const mode = env.CODEMAGIC_MODE || 'read-only';
  const toolset = env.CODEMAGIC_TOOLSET || 'core';
  const timeoutMs = Number(env.CODEMAGIC_TIMEOUT_MS || 30_000);
  if (!['read-only', 'builds', 'all'].includes(mode)) throw new Error('CODEMAGIC_MODE must be read-only, builds or all.');
  if (!['core', 'all'].includes(toolset)) throw new Error('CODEMAGIC_TOOLSET must be core or all.');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000) throw new Error('CODEMAGIC_TIMEOUT_MS must be 100–120000.');
  const token = env.CODEMAGIC_API_TOKEN?.trim();
  if (token && /[\r\n]/.test(token)) throw new Error('CODEMAGIC_API_TOKEN must be a single line.');
  return { token, mode, toolset, timeoutMs, maxResponseBytes: 2 * 1024 * 1024 };
}
