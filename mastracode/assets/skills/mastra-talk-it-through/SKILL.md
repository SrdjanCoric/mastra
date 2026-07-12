---
name: mastra-talk-it-through
description: Interview the user deeply about a plan, design, or app idea before planning. Inspect the repo, selectively invoke the Software Repository Guidelines, build a complete app model, map workflows and edge cases, ask one question at a time with a recommendation, and stop only when enough shared understanding exists for safe autonomous planning.
---

# Mastra Talk It Through

Use this skill before `mastra-to-plan` when the user wants to create, extend, or reshape an app/workflow. Your job is not to ask a few broad questions. Your job is to produce a shared app model detailed enough that `mastra-to-plan` can create safe, dependency-aware AFK tasks without inventing product decisions later.

Once planning starts, the build loop treats the plan as authoritative. Therefore this skill must front-load discovery. If a question would materially affect data shape, task order, permissions, UX, external integrations, safety, or acceptance criteria, resolve it here before planning.

## Operating rules

- Ask one question at a time and wait for the answer.
- For each question, give your recommended answer or default first, then ask the user to confirm or correct it.
- If the answer can be found by reading the repository, inspect the repository instead of asking.
- Do not move to planning after a shallow interview. Three broad questions is almost never enough for a new app.
- Do not ask implementation details before the product behavior, actors, data, risks, and constraints are clear.
- Keep unresolved human decisions explicit. Use `[decision]`, `[verify]`, `[confirm-db]`, and `[confirm-security]` only for genuinely human-only checkpoints.
- Do not write task files. `mastra-to-plan` owns task creation after this interview is complete.
- Do not let user fatigue shorten the interview below safe planning depth. If the user wants speed, recommend the smallest safe v1 scope instead of skipping discovery.
- Prefer concrete examples over abstract agreement. Ask the user to confirm example records, screens, command output, notifications, and failure messages when those details matter.

## Required first gate: greenfield vs existing app

Before product discovery, decide which mode applies and say it out loud in the interview recap.

### Greenfield mode

Use this when the repository is empty/new or the user is starting a new product from scratch. In greenfield mode, build the app model from the user's intent and any starter constraints in the repo. Spend more time on product promise, domain model, first workflows, state shape, and v1 boundaries because there is no existing implementation to constrain the plan.

### Existing-app extension mode

Use this when the repository already has an app, plan, tests, code, docs, or persisted product decisions. In existing-app extension mode, do **not** start by asking only about the new feature. First inspect and summarize the current app:

- what the app currently does
- current actors/roles and permissions
- current domain nouns and lifecycle states
- current workflows and entry points
- current data/state/storage model
- current external dependencies
- current tests, release flow, and known constraints
- current active plan/tasks, if any
- likely seams where the new feature should attach

Then interview about the requested feature as a change to that existing system. Capture both the **current-state model** and the **target-state delta**. Call out compatibility, migration, regression, backwards-compatibility, and “do not break existing behavior” requirements explicitly.

Existing-app planning must answer: “What exists now?”, “What exactly changes?”, “What must keep working?”, and “How do we prove we did not regress it?”

## Required working artifact: app model

Build and maintain an app model in your own working notes during the interview. Before handing off to planning, summarize it in chat. The app model must include these sections:

1. **Project mode** — greenfield or existing-app extension, with the reason.
2. **Current-state model** — mandatory for existing-app extension: current product behavior, architecture, workflows, data/state, dependencies, tests, and active plan state.
3. **Target-state delta** — mandatory for existing-app extension: what changes, what stays unchanged, compatibility/migration requirements, and regression risks.
4. **Product promise** — who it is for, what job it does, what pain it removes, and what a successful first use looks like.
5. **Glossary/domain model** — core nouns, what each noun means, ownership rules, lifecycle states, and relationships between entities.
6. **Actors and permissions** — humans, bots, services, background jobs, external systems, and exactly what each can view/start/change/delete/approve/retry.
7. **Scenario inventory** — every important user-facing scenario, not just the happy path.
8. **State/data model** — persisted data, derived data, temporary data, secrets, config, logs, caches, file locations, retention, cleanup, migration, and corruption recovery.
9. **Workflow map** — first-time setup, normal path, repeat path, edit path, cancellation/stop, resume/retry, failure recovery, cleanup/export/uninstall, and admin/support paths when relevant.
10. **External dependency table** — every CLI/API/service/package/auth/database/filesystem dependency, what data crosses it, and what happens when it is missing, unauthorized, slow, rate-limited, malformed, partially successful, or offline.
11. **UX/communication contract** — command/API entry points, screens/prompts/messages, default vs verbose output, confirmations, acknowledgements, status wording, error wording, remote notifications, and non-TTY behavior.
12. **Safety and abuse cases** — destructive actions, security-sensitive actions, permission boundaries, prompt-injection/input trust, secret handling, concurrent usage, repeated commands, and user-changing-their-mind cases.
13. **Acceptance/proof model** — automated tests, smoke tests, manual verification, package/release checks, and user-visible success criteria.
14. **Software Repository Guidelines scope** — references loaded, currently relevant items, existing gaps, requirements for this work, and items that become relevant only in later tasks.

Invoke `mastra-software-repository-guidelines` in scope mode while building the app model. Do not rely
on the caller or a previous session having invoked it. Load only the references selected for the
project and feature surface; do not load the complete guideline set during an ordinary interview.

If the project already exists, inspect docs/code/tests/config before or during the app model. Reconcile the desired behavior with what the code already does. Call out mismatches explicitly.

## Required discovery pass

Before declaring the interview complete, cover each area below. You may skip an area only when it is clearly irrelevant and you say why in the recap.

### 1. Product frame

Understand the user/persona, job-to-be-done, first successful end-to-end scenario, v1 non-goals, and what must be true before the app is useful.

Do not accept vague goals like “an expense tracker” or “a workflow app” as enough. Drive toward concrete behavior:

- What problem happens today?
- What does the user do first?
- What does the app do next?
- What output proves it worked?
- What is deliberately out of scope for v1?

### 2. Domain model and vocabulary

Name the durable nouns in the product and define them. For each important entity, clarify:

- required fields and optional fields
- owner/source of truth
- lifecycle states
- valid transitions
- deletion/archive behavior
- uniqueness and duplicate handling
- relationships to other entities
- what happens when data is missing, stale, contradictory, or imported twice

This section is mandatory for new apps. Planning without a domain model causes shallow tasks and late redesign.

### 3. Actors and permissions

Identify human roles, automated actors, who can start/stop/approve/reject/edit/delete/publish/retry work, authorization boundaries, and unauthorized-action behavior.

For each role, ask what they can do in the happy path and what they must be blocked from doing. Include background jobs, bots, scheduled tasks, webhooks, and external services as actors when they mutate state.

### 4. Scenario inventory

Create a scenario inventory before planning. Cover at least:

- first-time setup
- first successful happy path
- second/repeat use
- editing/correcting previous work
- cancellation/stop
- resume/retry after interruption
- duplicate command/action
- empty state
- partially configured state
- stale/deleted external resource
- invalid input
- permission denied
- dependency unavailable/rate-limited
- data migration or upgrade
- cleanup/export/uninstall if relevant

For each scenario, capture trigger, preconditions, user-visible behavior, state changes, notifications/output, and acceptance proof.

### 5. Core workflows

Walk through first-time setup, normal happy path, repeat/rerun path, cancellation/stop path, resume/retry path, failure/recovery path, and cleanup/uninstall/export when relevant. For each workflow, ask what the user sees locally, remotely, and in persisted state.

Do not stop at “the user clicks save” or “the command runs.” Trace the workflow until persisted state and user-visible confirmation are both clear.

### 6. Data and state lifecycle

Clarify what data is stored, where it is stored, which fields are secrets, retention/cleanup expectations, migration/upgrade behavior, corruption/recovery behavior, and idempotency on rerun.

Include state ownership. For each persisted file/table/record/config value, know whether the app owns it, mirrors it, derives it, or only reads it. This matters for repair and migration tasks.

### 7. External dependencies

List every external dependency and what to do when it is missing, slow, malformed, unauthorized, rate-limited, offline, or returns surprising data. Include CLIs, APIs, background services, package registries, auth providers, databases, queues, webhooks, model providers, and file systems.

Dependencies must have failure policy, not just names. If the failure policy is unknown, ask.

### 8. Edge cases and abuse cases

Probe empty state, duplicate state, stale state, partial setup, dirty working trees, deleted/renamed external resources, concurrent runs, repeated commands, restarts during waits, large outputs/messages, invalid input, permission failures, security-sensitive actions, destructive actions, and the user changing their mind mid-flow.

Use a matrix: scenario × failure mode × expected behavior. Do not rely on a generic “handle errors gracefully” statement.

### 9. UX and communication

Decide command/API entry points, default vs verbose output, notifications, immediate acknowledgements, real-answer waits, wording that prevents user mistakes, and non-TTY or remote-only behavior.

For prompts and remote interactions, settle exact choice sets where ambiguity would cause mistakes. For status output, decide what is short by default and what details require verbose mode.

### 10. Implementation boundaries

Set what must be AFK, what must ask the user, what requires manual verification, what is deferred, what should not be refactored, and what codebase conventions/docs/tests must be followed.

Clarify whether the build should change existing architecture, add a new module, patch a dependency, migrate data, alter release packaging, or only change behavior at a seam.

### 11. Acceptance and proof

Define user-observable acceptance criteria, automated regression tests for risky paths, manual smoke tests for external integrations, release/package checks, and what evidence belongs in the task log or PR.

Acceptance criteria must map to the scenario inventory. If a scenario matters to the user, it needs proof.

### 12. Software Repository Guidelines

Use the scope result from `mastra-software-repository-guidelines` to decide which repository concerns
must influence the product plan now and which can be assigned to later work. Discuss only genuine
applicability, architecture, scope, or behavior decisions. Do not ask the user to confirm unconditional
checklist wording, and do not treat every future guideline as a v1 blocker.

## Question strategy

Run the interview in passes. Do not try to ask a giant multi-part question.

1. **Mode pass** — determine greenfield vs existing-app extension. For existing apps, inspect and summarize current state before discussing the new feature.
2. **Frame pass** — establish product promise, user, v1 boundary, and first success path.
3. **Model pass** — define nouns, states, relationships, and permissions. For existing apps, separate current model from target delta.
4. **Scenario pass** — enumerate happy, repeat, stopped/resumed, failed, duplicate, empty, partial, and cleanup scenarios.
5. **Failure pass** — walk dependency failures, bad input, concurrency, stale state, unauthorized actions, and destructive/security-sensitive paths.
6. **Proof pass** — decide automated tests, smoke tests, release checks, manual verification, and regression proof for existing behavior.
7. **Recap pass** — present the planner brief and ask the user to correct it before planning.

At each pass, prefer one high-leverage question with a recommended answer. Example pattern:

> Recommendation: v1 treats imported expenses as immutable raw records and stores user edits as corrections, not overwrites. That gives us auditability and simpler rollback. Should v1 use that model, or should edits overwrite the original record?

## Planning handoff contract

Before returning to `mastra-workflow`, produce a **Planner Brief** with these headings:

- Project mode: greenfield or existing-app extension
- Current-state model, if existing app
- Target-state delta, if existing app
- Product goal
- V1 scope and non-goals
- Domain glossary and entity lifecycle
- Actors and permissions
- Scenario inventory
- Workflow details
- Data/state/storage decisions
- External dependencies and failure policies
- UX/communication decisions
- Safety/security/destructive-action rules
- Human checkpoints
- Acceptance/proof requirements, including regression proof for existing apps
- Software Repository Guidelines: references loaded, existing gaps, requirements for this work, and later-applicable items
- Open questions deferred from v1

`mastra-to-plan` must be able to plan from this brief without asking broad product-discovery questions. If the brief still contains unresolved product behavior that affects task design, keep interviewing instead of returning.

## Completion gate

Do not return until all are true:

- You classified the project as greenfield or existing-app extension and explained why.
- You inspected existing docs/code/tests/config when the project is not empty.
- For existing-app extension, you summarized current behavior, current state/data model, current workflows, active plan state, and target-state delta before planning the feature.
- You have a coverage recap listing which discovery areas were covered and which were explicitly irrelevant.
- You have a domain glossary with lifecycle states for core entities.
- You have a scenario inventory that includes happy path, repeat use, stop/cancel, resume/retry, empty state, partial setup/state, invalid input, dependency failure, and cleanup/export/uninstall when relevant.
- You have an edge-case/failure matrix for the highest-risk scenarios.
- Every durable product decision is stated clearly.
- Every unresolved point is tagged as a human checkpoint or deferred non-goal.
- You can explain the first end-to-end success path, main failure paths, highest-risk edge cases, and state changes.
- Acceptance criteria map back to scenarios and include proof.
- `mastra-software-repository-guidelines` was invoked in scope mode, and the Planner Brief records the references loaded and their disposition.
- The user has confirmed the Planner Brief or corrected it.

When complete, return the Planner Brief. Keep it concise enough to read, but detailed enough that planning can begin without rediscovering the app.
