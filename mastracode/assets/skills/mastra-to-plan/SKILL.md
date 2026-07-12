---
name: mastra-to-plan
description: Turn a source (PRD, decision doc, or the current conversation) into self-contained task files under plans/tasks/, including selectively applicable Software Repository Guidelines requirements, and append pointers to the project's single master plan. Use for planning features or tracer bullets. Pass --afk to plan for the autopilot orchestrator, tagging human-in-the-loop work only when strictly necessary.
---

# To Plan

## mastracode-remote managed behavior

This managed skill plans for the remote autopilot orchestrator. It must create tasks that are AFK by default, small enough for one branch/PR, and safe for `mastra-implement-next-task` to run unattended. It may use human checkpoint tags only when truly necessary: `[decision]`, `[verify]`, `[confirm-db]`, and `[confirm-security]`.

- `[decision]`: product, architecture, scope, UX, or behavior choice that cannot be inferred from the interview or repo.
- `[verify]`: human-only/manual verification that cannot be converted into a test, script, smoke check, log assertion, screenshot check, API call, or local state inspection.
- `[confirm-db]`: real, shared, persistent, destructive, or ambiguous DB/schema/data action. Local isolated test DB work is AFK.
- `[confirm-security]`: security-sensitive action that changes auth, permissions, session handling, secret handling, crypto, sandbox/CI boundary, dependency trust, or other trust boundaries.

Automated checks belong in AFK tasks or acceptance criteria, not `[verify]`. Prefer resolving `[decision]` items during `mastra-talk-it-through` before writing tasks.

Turn a source — a PRD, a decision doc, or just the current conversation — into **task files**
and register them in the project's **master plan**. Each task is one vertical slice: a feature
on its own branch, ending in one PR. There is exactly **one master plan per project**; this
skill appends to it and never creates a second one.

## Process

### 1. Confirm the source is in context

The source can be a PRD, a decision doc, or the conversation so far. If you're unsure what to
plan from, ask the user to point you at it.

### 2. Locate (or bootstrap) the master plan

Find the project's master plan via the **`AGENTS.md` "Active plan"** entry first, then `CLAUDE.md` if present.

- **It exists** → you will _append_ new task file(s) + pointer(s) to it. Do not recreate it. Do
  not rewrite its `## Architectural decisions` header unless a genuinely new durable decision
  emerged — if so, add/amend that one bullet only.
- **It does not exist** → bootstrap it (see the master-plan template), then register it in
  `AGENTS.md` as the Active plan and in `CLAUDE.md` when that file exists. On an **existing codebase**, derive the
  `## Architectural decisions` header from the _current_ architecture (explore the code first —
  step 3), and start the `## Tasks` list from the work being planned **now**. Do **not** backfill
  already-shipped work as done tasks — the plan begins from here, with no history; the existing
  code is the record of what came before.

### 3. Explore the codebase

If you have not already, explore to understand the current architecture, patterns, and
integration layers — so tasks are grounded and the architectural header stays accurate.

Invoke `mastra-software-repository-guidelines` in scope mode with the Planner Brief, repository state,
and proposed work. Do not rely on the interview's selection alone. Record which bundled references
were loaded, map currently applicable items to the task where they naturally become relevant, and
leave later-applicable items for later slices. Do not copy the full guideline set into the plan.

### 4. Draft vertical slices

Break the source into **tracer bullet** tasks. Each cuts through ALL integration layers
end-to-end, not a horizontal slice of one layer.

<vertical-slice-rules>
- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- **Make each slice the SMALLEST it can be while staying a complete vertical slice.** The floor: it
  must still cut through all layers and be demoable on its own. Stay at that floor — every extra
  behavior folded in costs more to build and review.
- Split test: if a slice contains two independently demoable behaviors, split it into two slices
  ordered forward-only. Default to splitting.
- Each task IS a feature on its own branch. Name it when drafting: `feature/<kebab-slug>`
- Sizing test: the smallest demoable change mergeable without waiting on later tasks. One PR is the
  ceiling, not the target.
- Order tasks **forward-first**: edges normally point to lower ordinals, so the plan reads
  top-to-bottom as a sensible default sequence. But **eligibility — deps all `[x]` (merged), not list
  position — is the authority on what's runnable**: the back-patch rule below can add a backward edge
  (an existing task depending on a newer, higher-ordinal one), so do not rely on "the first unfinished
  pointer is always runnable." Ordinals are stable IDs, not a runnability guarantee.
- Do NOT include specific file names or details likely to change as later tasks are built
- DO include durable decisions: route paths, schema shapes, data model names
</vertical-slice-rules>

**Record dependencies.** After ordering, give each task a `Depends on` set: the **minimal** list of
direct predecessors whose output it actually builds on — not "everything before it." A task that
needs nothing prior is `none`. Edges normally point to lower ordinals, so the plan reads
top-to-bottom as a sensible default order. These edges are the dependency map: they let
`mastra-implement-next-task` find the first task that is not blocked by unfinished dependencies, and
they — not list position — decide what's runnable.

Two more edge rules:

- **Serialize shared-artifact conflicts.** If two tasks both modify the same _durable_ shared
  artifact — a prompt, a rubric, a shared module named in the architectural header — they would
  collide badly if built in parallel. Add an `after` edge between them so they run sequentially, and
  annotate the reason in the dependent's field: `Depends on: 0031 (shared: director-prompt)`. (The
  pointer suffix stays the plain `(after 0031)`.) This only applies to durable artifacts you can name
  at planning time; do not invent volatile file names.
- **Back-patch new prerequisites.** When a task you're adding now becomes a prerequisite of an
  already-listed _unfinished_ task, update that existing task's `Depends on` field **and** its pointer
  `(after …)` suffix. This creates a **backward edge** — the existing lower-ordinal task now depends
  on the new higher one. That is allowed: eligibility, not ordinal order, governs selection, and the
  engine simply leaves the existing task blocked until the new prerequisite merges. Do **not** renumber
  to keep edges forward — ordinals are stable IDs (branches, `done/` files, links reference them).
  Appending without back-patching silently rots the graph.

For a multi-task source, **present the proposed edges to the user and confirm before writing** — per
the project's "don't assume" rule, the graph is not inferred silently.

From a fat PRD this yields several tasks; from a decision doc or a chat it's usually **one**.

### 5. Break each task into AFK and human-in-the-loop work

_(Under `--afk`, tighten this hard — see **AFK mode** below.)_

- **AFK tasks** — everything the agent can implement _and verify_ autonomously: code, schema,
  migrations, tests, automated checks. The **default bucket**, implemented via the **mastra-tdd** skill.
  Phrase so the test comes first where it makes sense.
- **Human-in-the-loop tasks** — only true checkpoint cases:
  - `[decision]` — needs mutual agreement before/while building. Resolved via **mastra-talk-it-through**.
  - `[verify]` — genuinely cannot be verified automatically. Each must state _why_.
  - `[confirm-db]` — real/shared/destructive/ambiguous DB, schema, or data action. Local isolated test DB work is AFK.
  - `[confirm-security]` — security-sensitive action involving auth, permissions, sessions, secrets, sandbox/CI, dependency trust, or another trust boundary.

<afk-bias-rule>
Bias hard toward AFK. A task goes human-in-the-loop only if it truly cannot be done or verified
autonomously. If a verification can become a test, script, or automated check — make it AFK. A
task with zero human-in-the-loop items is a good task. Don't manufacture decisions the source or
architectural header already answers.
</afk-bias-rule>

### 6. Write the task file(s)

For each slice, write a **self-contained** task file. The next ordinal is `max(ordinal across
plans/tasks/ and plans/tasks/done/) + 1`, zero-padded to four digits. Filename:
`plans/tasks/NNNN-<kebab-slug>.md`.

Self-contained means the file carries everything the implementer needs — the relevant user
stories and acceptance criteria distilled from the source — so implementation never has to reach
back to the PRD. Reference durable decisions by pointing at the master plan header or a decision
doc; don't duplicate them. For Software Repository Guidelines, name the relevant bundled reference
files and include only the applicable requirements and proof; the implementer invokes the skill to
load their full wording.

<task-file-template>
# Task NNNN: <Title>

**Branch**: `feature/<kebab-slug>`
**Depends on**: <comma-separated ordinals of direct predecessors, or `none`>
**Source**: <PRD / decision doc / "talk-it-through <date>"> · **User stories**: <list>

## What to build

A concise description of this vertical slice — the end-to-end behavior, not layer-by-layer
implementation.

## Software Repository Guidelines

**Applicable references**: <only the bundled reference files relevant to this task>

- [ ] <applicable requirement and its expected repository/command/CI proof>

## AFK tasks

- [ ] Task 1
- [ ] Task 2

## Human-in-the-loop tasks

- [ ] [decision] <question needing mutual agreement> (mastra-talk-it-through)
- [ ] [verify] <what to check manually> — <why it can't be automated>
- [ ] [confirm-db] <real/shared/destructive/ambiguous DB action needing confirmation>
- [ ] [confirm-security] <security-sensitive action needing confirmation>

(Omit this section if the task has none — that's a good task.)

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
      </task-file-template>

### 7. Append the pointer(s)

Add one line per new task to the master plan's `## Tasks` list, in execution order. Mirror the task's
`Depends on` onto the pointer as an `(after …)` suffix so the plan itself is the readable dependency
map; omit the suffix when `Depends on` is `none`:

```
- [ ] NNNN · <Title> (after NNNN[, NNNN]) → tasks/NNNN-<kebab-slug>.md
- [ ] NNNN · <Title> → tasks/NNNN-<kebab-slug>.md          # no prerequisites
```

Tell the user which task files you created and where they sit in the plan order.

---

## AFK mode (`--afk`)

`--afk` plans for the autopilot orchestrator, which builds each task with
`mastra-implement-next-task` and stays AFK on the happy path through review, PR creation, merge, and
`mastra-sync-main` closeout. It changes only **step 5's bucketing**: bias to AFK even harder than the
standard `afk-bias-rule`. A task earns `[decision]`, `[verify]`, `[confirm-db]`, or
`[confirm-security]` only when it falls in the **must-be-human set**; everything else is forced AFK.

The must-be-human set — the only reasons an AFK run may wait for a person:

- **Unsettled product/architecture choice** — use `[decision]`, but prefer resolving it during
  `mastra-talk-it-through` before writing tasks.
- **Human-only verification** — use `[verify]` only when no test, script, smoke check, log assertion,
  screenshot check, API call, or local state inspection can prove the result.
- **Real/shared/destructive/ambiguous data work** — use `[confirm-db]`. Local isolated test DB work is AFK.
- **Security-sensitive trust boundary** — use `[confirm-security]` for auth, permissions, sessions,
  secrets, crypto, sandbox/CI boundary, dependency trust, or similar security-sensitive work.
- **Money or irreversible external side effects** — use the narrowest matching checkpoint tag and
  state the risk clearly.

Two hard rules under `--afk`:

- **Resolve decisions early.** A `[decision]` survives into the plan only if it truly cannot be
  settled now — prefer to settle it here and record it in the architectural header or task file.
- **A `[verify]` must name why automation cannot prove it.** If a check can become a test, script, or
  automated eval, it is AFK. No "I'd feel better eyeballing it" exceptions.

---

## Master-plan template (bootstrap only — step 2)

<master-plan-template>
# Plan: <Project Name>

> Source PRD: <brief identifier or link>

This is the project's master plan: a durable architectural header plus an ordered list of task
pointers. Each task is one feature on its own branch, ending in a PR. Task bodies live in
`plans/tasks/`; finished tasks move to `plans/tasks/done/`.

## Workflow

- New work is added by the `mastra-to-plan` skill: a self-contained task file under
  `plans/tasks/NNNN-<slug>.md` plus a pointer below. It appends; it never creates a second plan.
- `mastra-implement-next-task` takes the first eligible pointer (or an explicit task argument), builds it
  on its branch, resolves only true checkpoint tags through Telegram, runs automatic `mastra-task-review`
  with two fix retries, then invokes `mastra-create-pr` to open/check/merge the PR and `mastra-sync-main`
  to close out the task.
- A pointer has four states: `[ ]` todo · `[~]` in progress (claimed) · `[>]` PR created/merged and
  awaiting local sync closeout · `[x]` merged to local `main`. `mastra-sync-main` flips `[>]→[x]` and
  moves the task file to `tasks/done/` once the PR merge is pulled onto `main`.
- Pointers carry their direct prerequisites as an `(after NNNN, …)` suffix (none = no suffix). A
  task is selectable only once every ordinal in its `(after …)` list is **`[x]` (merged)** — so a
  dependent never branches off `main` before its prerequisite is actually on `main`.

## Architectural decisions

Durable decisions that apply across all tasks:

- **Routes**: ...
- **Schema**: ...
- **Key models**: ...
- (add/remove sections as appropriate)

---

## Tasks

- [ ] 0001 · <Title> → tasks/0001-<slug>.md
- [ ] 0002 · <Title> (after 0001) → tasks/0002-<slug>.md
      </master-plan-template>
