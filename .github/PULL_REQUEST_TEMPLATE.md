<!-- The PR title becomes the squash commit subject on main. Write it as a commit message. -->

**What and why**

**Checklist**
- [ ] Tests added or updated; mutations have a test proving they are absent in `read-only` mode
- [ ] `CHANGELOG.md` has a line under `## [Unreleased]`
- [ ] `npm run check && npm test && npm run build && npm run test:plugin` pass locally
- [ ] No real tokens, team IDs, app IDs, or account data in code, tests, or fixtures
- [ ] Version not bumped (releases are cut separately)
