---
name: mastra-task-review
description: Review a completed task branch as an automatic blocking gate for mastra-implement-next-task. Fan out independent Standards, Spec, Bug, and conditional Security lenses, return structured findings only, and never write review files or ask the user directly.
---

# Mastra Task Review

Run an automatic review gate over the task branch. This skill **reviews only**. It does not fix code, write `reviews/` output, request human input, create a PR, or decide whether to continue. `mastra-implement-next-task` owns the retry/fix/escalation loop around this reviewer.

## Managed workflow contract

When called by `mastra-implement-next-task`:

- Run unattended.
- Diff the task branch against the requested base, normally `main`.
- Review against the requested spec, normally the verbatim task file plus referenced decision docs.
- Return a structured Finding array in context.
- Write no files.
- Do not synthesize prose through `mastra-write-well`.
- Do not ask the user anything.
- Preserve every `security` finding exactly; do not down-rank or drop it to keep the loop moving.

Retry policy belongs to the caller: `mastra-implement-next-task` runs this review after implementation, fixes safe blocker/major findings, and reruns the review up to **two retry rounds**. If findings still block after the second retry, the caller invokes `mastra-diagnose` with the review findings, attempted fixes, failing checks, and relevant diff.

## Inputs

Accept these inputs from the caller:

- `base`: fixed diff base. Default is `main` only when the caller did not pass a base.
- `spec`: path or verbatim spec/task text. In workflow mode this must be supplied by the caller.
- `attempt`: optional review attempt label, such as `initial`, `retry-1`, or `retry-2`; include it in returned metadata if available.

If invoked standalone without enough inputs, resolve what you can from the repo, but still keep the same output rule: structured findings only, no review file.

## Process

### 1. Resolve review material

Capture:

- `git diff <base>...HEAD`
- `git log <base>..HEAD --oneline`
- the supplied spec/task text
- repo standards docs when present: `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CONTEXT.md`, ADRs, style docs, test conventions, lint/test configs

If the diff is empty, return one blocker finding explaining that there is no task diff to review.

### 2. Decide whether Security runs

Scan the diff paths and content for security-relevant surface:

- auth/session/permissions
- secrets/tokens/keys
- input parsing/deserialization
- shell/subprocess/SQL/file/network I/O
- package/dependency/trust boundary changes
- prompt/tool/sandbox/CI boundary changes
- crypto or privacy-sensitive data handling

If any signal appears, include the Security lens. If no signal appears, skip Security and return a metadata note that Security was skipped because no security-relevant surface was touched. A skip is not a pass.

### 3. Fan out independent lenses

Use separate review contexts/agents for each active lens so one judgment does not contaminate another.

- **Standards**: documented conventions and test quality.
- **Spec**: faithfulness to the supplied task/spec; missing requirements and scope creep.
- **Bug**: correctness, edge cases, race conditions, lifecycle errors, error handling, simplification.
- **Security**: only when selected in step 2.

Each lens must return only Finding objects. No prose reports.

### 4. Dedupe and return

Merge exact duplicates while preserving all axes that reported the issue. Do not silently drop findings. Return the final Finding array plus minimal metadata:

- base
- attempt, if supplied
- security lens status: `run` or `skipped-no-security-surface`
- counts by axis/severity

## Finding schema

Every finding must use this shape:

```json
{
  "axis": "standards | spec | bug | security",
  "severity": "blocker | major | minor | nit",
  "location": "path/to/file.ts:42",
  "claim": "One sentence describing what is wrong.",
  "evidence": "Concrete citation: spec line, standards rule, diff line, failing scenario, or command output.",
  "suggestion": "Optional one-line fix direction."
}
```

Rules:

- `evidence` is mandatory.
- `blocker` means must fix before PR/merge.
- `major` should be fixed before PR unless there is an explicit reason not to.
- `minor` is a judgment call.
- `nit` is cosmetic and must never block progress alone.
- Security findings are never auto-dismissed or downgraded.

## Lens briefs

### Standards

Read the standards docs, then the diff. Report violations of documented rules and meaningful test-quality issues. Skip formatting/lint issues that tooling already enforces. Return only findings with `axis: "standards"`.

### Spec

Read the supplied task/spec, then the diff. Report missing requirements, partially implemented requirements, wrong behavior, and scope creep. Quote or cite the specific spec text in `evidence`. Return only findings with `axis: "spec"`.

### Bug

Review the diff for concrete correctness failures. Prefer findings backed by an executable scenario, failing command, race/lifecycle path, or edge case. Return only findings with `axis: "bug"`.

### Security

Review only when selected. Report concrete trust-boundary, authz/authn, secret-handling, injection, sandbox, dependency, or data-exposure issues. Return only findings with `axis: "security"`.
