#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server.js';
import { readConfig } from './config.js';
import { configure, loadUserSettings } from './credentials.js';
import { VERSION } from './version.js';
try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log('codemagic-mcp: MCP server over stdio\nUsage: codemagic-mcp [configure [--mode read-only|builds|all] [--toolset core|all]]\nConfigure prompts for your token without echoing it.\nSettings: ~/.config/codemagic-mcp/credentials.env (override directory with CODEMAGIC_CONFIG_DIR).\nEnvironment overrides saved settings. No token arguments are accepted.');
  } else if (args.length === 1 && args[0] === '--version') {
    console.log(VERSION);
  } else if (args[0] === 'configure') {
    await configure(args.slice(1));
  } else if (args.length) {
    throw new Error('Unknown arguments. Use --help. Never pass a token as an argument.');
  } else {
    const config = readConfig(loadUserSettings());
    serveStdio(() => createServer(config), { onerror: () => console.error('MCP transport error.') });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
