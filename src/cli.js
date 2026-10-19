#!/usr/bin/env node
import { readConfig } from './config.js';
import { configure, loadUserSettings, credentialsPath, CONFIGURE_USAGE } from './credentials.js';
import { VERSION } from './version.js';
try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log(`codemagic-mcp: MCP server over stdio\nUsage: codemagic-mcp [${CONFIGURE_USAGE}]\nConfigure prompts for your token without echoing it.\nSettings: ${credentialsPath({})} (override directory with CODEMAGIC_CONFIG_DIR).\nEnvironment overrides saved settings. No token arguments are accepted.`);
  } else if (args.length === 1 && args[0] === '--version') {
    console.log(VERSION);
  } else if (args[0] === 'configure') {
    await configure(args.slice(1));
  } else if (args.length) {
    throw new Error('Unknown arguments. Use --help. Never pass a token as an argument.');
  } else {
    const config = readConfig(loadUserSettings());
    // Loaded lazily so --help, --version and configure skip the SDK, Ajv and the operations contract.
    const [{ serveStdio }, { createServer }] = await Promise.all([import('@modelcontextprotocol/server/stdio'), import('./server.js')]);
    serveStdio(() => createServer(config), { onerror: () => console.error('MCP transport error.') });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
