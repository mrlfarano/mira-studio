---
name: require-changelog-update
enabled: true
event: stop
pattern: .*
action: warn
---

**Before completing this session, verify:**

- [ ] **CHANGELOG.md** has been updated with all notable changes made in this session
- [ ] Changes are categorized correctly (Added, Changed, Deprecated, Removed, Fixed, Security)
- [ ] Version tag is current — if this work warrants a version bump, update the tag

**Format reminder:** Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

Run `git tag` to check the current version. If bumping, use `git tag -a vX.Y.Z -m "description"`.
