import { homedir } from 'node:os';
import { join, dirname, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseEnv } from 'node:util';
import { constants, openSync, closeSync, readFileSync, writeFileSync, mkdirSync, lstatSync, chmodSync, renameSync, unlinkSync, fsyncSync } from 'node:fs';
import { readConfig, MODES, TOOLSETS, DEFAULT_MODE, DEFAULT_TOOLSET } from './config.js';

const keys = ['CODEMAGIC_API_TOKEN', 'CODEMAGIC_MODE', 'CODEMAGIC_TOOLSET', 'CODEMAGIC_TIMEOUT_MS'];
export const CONFIGURE_USAGE = `configure [--mode ${MODES.join('|')}] [--toolset ${TOOLSETS.join('|')}]`;
export function credentialsPath(env = process.env) {
  const directory = env.CODEMAGIC_CONFIG_DIR || join(homedir(), '.config', 'codemagic-mcp');
  if (!isAbsolute(directory)) throw new Error('CODEMAGIC_CONFIG_DIR must be an absolute path.');
  return join(directory, 'credentials.env');
}
function checkPrivate(path, directory = false) {
  const info = lstatSync(path);
  if (info.isSymbolicLink() || !(directory ? info.isDirectory() : info.isFile())) throw new Error('Codemagic configuration must use a regular file in a real directory.');
  if (process.platform !== 'win32' && ((info.mode & 0o077) || info.uid !== process.getuid())) {
    throw new Error('Codemagic configuration must be owned by you and private: directory 0700, file 0600.');
  }
}
export function readSavedSettings(env = process.env) {
  const path = credentialsPath(env);
  let fd;
  try {
    checkPrivate(dirname(path), true);
    checkPrivate(path);
    fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    const raw = readFileSync(fd, 'utf8');
    if (raw.length > 16_384) throw new Error('Codemagic configuration file is too large.');
    const parsed = parseEnv(raw);
    return Object.fromEntries(keys.filter(key => Object.hasOwn(parsed, key)).map(key => [key, parsed[key]]));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  } finally { if (fd !== undefined) closeSync(fd); }
}
export function loadUserSettings(env = process.env) {
  return { ...readSavedSettings(env), ...env };
}
export function saveSettings(token, options = {}, env = process.env) {
  if (!token || /[\s"'\\\x00-\x1f\x7f]/.test(token)) throw new Error('Token must be nonempty, on one line, and contain no quotes or backslashes.');
  const existing = readSavedSettings(env);
  const settings = {
    ...existing,
    CODEMAGIC_API_TOKEN: token,
    CODEMAGIC_MODE: options.mode ?? existing.CODEMAGIC_MODE ?? DEFAULT_MODE,
    CODEMAGIC_TOOLSET: options.toolset ?? existing.CODEMAGIC_TOOLSET ?? DEFAULT_TOOLSET,
  };
  readConfig(settings);
  const path = credentialsPath(env);
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  checkPrivate(directory, true);
  const temporary = join(directory, `.credentials-${randomUUID()}.tmp`);
  let fd;
  try {
    fd = openSync(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    writeFileSync(fd, keys.filter(key => settings[key] !== undefined).map(key => `${key}="${settings[key]}"`).join('\n') + '\n');
    fsyncSync(fd);
    closeSync(fd); fd = undefined;
    renameSync(temporary, path);
    if (process.platform !== 'win32') chmodSync(path, 0o600);
  } finally {
    if (fd !== undefined) closeSync(fd);
    try { unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return path;
}

export function readHiddenToken(input = process.stdin, output = process.stderr) {
  if (!input.isTTY || typeof input.setRawMode !== 'function') throw new Error('Run configure in your local interactive terminal. Token arguments and piped input are not accepted.');
  output.write('Codemagic API token (hidden; Enter keeps an existing token): ');
  const originalRaw = Boolean(input.isRaw);
  const originallyFlowing = input.readableFlowing === true;
  input.setRawMode(true);
  input.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      input.off('data', onData); input.off('end', onEnd); input.off('error', onError);
      input.setRawMode(originalRaw);
      if (!originallyFlowing) input.pause();
      output.write('\n');
    };
    const fail = message => { cleanup(); reject(new Error(`${message} Nothing was saved.`)); };
    const onError = () => fail('Token entry failed.');
    const onEnd = () => fail('Token entry ended.');
    const onData = chunk => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003' || char === '\u0004') return fail('Token entry cancelled.');
        if (char === '\r' || char === '\n') { cleanup(); resolve(value.trim()); return; }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ' && char <= '~') value += char;
        else return fail('Unsupported control character in token entry.');
        if (value.length > 8192) return fail('Token is too long.');
      }
    };
    input.on('data', onData); input.once('end', onEnd); input.once('error', onError);
  });
}
export async function configure(args, env = process.env) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--mode', '--toolset'].includes(args[i]) || !args[i + 1]) throw new Error(`Usage: ${CONFIGURE_USAGE}. Do not pass a token as an argument.`);
    options[args[i].slice(2)] = args[i + 1];
  }
  readConfig({ CODEMAGIC_MODE: options.mode, CODEMAGIC_TOOLSET: options.toolset });
  const existing = readSavedSettings(env);
  const entered = await readHiddenToken();
  const token = entered || existing.CODEMAGIC_API_TOKEN;
  const path = saveSettings(token, options, env);
  console.error(`Saved private configuration to ${path}. Restart the MCP connection to apply it.`);
}
