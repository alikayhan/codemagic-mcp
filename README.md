# codemagic-mcp

**Unofficial community MCP server for the Codemagic API.** The project name is `codemagic-mcp`; it is not a Codemagic product.

[![CI](https://github.com/alikayhan/codemagic-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/alikayhan/codemagic-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Changelog](https://img.shields.io/badge/changelog-keep%20a%20changelog-orange.svg)](CHANGELOG.md)

> **Disclaimer.** This is an independent, community-built project. It is **not** made, endorsed, supported, or reviewed by Codemagic or Nevercode Ltd. "Codemagic" is a trademark of Nevercode Ltd and is used here only to describe which public API this server talks to. Nothing in this repository is official. Use it at your own risk, and direct Codemagic product questions to Codemagic, not to this project.

A standard [Model Context Protocol](https://modelcontextprotocol.io) server, over stdio, for the public Codemagic REST API. Point any MCP-capable client at it (Claude Code, Codex, Cursor, Claude Desktop, or anything else that can launch a local `mcpServers` command) to list apps and teams, inspect build history, and optionally trigger or cancel builds and manage team settings. Each installation uses the user's own Codemagic API token. Nothing is hosted, and no shared credentials or company-specific IDs are bundled.

The same code is also packaged as a **Codex plugin** for people who prefer installing from a local plugin marketplace. That is an optional packaging on top of the plain MCP server, not a different product.

**Status:** 0.x, pre-1.0. Core read-only operations (apps, teams, build history) have been verified against a live account. Administrative operations are covered by test fixtures rather than live mutations. Published to npm as `@alikayhan/codemagic-mcp`; not listed in any public plugin directory. See [CHANGELOG.md](CHANGELOG.md).

## Requirements

- Node.js 22 or newer on your PATH. It ships `npx`, which is all the default install needs.
- A personal Codemagic API token. Codemagic's docs currently place it under **Teams → Personal Account → Integrations → Codemagic API → Show**. Permissions follow the token owner's team role.

## Quick start

The server is published to npm as [`@alikayhan/codemagic-mcp`](https://www.npmjs.com/package/@alikayhan/codemagic-mcp). Clients launch it with `npx -y @alikayhan/codemagic-mcp`, which downloads it on first use and caches it. Nothing needs to be cloned or built. The name is scoped because unscoped `codemagic-mcp` collides with other packages on npm; the project itself is still called `codemagic-mcp`.

### 1. Save your token privately

```sh
npx -y @alikayhan/codemagic-mcp configure
```

This prompts for the token without echoing it and writes it to `~/.config/codemagic-mcp/credentials.env` (directory mode 0700, file mode 0600 on macOS/Linux). Do not paste the token into a chat, a command argument, or a client config file. Alternatively, supply `CODEMAGIC_API_TOKEN` through your client's environment configuration; environment values override the saved file. The server never reads a `.env` from the current directory or from a repository.

Without a token the server still starts, but in **setup mode**: it exposes a single tool, `cm_setup_status`, which returns the configure command and the credentials file location, and no API tools. Reconnect the server after running `configure` and the full tool list appears.

### 2. Connect your MCP client

**Claude Code**

```sh
claude mcp add --scope user codemagic -- npx -y @alikayhan/codemagic-mcp
```

Then run `/mcp` inside Claude Code to confirm it connected. Tools appear as `mcp__codemagic__cm_list_teams` and so on.

**Codex**

```sh
codex mcp add codemagic -- npx -y @alikayhan/codemagic-mcp
```

This writes an `[mcp_servers.codemagic]` entry to `~/.codex/config.toml`. To set mode or toolset there instead of through `configure`, add an `[mcp_servers.codemagic.env]` table with `CODEMAGIC_MODE` and `CODEMAGIC_TOOLSET`.

**Pi**

```sh
pi mcp add codemagic -- npx -y @alikayhan/codemagic-mcp
```

**OpenCode** (`opencode.json`)

```json
{
  "mcp": {
    "codemagic": {
      "type": "local",
      "command": ["npx", "-y", "@alikayhan/codemagic-mcp"]
    }
  }
}
```

**Any client that accepts `mcpServers` JSON** (Cursor, Claude Desktop, Windsurf, and others)

```json
{
  "mcpServers": {
    "codemagic": {
      "command": "npx",
      "args": ["-y", "@alikayhan/codemagic-mcp"]
    }
  }
}
```

Desktop clients on Windows sometimes cannot launch `npx` directly; use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@alikayhan/codemagic-mcp"]`. If the client does not inherit your shell environment and you prefer an env file over the saved credentials, add `"--env-file=/absolute/path/codemagic.env"` after `@alikayhan/codemagic-mcp` in `args`. See `.env.example` for the file format.

To pin a version, write `@alikayhan/codemagic-mcp@0.1.0` instead of `@alikayhan/codemagic-mcp`. For faster startup, install once with `npm install -g @alikayhan/codemagic-mcp` and use `codemagic-mcp` as the command with no arguments.

### 3. Try it

Ask your agent: *"List my Codemagic teams and their apps, then show the latest builds."*

By default the server can read everything and can start or cancel builds, delete caches and create artifact links. Starting a build can cost money and, depending on the workflow, publish a release. See [Toolsets and permissions](#toolsets-and-permissions) to restrict it to read-only or to enable administrative writes.

## Other ways to run the server

Two alternatives exist for people who do not want npm involved at runtime. In the instructions above, replace `npx -y @alikayhan/codemagic-mcp` with `node SERVER`, where `SERVER` is:

| Source | `SERVER` |
| --- | --- |
| Repository checkout (`git clone`, then `npm ci --ignore-scripts`; no build step) | `/absolute/path/codemagic-mcp/src/cli.js` |
| Extracted release ZIP from a [GitHub Release](https://github.com/alikayhan/codemagic-mcp/releases) (single bundled file, no install) | `/absolute/path/extracted/plugins/codemagic/dist/server.mjs` |

The release ZIP also contains a local **Codex plugin marketplace** for people who prefer installing the server as a Codex plugin; see [INSTALL.md](INSTALL.md). Do not combine the plugin with a `codex mcp add` entry in the same client, or the tools appear twice.

## Setup prompt for a coding agent

Paste the following into Claude Code, Codex, Pi, Cursor, or any other coding agent. The agent registers the server and verifies it, but leaves the token to you: it must never ask for or handle it, and you enter it yourself in a terminal.

````text
Set up codemagic-mcp, an unofficial community MCP server for the Codemagic API. It is published on npm as `@alikayhan/codemagic-mcp` and documented at https://github.com/alikayhan/codemagic-mcp

This is an unofficial, community-built MCP server, not an official Codemagic product. It is a standard stdio MCP server that runs locally with my own Codemagic API token. Clients launch it with `npx -y @alikayhan/codemagic-mcp`.

1. Confirm Node.js 22 or newer is on PATH (`node --version`). If not, stop and tell me how to install it.

2. Verify the package runs: `npx -y @alikayhan/codemagic-mcp --version` must print a version. Do not clone the repository or install anything globally unless I ask.

3. Check whether credentials are already saved: `~/.config/codemagic-mcp/credentials.env` (or `$CODEMAGIC_CONFIG_DIR/credentials.env`). Report only whether the file exists. Never read, print, or ask me for the token. If it does not exist, tell me to run `npx -y @alikayhan/codemagic-mcp configure` myself in a terminal and paste my Codemagic API token at its hidden prompt, then wait until I say it is done. Until then the server runs in setup mode and exposes only `cm_setup_status`.

4. Register the server in the MCP client you are running in, with the server name `codemagic`, the command `npx`, and the arguments `-y @alikayhan/codemagic-mcp`:
   - Claude Code: `claude mcp add --scope user codemagic -- npx -y @alikayhan/codemagic-mcp`
   - Codex: `codex mcp add codemagic -- npx -y @alikayhan/codemagic-mcp`
   - Pi: `pi mcp add codemagic -- npx -y @alikayhan/codemagic-mcp`
   - OpenCode: add `"codemagic": { "type": "local", "command": ["npx", "-y", "@alikayhan/codemagic-mcp"] }` under `mcp` in `opencode.json`.
   - Cursor, Claude Desktop, Windsurf, or others: add `"codemagic": { "command": "npx", "args": ["-y", "@alikayhan/codemagic-mcp"] }` under `mcpServers` in the client's MCP config file. Ask me which client if you cannot tell.
   Do not put any token or environment secret into the config. Do not change or remove other MCP entries.

5. If the client supports it, reconnect MCP servers and confirm a `codemagic` server appears. If its only tool is `cm_setup_status`, the token is missing: call it, relay the steps to me, and wait. If tools such as `cm_list_teams` appear, setup is complete. If a restart is required, tell me.

6. Report what you did, the exact config you added, and which of these follow-ups I can choose: by default the server can read everything plus start/cancel builds, delete caches and create artifact links; `npx -y @alikayhan/codemagic-mcp configure --mode read-only` restricts it to inspection, `--mode all` adds administrative writes, and `--toolset all` exposes the full API. Do not run those for me.
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
| `CODEMAGIC_MODE` | `builds` | `read-only`: GET operations only; `builds`: also start/cancel builds, delete caches, create artifact links; `all`: every implemented mutation |
| `CODEMAGIC_TIMEOUT_MS` | `30000` | Integer from 100 to 120000 |
| `CODEMAGIC_CONFIG_DIR` | `~/.config/codemagic-mcp` | Absolute directory holding `credentials.env` |

Set these through your client's environment configuration, or persist mode and toolset alongside the token:

```sh
npx -y @alikayhan/codemagic-mcp configure --mode read-only --toolset core
```

Press Enter at the token prompt to keep the saved token. Reconnect or restart the client after changing configuration.

Toolset and mode are independent. `core` + `read-only` is the safest setting for shared or untrusted agents. `all` + `read-only` exposes broader inspection without mutations. `all` + `all` also permits billing, membership, secret, deletion, invitation, and sharing operations. Disabled tools are absent from the MCP catalog and cannot be invoked by name. These are local exposure controls, not replacements for Codemagic's server-side permissions or your MCP client's approvals.

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

Start a build (available in the default `builds` mode):

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

The `Release` GitHub Actions workflow runs on `v*` tags. It checks that the tag matches `package.json`, runs checks and tests, builds the Codex plugin ZIP and the npm tarball, attaches them to a GitHub Release whose body is that version's changelog section, and publishes the package to npm with provenance. Publishing uses npm trusted publishing tied to this repository's `release.yml`, so no npm token is stored in GitHub. Build outputs (`dist/`, `release/`, `*.tgz`) are gitignored and never committed.

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

**npm tarball:** `npm pack` creates `alikayhan-codemagic-mcp-0.1.0.tgz`, the same artifact the release workflow publishes to npm. Install it with `npm install -g /path/to/alikayhan-codemagic-mcp-0.1.0.tgz` to try the published layout before cutting a release.

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
