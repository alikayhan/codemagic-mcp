import { build } from 'esbuild';
import { zipSync } from 'fflate';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { VERSION } from '../src/version.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const plugin = JSON.parse(await readFile(join(root, 'plugin.json'), 'utf8'));
if (pkg.version !== VERSION || plugin.version !== VERSION) throw new Error('Versions must match.');
const dist = join(root, 'dist');
await mkdir(dist, { recursive: true });
const result = await build({
  absWorkingDir: root, entryPoints: ['src/cli.js'], outfile: 'dist/server.mjs',
  bundle: true, platform: 'node', target: 'node22', format: 'esm', metafile: true,
  legalComments: 'eof', banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' },
});
const dependencyDirectories = new Set();
for (const input of Object.keys(result.metafile.inputs)) {
  if (!input.startsWith('node_modules/')) continue;
  let dir = dirname(resolve(root, input));
  while (dir.startsWith(join(root, 'node_modules'))) {
    try {
      const metadata = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
      if (metadata.name && metadata.version) { dependencyDirectories.add(dir); break; }
    } catch { /* Continue to the package root. */ }
    dir = dirname(dir);
  }
}
const notices = [];
for (const dir of [...dependencyDirectories].sort()) {
  const metadata = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
  const files = (await readdir(dir)).filter(name => /^(license|licence|notice|copying)(\.|$)/i.test(name));
  if (!files.length) throw new Error(`Missing license for ${metadata.name}`);
  notices.push(`${metadata.name}@${metadata.version} (${metadata.license || 'See license'})`);
  for (const name of files) notices.push(await readFile(join(dir, name), 'utf8'));
}
await writeFile(join(dist, 'THIRD_PARTY_LICENSES.txt'), notices.join('\n\n---\n\n'));
const paths = ['plugin.json', 'mcp.json', 'dist/server.mjs', 'dist/THIRD_PARTY_LICENSES.txt', 'schema/operations.json', 'README.md', 'INSTALL.md', 'LICENSE', 'NOTICE', 'docs/coverage.md'];
const marketplace = {
  name: 'codemagic-community', interface: { displayName: 'codemagic-mcp community' },
  plugins: [{ name: 'codemagic', source: { source: 'local', path: './plugins/codemagic' }, policy: { installation: 'AVAILABLE', authentication: 'ON_USE' }, category: 'Coding' }],
};
const release = join(root, 'release');
const extracted = join(release, `codemagic-plugin-${VERSION}`);
await mkdir(extracted, { recursive: true });
const files = {};
const put = async (path, bytes) => {
  if (path.includes('..') || path.startsWith('/')) throw new Error('Invalid package path');
  files[path] = bytes;
  const destination = join(extracted, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
};
for (const path of paths) await put(`plugins/codemagic/${path}`, await readFile(join(root, path)));
await put('README.md', await readFile(join(root, 'INSTALL.md')));
await put('.agents/plugins/marketplace.json', Buffer.from(JSON.stringify(marketplace, null, 2) + '\n'));
const archive = join(release, `codemagic-plugin-${VERSION}.zip`);
const entries = Object.fromEntries(Object.entries(files).map(([path, bytes]) => [path, [bytes, { mtime: new Date('2026-01-01T00:00:00Z') }]]));
const zip = zipSync(entries, { level: 9 });
await writeFile(archive, zip);
await writeFile(archive + '.sha256', `${createHash('sha256').update(zip).digest('hex')}  ${relative(release, archive)}\n`);
console.log(`Built ${relative(root, archive)} (${zip.byteLength} bytes), ${paths.length} plugin files, ${dependencyDirectories.size} dependency licenses.`);
