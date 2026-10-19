import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync, mkdirSync, writeFileSync, chmodSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough, Writable } from 'node:stream';
import { credentialsPath, saveSettings, readSavedSettings, loadUserSettings, readHiddenToken } from '../src/credentials.js';
function isolated(t) {
  const root = mkdtempSync(join(tmpdir(), 'codemagic-config-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { CODEMAGIC_CONFIG_DIR: join(root, 'settings') };
}
test('settings are private, survive rotation, and preserve chosen permissions', t => {
  const env = isolated(t);
  const path = saveSettings('fake-token-one', { mode: 'builds', toolset: 'all' }, env);
  assert.equal(path, credentialsPath(env));
  assert.equal(readSavedSettings(env).CODEMAGIC_API_TOKEN, 'fake-token-one');
  saveSettings('fake-token-two', {}, env);
  const settings = readSavedSettings(env);
  assert.equal(settings.CODEMAGIC_API_TOKEN, 'fake-token-two');
  assert.equal(settings.CODEMAGIC_MODE, 'builds');
  assert.equal(settings.CODEMAGIC_TOOLSET, 'all');
  assert.ok(!readFileSync(path, 'utf8').includes('fake-token-one'));
  if (process.platform !== 'win32') {
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(statSync(env.CODEMAGIC_CONFIG_DIR).mode & 0o777, 0o700);
  }
});
test('environment overrides saved settings and never imports unrelated settings', t => {
  const env = isolated(t);
  saveSettings('saved-token', { mode: 'builds' }, env);
  const path = credentialsPath(env);
  writeFileSync(path, readFileSync(path, 'utf8') + 'NODE_OPTIONS="--malicious"\n');
  const loaded = loadUserSettings({ ...env, CODEMAGIC_API_TOKEN: '', CODEMAGIC_MODE: 'read-only' });
  assert.equal(loaded.CODEMAGIC_API_TOKEN, '');
  assert.equal(loaded.CODEMAGIC_MODE, 'read-only');
  assert.equal(loaded.NODE_OPTIONS, undefined);
});
test('invalid input never replaces the saved token', t => {
  const env = isolated(t);
  saveSettings('original-token', {}, env);
  for (const token of ['', 'a\nb', 'a"b', "a'b", 'a\\b']) assert.throws(() => saveSettings(token, {}, env));
  assert.throws(() => saveSettings('new-token', { mode: 'invalid' }, env));
  assert.equal(readSavedSettings(env).CODEMAGIC_API_TOKEN, 'original-token');
  assert.throws(() => credentialsPath({ CODEMAGIC_CONFIG_DIR: './untrusted-repo' }));
});
test('missing settings allow an unconfigured plugin to start', t => {
  const env = isolated(t);
  assert.deepEqual(readSavedSettings(env), {});
});
test('shared or symlinked credential files are rejected', { skip: process.platform === 'win32' }, t => {
  const env = isolated(t);
  saveSettings('test-token', {}, env);
  const path = credentialsPath(env);
  chmodSync(path, 0o644);
  assert.throws(() => readSavedSettings(env), /private/);
  chmodSync(path, 0o600);
  const second = { CODEMAGIC_CONFIG_DIR: join(env.CODEMAGIC_CONFIG_DIR, 'second') };
  mkdirSync(second.CODEMAGIC_CONFIG_DIR, { mode: 0o700 });
  symlinkSync(path, credentialsPath(second));
  assert.throws(() => saveSettings('replacement', {}, second), /regular file/);
  assert.equal(readSavedSettings(env).CODEMAGIC_API_TOKEN, 'test-token');
});
function terminal() {
  const input = new PassThrough();
  input.isTTY = true;
  input.isRaw = false;
  input.setRawMode = value => { input.isRaw = value; };
  let text = '';
  const output = new Writable({ write(chunk, _, done) { text += chunk.toString(); done(); } });
  return { input, output, text: () => text };
}
test('hidden terminal entry never echoes a token and restores terminal mode', async () => {
  const tty = terminal();
  const result = readHiddenToken(tty.input, tty.output);
  tty.input.write('fake-secret-x\u007fy\r');
  assert.equal(await result, 'fake-secret-y');
  assert.equal(tty.input.isRaw, false);
  assert.equal(tty.input.isPaused(), true);
  assert.ok(!tty.text().includes('fake-secret'));
});
test('cancelled or noninteractive token entry does not expose credentials', async () => {
  const tty = terminal();
  const result = readHiddenToken(tty.input, tty.output);
  tty.input.write('fake-secret\u0003');
  await assert.rejects(result, /cancelled/);
  assert.equal(tty.input.isRaw, false);
  assert.ok(!tty.text().includes('fake-secret'));
  assert.throws(() => readHiddenToken(new PassThrough(), tty.output), /interactive/);
});
