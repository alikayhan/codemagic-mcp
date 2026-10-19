# Install codemagic-mcp

**Unofficial community MCP server for the Codemagic API.** The project name is `codemagic-mcp`; it is not a Codemagic product.

> **Disclaimer.** This is an independent, community-built project. It is **not** made, endorsed, supported, or reviewed by Codemagic or Nevercode Ltd. "Codemagic" is a trademark of Nevercode Ltd, used here only to describe the public API this server talks to. Nothing here is official. Use at your own risk.

This package is a standard Model Context Protocol (MCP) server over stdio. You can connect it to any MCP client directly, or install it into Codex as a plugin from the bundled local marketplace. Both paths run the same server, locally, with your own Codemagic API token. There is no hosted service.

## Requirements

- **Node.js 22+** on your PATH. Desktop apps may need a restart after installing Node so they can find it.
- A personal Codemagic API token. Codemagic's docs currently place it under **Teams → Personal Account → Integrations → Codemagic API → Show**.

## Get the server

**From the repository** (no build step):

```sh
git clone https://github.com/alikayhan/codemagic-mcp.git
cd codemagic-mcp
npm ci --ignore-scripts
```

`SERVER` is then the absolute path to `src/cli.js`.

**From a release ZIP**, attached to each [GitHub Release](https://github.com/alikayhan/codemagic-mcp/releases). This is the route for the Codex plugin marketplace, and it also works for any other client because it bundles the server into one file.

## What's in the release ZIP

After extracting `codemagic-plugin-0.1.0.zip` into a folder you intend to keep:

```
extracted/
├── .agents/plugins/marketplace.json     local Codex plugin marketplace
└── plugins/codemagic/
    ├── dist/server.mjs                  the MCP server, dependencies bundled
    ├── plugin.json, mcp.json            Codex plugin manifests
    ├── schema/, docs/, README.md, ...
```

No `npm install` is needed for the ZIP. For it, `SERVER` means the absolute path to the extracted `plugins/codemagic/dist/server.mjs`.

## Step 1: save your token privately

```sh
node SERVER configure
```

Paste your Codemagic token at the hidden prompt. Do not put it in a chat, a command argument, or a manifest file. The command saves it to `~/.config/codemagic-mcp/credentials.env` with the directory at mode 0700 and the file at 0600 on macOS/Linux. On Windows it lives under your user profile and inherits that profile's ACLs; keep the profile private and do not point it at a shared directory.

Set `CODEMAGIC_CONFIG_DIR` to an absolute directory to override the location. The configure command and the MCP client must see the same value.

You can instead provide `CODEMAGIC_API_TOKEN` through your MCP client's environment configuration. Environment values override saved values. The server never loads a `.env` file from a repository or the current working directory.

Without a token the server still starts, but in **setup mode**: it exposes a single tool, `cm_setup_status`, which returns the configure command and the credentials file location, and no API tools. Reconnect the server after running `configure` and the full tool list appears.

## Step 2, option A: connect as a plain MCP server

**Claude Code**

```sh
claude mcp add --scope user codemagic -- node SERVER
```

Run `/mcp` inside Claude Code to confirm the connection. Use `--scope project` instead if you want it limited to one repository.

**Cursor, Claude Desktop, Windsurf, or any client that takes `mcpServers` JSON**

```json
{
  "mcpServers": {
    "codemagic": {
      "command": "node",
      "args": ["SERVER"]
    }
  }
}
```

**Codex via `config.toml`** (user or trusted-project)

```toml
[mcp_servers.codemagic]
command = "node"
args = ["SERVER"]

[mcp_servers.codemagic.env]
CODEMAGIC_MODE = "builds"     # or "read-only" for inspection only, "all" for administration
CODEMAGIC_TOOLSET = "core"    # or "all" for the full API
```

See [Codex's MCP configuration docs](https://developers.openai.com/codex/mcp) for where the file lives.

If your client launches without your shell environment and you would rather not use the saved credentials file, create a private env file from `.env.example`, restrict its permissions (`chmod 600`), and add `"--env-file=/absolute/path/codemagic.env"` before `SERVER` in the args.

## Step 2, option B: install as a Codex plugin

This uses the local marketplace in the extracted folder.

```sh
codex plugin marketplace add /absolute/path/to/extracted
codex plugin add codemagic@codemagic-community
```

Start a new local Codex chat. If the plugin is not visible in the desktop plugin picker yet, restart Codex.

If your Codex version lacks `plugin add`, register the marketplace with the supported CLI, then install **codemagic-mcp (unofficial)** from **codemagic-mcp community** in the desktop Plugins directory. Update Codex if local marketplaces or portable manifests are unsupported. See [OpenAI's desktop plugin guidance](https://developers.openai.com/plugins/deploy/desktop-only).

The plugin's `mcp.json` launches `dist/server.mjs` with `node`, so Node must be discoverable by the Codex process.

Do not install both option A and option B in the same Codex client, or you will see duplicate tools. If you previously added a standalone `codemagic` server in Codex and then install the plugin, remove only the old entry with `codex mcp remove codemagic`. That does not delete your token file or uninstall the plugin.

## Step 3: try it

Ask your agent: **"List my Codemagic teams and their apps, then show the latest builds."**

The server starts in `builds` mode with the core toolset: it can read everything and can start or cancel builds, delete caches and create artifact links. `cm_list_apps` can be empty when apps belong to teams; the agent should call `cm_list_teams` and then `cm_list_team_apps`.

## Setup prompt for a coding agent

Paste the following into Claude Code, Codex, Cursor, or any other coding agent, after replacing the path on the first line. The agent will register the server for you but must never ask for or handle your token; you enter that yourself in a terminal.

````text
Set up codemagic-mcp, an unofficial community MCP server for the Codemagic API, located at: /ABSOLUTE/PATH/TO/codemagic-mcp

This is an unofficial, community-built MCP server for the Codemagic API, not an official Codemagic product. It is a standard stdio MCP server.

1. Confirm Node.js 22 or newer is on PATH (`node --version`). If not, stop and tell me how to install it.

2. Find the server entry point inside that path. Prefer `dist/server.mjs` if it exists (dependencies are bundled). Otherwise use `src/cli.js` after running `npm ci --ignore-scripts` in that folder. For an extracted release ZIP the file is `plugins/codemagic/dist/server.mjs`. Call the absolute path SERVER.

3. Check whether credentials are already saved: `~/.config/codemagic-mcp/credentials.env` (or `$CODEMAGIC_CONFIG_DIR/credentials.env`). Report only whether the file exists. Never read, print, or ask me for the token. If it does not exist, tell me to run `node SERVER configure` myself in a terminal and paste my Codemagic API token at its hidden prompt, then wait until I say it is done. Until then the server runs in setup mode and exposes only `cm_setup_status`.

4. Register the server in the MCP client you are running in, using the `node` command with SERVER as the single argument and the server name `codemagic`:
   - Claude Code: `claude mcp add --scope user codemagic -- node SERVER`
   - Codex: add an `[mcp_servers.codemagic]` entry with `command = "node"` and `args = ["SERVER"]` to the user `config.toml`.
   - Cursor, Claude Desktop, Windsurf, or others: add `"codemagic": { "command": "node", "args": ["SERVER"] }` under `mcpServers` in the client's MCP config file. Ask me which client if you cannot tell.
   Do not put any token or environment secret into the config. Do not change or remove other MCP entries.

5. Verify the server starts: run `node SERVER --version` and confirm it prints a version. If the client supports it, reconnect MCP servers and confirm a `codemagic` server appears. If its only tool is `cm_setup_status`, the token is missing: call it, relay the steps to me, and wait. If tools such as `cm_list_teams` appear, setup is complete. If a restart is required, tell me.

6. Report what you did, the exact config you added, and which of these follow-ups I can choose: by default the server can read everything plus start/cancel builds, delete caches and create artifact links; `node SERVER configure --mode read-only` restricts it to inspection, `--mode all` adds administrative writes, and `--toolset all` exposes the full API. Do not run those for me.
````

## Permissions and updates

Defaults are `CODEMAGIC_MODE=builds` and `CODEMAGIC_TOOLSET=core`. Starting a build can cost money and, depending on the workflow, publish a release. To restrict the server to inspection only:

```sh
node SERVER configure --mode read-only
```

Press Enter at the token prompt to keep your saved token. Use `--toolset all` for the broader API and `--mode all` only when you want administrative writes, including membership, billing, variables, sharing and deletion. Restart the MCP connection after changes. Supplying a new token at the prompt replaces the saved token atomically.

These settings persist across plugin upgrades and removal, and across any client. To update, extract the newer release and point your client or marketplace at it; rerun `configure` only if you want to change settings. To remove credentials completely, delete `credentials.env` yourself and revoke the token in Codemagic if appropriate.

## Updates and help

New versions are published as [GitHub Releases](https://github.com/alikayhan/codemagic-mcp/releases) with the changelog section as release notes. To update a checkout, `git pull` and run `npm ci --ignore-scripts` again. To update a ZIP install, extract the new release and point your client or marketplace at it. Saved credentials and settings survive both.

Supported operations and limitations are described in the bundled README and `docs/coverage.md`. Read-only apps, team apps and build history have been verified against a live account; most administrative operations are tested with fixtures rather than live mutations.

Questions and bugs go to the [issue tracker](https://github.com/alikayhan/codemagic-mcp/issues). Security problems should be reported privately; see [SECURITY.md](https://github.com/alikayhan/codemagic-mcp/blob/main/SECURITY.md). Never include your API token in an issue, log, or screenshot.

This project is not affiliated with Codemagic or Nevercode Ltd, and Codemagic does not support it.
