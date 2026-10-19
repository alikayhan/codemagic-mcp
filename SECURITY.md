# Security policy

This is an independent community project, not a Codemagic product. Issues in Codemagic's own service or API should be reported to Codemagic directly.

## Reporting a vulnerability

Please do not open a public issue for security problems. Use [GitHub's private vulnerability reporting](https://github.com/alikayhan/codemagic-mcp/security/advisories/new) for this repository. Include the affected version, steps to reproduce, and the impact you believe it has. You should receive an acknowledgement within a week. Fixes are released as patch versions with a `Security` entry in the changelog, and the advisory is published once a fix is available.

Never include a real API token in a report. If a token was exposed while investigating, revoke it in Codemagic first.

## Supported versions

Only the latest release receives fixes. The project is pre-1.0; upgrade to the newest version before reporting.

## Scope

In scope:

- Token leakage: the token appearing in tool output, logs, error messages, URLs, or files other than the private credentials file.
- Requests reaching any origin other than Codemagic's documented API hosts, including via redirects or user-controlled URL parts.
- Operations being callable in a mode or toolset that is supposed to exclude them.
- Credentials file handling: permission checks, symlink handling, atomic replacement.
- Prompt-injection vectors where API response content is presented in a way that an agent could mistake for instructions.

Out of scope:

- Vulnerabilities in Codemagic's service or API.
- Issues that require an attacker to already control the machine or the user account running the server.
- The MCP client's own storage of tool arguments and results in its history.
- Rate limiting or abuse of your own Codemagic account through tools you enabled.

## How token handling is designed

- The token is read from the environment or from a private file (`~/.config/codemagic-mcp/credentials.env`, directory 0700, file 0600, owner-checked, symlinks rejected). It is never accepted as a command-line argument or through piped stdin, and `.env` files in the working directory are ignored.
- Without a token the server runs in setup mode and exposes no API tools.
- Requests go only to fixed Codemagic origins. Redirects are not followed. Response size and request time are bounded.
- Error bodies are discarded. Known credential fields and exact echoes of the token are redacted from responses. This is best-effort, not a general secret scanner.
- Endpoints that read or revoke API tokens are excluded from the catalog.
- Mutating tools are absent from the catalog unless `CODEMAGIC_MODE` enables them; they cannot be invoked by name.

These are local controls. They do not replace Codemagic's server-side permissions or your MCP client's approval prompts.
