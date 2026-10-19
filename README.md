# Codemagic MCP (community)

[![CI](https://github.com/alikayhan/codemagic-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/alikayhan/codemagic-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Changelog](https://img.shields.io/badge/changelog-keep%20a%20changelog-orange.svg)](CHANGELOG.md)

> **Disclaimer.** This is an independent, community-built project. It is **not** made, endorsed, supported, or reviewed by Codemagic or Nevercode Ltd. "Codemagic" is a trademark of Nevercode Ltd and is used here only to describe which public API this server talks to. Nothing in this repository is official. Use it at your own risk, and direct Codemagic product questions to Codemagic, not to this project.

A standard [Model Context Protocol](https://modelcontextprotocol.io) server, over stdio, for the public Codemagic REST API. Point any MCP-capable client at it (Claude Code, Codex, Cursor, Claude Desktop, or anything else that can launch a local `mcpServers` command) to list apps and teams, inspect build history, and optionally trigger or cancel builds and manage team settings. Each installation uses the user's own Codemagic API token. Nothing is hosted, and no shared credentials or company-specific IDs are bundled.

The same code is also packaged as a **Codex plugin** for people who prefer installing from a local plugin marketplace. That is an optional packaging on top of the plain MCP server, not a different product.

**Status:** 0.x, pre-1.0. Core read-only operations (apps, teams, build history) have been verified against a live account. Administrative operations are covered by test fixtures rather than live mutations. Not published to npm or to any public plugin directory. See [CHANGELOG.md](CHANGELOG.md).

## Requirements

- Node.js 22 or newer on your PATH.
- A personal Codemagic API token. Codemagic's docs currently place it under **Teams → Personal Account → Integrations → Codemagic API → Show**. Permissions follow the token owner's team role.

## Quick start

### 1. Get the server

Clone this repository and install dependencies:

```sh
git clone https://github.com/alikayhan/codemagic-mcp.git
cd codemagic-mcp
npm ci --ignore-scripts
```

There is no build step for the plain server; `src/cli.js` runs directly. Alternatively, download the release ZIP attached to a [GitHub Release](https://github.com/alikayhan/codemagic-mcp/releases); it contains a bundled single-file server at `plugins/codemagic/dist/server.mjs` and needs no `npm install`. The ZIP is mainly for the Codex plugin path.

Throughout this document, `SERVER` means one of:

| Source | `SERVER` |
| --- | --- |
| Repository checkout | `/absolute/path/codemagic-mcp/src/cli.js` |
| Repository checkout, bundled (`npm run build`) | `/absolute/path/codemagic-mcp/dist/server.mjs` |
| Extracted release ZIP | `/absolute/path/extracted/plugins/codemagic/dist/server.mjs` |

### 2. Save your token privately

```sh
node SERVER configure
```

This prompts for the token without echoing it and writes it to `~/.config/codemagic-mcp/credentials.env` (directory mode 0700, file mode 0600 on macOS/Linux). Do not paste the token into a chat, a command argument, or a client config file. Alternatively, supply `CODEMAGIC_API_TOKEN` through your client's environment configuration; environment values override the saved file. The server never reads a `.env` from the current directory or from a repository.

Without a token the server still starts, but in **setup mode**: it exposes a single tool, `cm_setup_status`, which returns the configure command and the credentials file location, and no API tools. Reconnect the server after running `configure` and the full tool list appears.

### 3. Connect your MCP client

**Claude Code**

```sh
claude mcp add --scope user codemagic -- node SERVER
```

Then run `/mcp` inside Claude Code to confirm it connected. Tools appear as `mcp__codemagic__cm_list_teams` and so on.

**Any client that accepts `mcpServers` JSON** (Cursor, Claude Desktop, Windsurf, and others)

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

If the client does not inherit your shell environment and you prefer an env file over the saved credentials, add `"--env-file=/absolute/path/codemagic.env"` before `SERVER` in `args`. See `.env.example` for the file format.

**Codex, as a plain MCP server** (user or trusted-project `config.toml`)

```toml
[mcp_servers.codemagic]
command = "node"
args = ["SERVER"]

[mcp_servers.codemagic.env]
CODEMAGIC_MODE = "read-only"
CODEMAGIC_TOOLSET = "core"
```

**Codex, as a plugin** from the release ZIP's local marketplace: see [INSTALL.md](INSTALL.md).

### 4. Try it

Ask your agent: *"List my Codemagic teams and their apps, then show the latest builds."*

The server is read-only by default. See [Toolsets and permissions](#toolsets-and-permissions) to enable build triggering or administrative writes.

## Setup prompt for a coding agent

Paste the following into Claude Code, Codex, Cursor, or any other coding agent, after replacing the path on the first line. The agent will register the server for you but must never ask for or handle your token; you enter that yourself in a terminal.

````text
Set up the community Codemagic MCP server located at: /ABSOLUTE/PATH/TO/codemagic-mcp

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

6. Report what you did, the exact config you added, and which of these follow-ups I can choose: the server is read-only by default; `node SERVER configure --mode builds` enables build start/cancel, and `--toolset all` exposes the full API. Do not run those for me.
````

## Coverage

106 tools: 98 mappings from Codemagic's public v3 OpenAPI contract and 8 documented legacy operations. The contract is bundled, so startup does not download a schema or silently expose new operations. See the [complete coverage table](docs/coverage.md).

| Area | Support |
| --- | --- |
| Applications | List user/team apps, inspect an app, add public/private repositories, discover workflows |
| Builds | List/filter/paginate, inspect status and artifact metadata, start, cancel, inspect actions and remote-access metadata |
| Artifacts and caches | Create expiring public artifact links; list/delete caches |
| Teams and settings | Members, permissions, invitations, notifications, preferences |
| Variables | App/team groups, import/update/delete variables |
| Distribution | Tester groups/contacts, previews, dashboards, OTA metadata/access-key administration |
| Analytics and administration | Build usage, durations, audit logs/connectors, subscriptions, invoices and payment-method references |

This is API coverage, **not full web UI parity**. Raw build-log streaming, artifact binary downloads/uploads, signing-file uploads, repository YAML editing, and undocumented browser endpoints are not implemented. `cm_get_build_actions` returns action metadata/scripts, not console logs. API-token retrieval/revocation is intentionally excluded so a tool cannot expose or invalidate the server's own credential. Secret response fields (including newly created access keys and VNC passwords) are redacted; retrieve those through Codemagic's UI when needed.

The workflow endpoint reports workflows known to Codemagic. If a newly added YAML workflow is absent, obtain its ID from the repository's `codemagic.yaml` and pass it explicitly. Store deployment behavior belongs to the selected workflow: triggering a build can also publish a release.

## Toolsets and permissions

| Variable | Default | Options |
| --- | --- | --- |
| `CODEMAGIC_API_TOKEN` | unset | Personal API token, needed for API calls |
| `CODEMAGIC_TOOLSET` | `core` | `core` exposes 12–19 everyday tools; `all` exposes 64–106 tools |
| `CODEMAGIC_MODE` | `read-only` | `read-only`: GET operations; `builds`: also start/cancel builds; `all`: all implemented mutations |
| `CODEMAGIC_TIMEOUT_MS` | `30000` | Integer from 100 to 120000 |
| `CODEMAGIC_CONFIG_DIR` | `~/.config/codemagic-mcp` | Absolute directory holding `credentials.env` |

Set these through your client's environment configuration, or persist mode and toolset alongside the token:

```sh
node SERVER configure --mode builds --toolset core
```

Press Enter at the token prompt to keep the saved token. Reconnect or restart the client after changing configuration.

Toolset and mode are independent. `all` + `read-only` exposes broader inspection without mutations. `all` + `all` also permits billing, membership, secret, deletion, invitation, and sharing operations. Disabled tools are absent from the MCP catalog and cannot be invoked by name. These are local exposure controls, not replacements for Codemagic's server-side permissions or your MCP client's approvals.

## Examples

Ask your agent to list teams and apps first. Arguments are grouped into `path`, `query`, and `body` to avoid collisions. Optional pagination and filters belong in `query`; response pagination fields are preserved rather than automatically fetching every page.

List builds:

```json
{
  "name": "cm_list_builds",
  "arguments": {
    "path": { "team_id": "YOUR_TEAM_ID" },
    "query": { "app_id": "YOUR_APP_ID", "branch": "main", "page_size": 10 }
  }
}
```

Start a build with `CODEMAGIC_MODE=builds`:

```json
{
  "name": "cm_start_build",
  "arguments": {
    "path": { "app_id": "YOUR_APP_ID" },
    "body": { "workflow_id": "ios-release", "branch": "main" }
  }
}
```

Exactly one of `branch` or `tag` is required. Build inputs, labels, instance type and environment overrides are accepted according to the bundled schema. V3 body keys use snake_case. The legacy app/artifact endpoints retain their documented camelCase keys.

Inspect a build or cancel it:

```json
{ "name": "cm_get_build", "arguments": { "path": { "build_id": "YOUR_BUILD_ID" } } }
```

```json
{ "name": "cm_cancel_build", "arguments": { "path": { "build_id": "YOUR_BUILD_ID" } } }
```

Use the `codemagic://capabilities` MCP resource to inspect enabled tools and contract provenance. For `cm_create_artifact_link`, use the literal path after `/artifacts/` in the authenticated artifact URL and an explicit future `expiresAt` Unix timestamp. Encoded path input is rejected; supply literal names, including spaces.

## Reliability and data handling

- Requests only go to fixed Codemagic origins. Redirects and arbitrary URL input are rejected to prevent forwarding the token elsewhere.
- Requests have timeouts and a 2 MiB response limit. Reduce `page_size` or filter more narrowly if a response is too large. Large audit CSV exports can exceed this limit.
- Mutations are never retried automatically. A transport failure or server error may leave an unknown outcome; inspect current state before retrying a build or billing action.
- HTTP 401/403 errors distinguish authentication from permissions. HTTP 429 responses include rate-limit headers; `ratelimit-reset` is seconds remaining. The client does not retry or sleep automatically.
- Structured results retain status, data and rate-limit metadata. HTTP 208 on cancellation means the build already finished; HTTP 202 cache deletion is asynchronous.
- Error bodies are suppressed because they can echo credentials. Known credential fields and exact API-token echoes are redacted. This is best-effort redaction, not a general secret detector: scripts, URLs, plaintext variables, and audit data may contain sensitive content. Tool arguments are visible to the MCP client and may be retained in its history; use a trusted client for secret-changing operations.
- stdout is reserved for MCP traffic during normal operation. No HTTP listener, filesystem-write tool, shell-execution tool, or unrestricted HTTP tool is exposed.
- This is a stdio server: one local process and one credential per client. It is not a hosted multi-user HTTP service and does not implement OAuth. Other users install their own copy.

## Versioning and releases

Versions follow [Semantic Versioning](https://semver.org). While the major version is 0, minor releases may change tool names, argument shapes, or configuration; patch releases are fixes only. Every release has a dated section in [CHANGELOG.md](CHANGELOG.md), following Keep a Changelog.

`package.json` is the only place the version is typed. `src/version.js` reads it, and `scripts/sync-version.js` copies it into `plugin.json`. The build and the test suite both fail if the three disagree or if the changelog lacks a section for the current version.

To cut a release:

1. Move the notes under `## [Unreleased]` in `CHANGELOG.md` into a new `## [x.y.z] - YYYY-MM-DD` section and update the link references at the bottom.
2. Run `npm version minor` (or `patch` / `major`). This bumps `package.json`, syncs `plugin.json`, commits, and creates the `vx.y.z` tag.
3. Run `git push --follow-tags`.

The `Release` GitHub Actions workflow runs on `v*` tags. It checks that the tag matches `package.json`, runs checks and tests, builds the Codex plugin ZIP and the npm tarball, and attaches them to a GitHub Release whose body is that version's changelog section. Build outputs (`dist/`, `release/`, `*.tgz`) are gitignored and never committed.

## Development

```sh
npm ci --ignore-scripts
npm run check
npm test
node src/cli.js --help
```

Source is standard JavaScript ESM with no compilation step. Tests do not need credentials or start real builds.

**Bundle and package the Codex plugin:**

```sh
npm run build
npm run test:plugin
```

Output: `release/codemagic-plugin-0.1.0.zip`, its SHA-256 file, and an extracted local marketplace. The ZIP contains a single-file `dist/server.mjs` with dependencies bundled, plus `plugin.json` and `mcp.json` in the portable Agent Plugins format. The bundled file is also a convenient target for non-Codex clients.

**npm tarball:** `npm pack` creates `codemagic-mcp-0.1.0.tgz`. Install it with `npm install -g /path/to/codemagic-mcp-0.1.0.tgz` and configure the resulting `codemagic-mcp` executable in a client. The package name is local only; this project is not in any registry.

**Updating the API contract:** run `npm run schema:update`, or `node scripts/update-schema.js /path/to/openapi.json` with a downloaded specification. Review the generated diff, permissions and names, then run checks and tests. The schema is never refreshed at server startup. The generator resolves local references, uses strict object fields, and normalizes upstream overlapping `oneOf` type unions into `anyOf` (notably integer/number build inputs). Build branch/tag exclusivity is validated separately.

The test suite exercises MCP discovery and calls, stdio startup, request routing, validation, mode restrictions, pagination, timeout and error behavior, and credential handling. Administrative writes and non-macOS runtime behavior still need live acceptance testing.

## Contributing, security and support

Contributions are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers the development setup, the test and schema workflow, and what a pull request needs (a changelog entry, passing checks, no credentials in fixtures). Pull requests are squash-merged, and the PR title becomes the commit message on `main`.

Report security issues privately through [GitHub's vulnerability reporting](https://github.com/alikayhan/codemagic-mcp/security/advisories/new) rather than in a public issue. [SECURITY.md](SECURITY.md) describes what is in scope and how token handling is designed. Never include an API token in an issue, log, or screenshot; redact it and revoke it in Codemagic if it was exposed.

For bugs and questions use the [issue tracker](https://github.com/alikayhan/codemagic-mcp/issues). This is a volunteer project with no service-level commitment. Codemagic itself provides no support for it.

## Sources and license

- [Codemagic v3 API](https://codemagic.io/api/v3/schema) and [OpenAPI specification](https://codemagic.io/api/v3/schema/openapi.json)
- Legacy [applications](https://docs.codemagic.io/rest-api/applications/), [build cancellation](https://docs.codemagic.io/rest-api/builds/), [caches](https://docs.codemagic.io/rest-api/caches/), and [artifact links](https://docs.codemagic.io/rest-api/artifacts/)
- [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

Implementation code is MIT licensed. See [LICENSE](LICENSE) and [NOTICE](NOTICE) for upstream attribution. The bundled API contract is derived from Codemagic's published OpenAPI document and remains subject to Codemagic's own terms.

This project has no relationship with Codemagic or Nevercode Ltd. It is not an official integration, and Codemagic provides no support for it.
