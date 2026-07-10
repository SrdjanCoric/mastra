---
'mastracode-web': patch
---

Fixed GitHub sandbox projects falling back to a host-local workspace. The SPA now persists the sandbox identity (githubProjectId, sandboxId, sandboxWorkdir, worktreePath) onto controller state at session init, so the server builds a sandbox-backed workspace instead of trying to mkdir the sandbox workdir (e.g. `/workspace`) on the server host.
