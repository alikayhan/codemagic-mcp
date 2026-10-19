# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the major version is 0, minor releases may contain breaking changes to tool names, argument shapes, or configuration.

This is an unofficial community project with no affiliation to Codemagic or Nevercode Ltd.

## [Unreleased]

### Added

- Contributing guide, security policy, and GitHub issue and pull request templates for the public repository.
- Setup mode. When no API token is configured the server starts with a single read-only tool, `cm_setup_status`, that returns the local configure command, the credentials file location, and the steps to finish setup. Server instructions and the `codemagic://capabilities` resource report `configured: false`.

### Changed

- Default `CODEMAGIC_MODE` is now `builds` instead of `read-only`, and `builds` mode now also covers deleting caches and creating public artifact links in addition to starting and cancelling builds. The everyday developer loop works out of the box; set `CODEMAGIC_MODE=read-only` for inspection only. Administrative writes still require `all`.
- Project is named `codemagic-mcp` everywhere, including the license copyright line and the Codex plugin display names, so "Codemagic" alone only ever refers to the trademark or the API.
- Without a token the API tools are no longer registered, so a half-configured server can no longer look ready. Previously all tools were listed and each call failed with a hint.
- `npm run verify` runs check, test, build, and test:plugin in one step; `prepack` and CI use it. CI now runs on pushes to `main` and on pull requests instead of on every push, so a PR commit no longer runs the matrix twice.
- `--help`, `--version`, and `configure` no longer load the MCP SDK or the operations contract.

## [0.1.0] - 2026-10-19

Initial release.

### Added

- Stdio MCP server exposing the public Codemagic v3 API plus documented legacy routes, generated from a bundled OpenAPI contract (106 tools in total).
- `CODEMAGIC_TOOLSET` (`core` | `all`) and `CODEMAGIC_MODE` (`read-only` | `builds` | `all`) exposure controls. Disabled tools are absent from the catalog.
- `configure` command that stores the API token privately in `~/.config/codemagic-mcp/credentials.env` without echoing it. Environment variables override saved values.
- `codemagic://capabilities` MCP resource reporting enabled tools and contract provenance.
- Request hardening: fixed Codemagic origins only, no redirects, timeouts, 2 MiB response limit, no automatic retries for mutations, redaction of known secret fields and error bodies.
- Codex plugin packaging (`plugin.json`, `mcp.json`, local marketplace) built into a release ZIP with a single-file bundled server and third-party license notices.
- Setup instructions for Claude Code, generic `mcpServers` clients, Codex config, and the Codex plugin marketplace, plus a copy-pasteable prompt for coding agents.
- Test suite covering MCP discovery and calls, stdio startup, routing, validation, mode restrictions, pagination, error handling, credential storage, and manifest validity.

[Unreleased]: https://github.com/alikayhan/codemagic-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/alikayhan/codemagic-mcp/releases/tag/v0.1.0
