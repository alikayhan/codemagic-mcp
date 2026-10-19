# Contributing

Thanks for your interest. This is an independent community project with no affiliation to Codemagic or Nevercode Ltd. Contributions of all sizes are welcome: bug reports, documentation fixes, new endpoint coverage, and tests.

## Before you start

- Check the [issue tracker](https://github.com/alikayhan/codemagic-mcp/issues) for existing reports. For anything beyond a small fix, open an issue first so the approach can be agreed before you invest time.
- Security problems go through [private vulnerability reporting](https://github.com/alikayhan/codemagic-mcp/security/advisories/new), not the public tracker. See [SECURITY.md](SECURITY.md).
- Never include a real Codemagic API token, team ID, app ID, or build output from a real account in an issue, test, fixture, or commit. Use obviously fake placeholders.

## Development setup

Requires Node.js 22 or newer.

```sh
git clone https://github.com/alikayhan/codemagic-mcp.git
cd codemagic-mcp
npm ci --ignore-scripts
npm run check      # validates all 106 schemas and regenerates docs/coverage.md
npm test           # unit and integration tests, no credentials needed
```

Source is plain JavaScript ESM in `src/`. There is no build step for the server itself; `node src/cli.js` runs it. `npm run build` produces the bundled Codex plugin ZIP in `release/` and `npm run test:plugin` verifies it from a clean temporary install.

To try your change against a real account, save your own token with `node src/cli.js configure` and connect any MCP client to `src/cli.js`. Tests must never depend on this.

## Project layout

| Path | Role |
| --- | --- |
| `src/cli.js` | Entry point: stdio server, `configure`, `--help`, `--version` |
| `src/server.js` | Builds the MCP server, registers tools and the capabilities resource, setup mode |
| `src/catalog.js` | Loads `schema/operations.json`, filters by toolset and mode, validates inputs |
| `src/client.js` | HTTP client: fixed origins, timeouts, size limits, redaction, error mapping |
| `src/credentials.js` | Private credentials file, hidden token prompt |
| `src/config.js` | Environment parsing and validation |
| `src/legacy.js` | Hand-written definitions for documented pre-v3 endpoints |
| `schema/operations.json` | Generated API contract; do not edit by hand |
| `scripts/update-schema.js` | Regenerates the contract from Codemagic's OpenAPI document |
| `scripts/build-plugin.js`, `scripts/verify-plugin.js` | Codex plugin packaging and verification |
| `test/` | Node test runner suites and fixtures |

## Changing API coverage

The tool catalog is generated, not hand-maintained. To pick up upstream API changes:

```sh
npm run schema:update                                    # downloads the current OpenAPI document
# or
node scripts/update-schema.js /path/to/openapi.json      # uses a local copy
npm run check && npm test
```

Review the diff carefully. Pay attention to new mutating operations and which toolset and mode they land in; anything that spends money, deletes data, or touches secrets belongs in `all` mode. Operations that read or revoke API tokens are excluded on purpose and must stay excluded. Undocumented browser endpoints are out of scope.

## Pull requests

- Branch from `main`. Keep each PR focused on one change.
- Add or update tests. Mutations need a test that proves they are absent in `read-only` mode.
- Add a line under `## [Unreleased]` in `CHANGELOG.md` using the Keep a Changelog categories (Added, Changed, Fixed, Removed, Security).
- Run `npm run check`, `npm test`, `npm run build`, and `npm run test:plugin` locally. CI runs the same on Linux, macOS, and Windows.
- Write the PR title as the commit message you want on `main`. PRs are squash-merged and the title becomes the commit subject; the body is discarded.
- Do not bump the version in a feature PR. Releases are cut separately; see "Versioning and releases" in the README.

## Style

Match the surrounding code. The project is dependency-light on purpose: the MCP SDK, Ajv, and nothing else at runtime. Propose a new runtime dependency in an issue before adding it. Keep `stdout` free of anything but MCP traffic while serving.

## License

By contributing you agree that your contribution is licensed under the MIT License in [LICENSE](LICENSE).
