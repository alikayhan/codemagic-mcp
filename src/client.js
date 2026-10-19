const origins = new Set(['https://codemagic.io', 'https://api.codemagic.io']);
const secretKey = /^(?:key|x[-_]auth[-_]token|authorization|api[-_]?key|access[-_]?key|access[-_]?token|refresh[-_]?token|token|password|passphrase|private[-_]?key|ssh[-_]?key|secret|aws_secret_key|sca_secret)$/i;
export function redact(value, token) {
  if (typeof value === 'string') return token ? value.split(token).join('[REDACTED]') : value;
  if (Array.isArray(value)) return value.map(item => redact(item, token));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
      secretKey.test(key) || (key === 'value' && (value.is_secret === true || value.secure === true || value.secret === true))
        ? '[REDACTED]' : redact(item, token),
    ]));
  }
  return value;
}
function encodeSegment(value) {
  if (typeof value !== 'string' || !value || value === '.' || value === '..' || /[%/\\?#\x00-\x1f]/.test(value)) {
    throw new Error('Path arguments must be nonempty literal path segments, without URL escapes or traversal.');
  }
  return encodeURIComponent(value);
}
export function requestUrl(operation, input) {
  if (!origins.has(operation.origin)) throw new Error('Unsupported API origin.');
  const path = operation.path.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = input.path?.[key];
    if (key === 'artifact_path') {
      if (typeof value !== 'string') throw new Error('artifact_path must be a relative artifact path.');
      return value.split('/').map(encodeSegment).join('/');
    }
    return encodeSegment(value);
  });
  const url = new URL(path, operation.origin);
  if (url.origin !== operation.origin) throw new Error('Unsupported API origin.');
  for (const [key, value] of Object.entries(input.query || {})) {
    if (value === null || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (!['string', 'number', 'boolean'].includes(typeof item)) throw new Error('Query values must be scalars or arrays of scalars.');
      url.searchParams.append(key, String(item));
    }
  }
  return url;
}
async function readBounded(response, limit) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('Response exceeded the size limit.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString('utf8');
}
export class CodemagicClient {
  constructor(config, fetchImpl = globalThis.fetch) { this.config = config; this.fetch = fetchImpl; }
  async execute(operation, input, signal) {
    if (!this.config.token) throw new Error('Run the server configure command in your local terminal, or set CODEMAGIC_API_TOKEN in its environment. Never paste the token into chat or a tool call.');
    const url = requestUrl(operation, input);
    const timeout = AbortSignal.timeout(this.config.timeoutMs);
    const combined = signal ? AbortSignal.any([timeout, signal]) : timeout;
    let response;
    let text;
    try {
      response = await this.fetch(url, {
        method: operation.method,
        headers: { 'x-auth-token': this.config.token, Accept: 'application/json', ...(input.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: input.body === undefined ? undefined : JSON.stringify(input.body), signal: combined, redirect: 'error',
      });
      text = await readBounded(response, this.config.maxResponseBytes);
    } catch {
      throw new Error(operation.method === 'GET'
        ? 'Codemagic request failed (network, timeout, redirect, cancellation or response size). Narrow filters if the response is large.'
        : 'Codemagic request failed; the mutation outcome is UNKNOWN. Check current state before retrying. No automatic retry was made.');
    }
    const rateLimit = Object.fromEntries(['ratelimit-limit', 'ratelimit-remaining', 'ratelimit-reset', 'retry-after']
      .flatMap(key => response.headers.has(key) ? [[key, response.headers.get(key)]] : []));
    if (!response.ok) {
      // API error bodies can echo credentials and submitted secret values.
      const hints = { 400: 'Check the documented inputs.', 401: 'Check CODEMAGIC_API_TOKEN.', 403: 'The token lacks permission for this action.', 404: 'Resource not found or inaccessible.', 429: 'Rate limited. Wait for ratelimit-reset (seconds) before retrying.' };
      const outcomeUnknown = operation.method !== 'GET' && response.status >= 500;
      return { ok: false, status: response.status, error: outcomeUnknown
        ? 'Server error; mutation outcome is UNKNOWN. Check current state before retrying.'
        : hints[response.status] || 'Codemagic rejected the request.', rateLimit, ...(outcomeUnknown ? { outcomeUnknown: true } : {}) };
    }
    let data = null;
    if (text) {
      if (response.headers.get('content-type')?.includes('json')) {
        try { data = JSON.parse(text); } catch { throw new Error('Codemagic returned invalid JSON. For a mutation, check current state before retrying.'); }
      } else data = text;
    }
    return { ok: true, status: response.status, rateLimit, data: redact(data, this.config.token) };
  }
}
