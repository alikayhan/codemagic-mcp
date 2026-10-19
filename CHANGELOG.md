# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the major version is 0, minor releases may contain breaking changes to tool names, argument shapes, or configuration.

This is an unofficial community project with no affiliation to Codemagic or Nevercode Ltd.

## [Unreleased]

### Added

- The package is published to npm as `@alikayhan/codemagic-mcp`; the unscoped name is blocked by npm as too similar to an existing package. The release workflow publishes it with provenance through npm trusted publishing after creating the GitHub Release.
- Install instructions for Codex (`codex mcp add`), Pi (`pi mcp add`) and OpenCode (`opencode.json`).

### Changed

- `npx -y @alikayhan/codemagic-mcp` is now the documented default way to run the server in every client. A repository checkout and the release ZIP remain supported alternatives.
- When the server runs from an npm installation, `cm_setup_status` suggests `npx -y @alikayhan/codemagic-mcp configure` instead of a path inside the npm cache.
- The coding-agent setup prompt in README.md and INSTALL.md now registers the npm package instead of cloning the repository.

## [0.1.0] - 2026-10-19

Initial release.

### Added

- Stdio MCP server exposing the public Codemagic v3 API plus documented legacy routes, generated from a bundled OpenAPI contract (106 tools in total).
- `CODEMAGIC_TOOLSET` (`core` | `all`) and `CODEMAGIC_MODE` (`read-only` | `builds` | `all`) exposure controls. The default is `builds`, which covers starting and cancelling builds, deleting caches, and creating public artifact links; `read-only` is for inspection only and administrative writes require `all`. Disabled tools are absent from the catalog and cannot be invoked by name.
- Setup mode. When no API token is configured the server starts with a single read-only tool, `cm_setup_status`, that returns the local configure command, the credentials file location, and the steps to finish setup. No API tools are registered, so a half-configured server never looks ready. Server instructions and the `codemagic://capabilities` resource report `configured: false`.
- `configure` command that stores the API token privately in `~/.config/codemagic-mcp/credentials.env` without echoing it. Environment variables override saved values. `--help`, `--version`, and `configure` run without loading the MCP SDK or the operations contract.
- `codemagic://capabilities` MCP resource reporting enabled tools and contract provenance.
- Request hardening: fixed Codemagic origins only, no redirects, timeouts, 2 MiB response limit, no automatic retries for mutations, redaction of known secret fields and error bodies.
- Codex plugin packaging (`plugin.json`, `mcp.json`, local marketplace) built into a release ZIP with a single-file bundled server and third-party license notices.
- Setup instructions for Claude Code, generic `mcpServers` clients, Codex config, and the Codex plugin marketplace, plus a copy-pasteable prompt for coding agents.
- Test suite covering MCP discovery and calls, stdio startup, routing, validation, mode restrictions, pagination, error handling, credential storage, and manifest validity. `npm run verify` runs check, test, build, and test:plugin in one step; `prepack` and CI use it.
- Contributing guide, security policy, and GitHub issue and pull request templates.

[Unreleased]: https://github.com/alikayhan/codemagic-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/alikayhan/codemagic-mcp/releases/tag/v0.1.0
