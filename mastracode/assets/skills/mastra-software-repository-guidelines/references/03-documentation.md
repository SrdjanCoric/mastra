## 3. Documentation

- [ ] **A substantive `README.md` exists.**
  - It explains what the project does and why it exists.
  - It identifies the main technologies and important repository areas.
  - It contains enough information to orient a new contributor.

- [ ] **The README includes setup and usage instructions.**
  - Prerequisites and supported runtime versions are listed.
  - Installation, configuration, development, testing, building, and running commands are documented.
  - Required external services are identified.
  - Common problems or troubleshooting steps are included when useful.

- [ ] **A `CONTRIBUTING.md` guide exists.**
  - It explains how to set up the project and submit changes.
  - It documents required checks, review expectations, branch strategy, and commit or pull-request conventions.
  - It describes how contributors should add tests and update documentation.

- [ ] **API documentation exists when the repository exposes an API.**
  - Public endpoints, operations, parameters, schemas, authentication, errors, and examples are documented.
  - The documentation is generated from source definitions or kept close enough to the code to remain current.
  - Public library or SDK interfaces are documented even when no network API exists.

- [ ] **A `CODEOWNERS` file exists.**
  - Important directories and high-risk areas have clear owners.
  - Ownership patterns match the current repository structure.
  - Referenced users or teams are valid and actively maintained.

- [ ] **Repository-specific AI coding instructions exist.**
  - A tool-supported context file explains how an AI coding agent should work in the repository.
  - It lists canonical setup, lint, format, type-check, test, and build commands.
  - It explains important architectural boundaries and prohibited changes.
  - It points to authoritative documentation instead of duplicating large amounts of it.

- [ ] **Architecture documentation exists.**
  - It explains the main components, their responsibilities, and how data or requests move through the system.
  - It documents important dependencies, integration boundaries, persistence, deployment, and operational constraints.
  - Diagrams are stored in a maintainable format when they add value.

- [ ] **Important architectural decisions are recorded.**
  - Significant decisions have short Architecture Decision Records or an equivalent format.
  - Each record captures context, decision, alternatives, consequences, and status.
  - Superseded decisions remain available and point to their replacements.

- [ ] **Documentation is easy for humans and coding agents to navigate.**
  - Documentation uses clear headings, precise terminology, and repository-relative links.
  - Commands are copyable and specify where they should be run.
  - File paths, entry points, generated-code boundaries, and validation steps are explicit.
  - Documentation does not rely on undocumented tribal knowledge.
  - Stale instructions are removed or marked clearly.
