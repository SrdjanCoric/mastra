## 7. Security

- [ ] **A `LICENSE` file exists.**
  - The license matches the intended use and distribution model.
  - Package metadata and documentation use the same license identifier.
  - Third-party notices are included when required.

- [ ] **Automated security scanning runs in CI.**
  - Source code is checked with static security analysis where appropriate.
  - Dependencies are checked for known vulnerabilities.
  - Containers and infrastructure definitions are scanned when present.
  - High-severity findings fail CI or enter a documented remediation process.

- [ ] **Secret detection is configured.**
  - Commits and pull requests are scanned for credentials, keys, tokens, and other sensitive values.
  - Secret detection runs in pre-commit hooks, CI, or both.
  - False-positive exclusions are narrow and documented.
  - Any committed secret is rotated; deleting it from the latest commit is not considered sufficient.

- [ ] **A `SECURITY.md` policy exists.**
  - It explains how to report vulnerabilities privately.
  - It identifies supported versions and expected response behavior.
  - It does not require reporters to disclose vulnerabilities publicly.

- [ ] **Dependency update automation is configured.**
  - Automated pull requests are created for dependency and security updates.
  - Updates are grouped or scheduled to avoid excessive noise.
  - CI validates update pull requests.
  - Security updates are prioritized appropriately.
