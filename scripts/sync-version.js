// Copies the version from package.json into plugin.json. Run by the `npm version` lifecycle hook.
import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const { version } = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const pluginPath = new URL('plugin.json', root);
const plugin = JSON.parse(await readFile(pluginPath, 'utf8'));
if (plugin.version !== version) {
  plugin.version = version;
  await writeFile(pluginPath, JSON.stringify(plugin, null, 2) + '\n');
  console.log(`plugin.json -> ${version}`);
}
const changelog = await readFile(new URL('CHANGELOG.md', root), 'utf8');
if (!changelog.includes(`## [${version}]`)) {
  console.error(`CHANGELOG.md has no "## [${version}]" section. Move the Unreleased notes under a dated heading first.`);
  process.exit(1);
}
