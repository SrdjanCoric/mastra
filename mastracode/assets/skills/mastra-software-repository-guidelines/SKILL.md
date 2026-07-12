---
name: mastra-software-repository-guidelines
description: Selectively apply the shared Software Repository Guidelines while creating or improving a repository. Load only relevant guideline sections during discovery, planning, implementation, and review; run the complete guideline set before the workflow declares the product finished.
---

# Mastra Software Repository Guidelines

Use the bundled guidelines as a cumulative repository standard. They describe what should be considered while the product is built and what must be assessed before the repository is considered finished. They do not require every item during every task.

## Managed workflow contract

`mastra-workflow`, `mastra-talk-it-through`, `mastra-to-plan`, `mastra-implement-next-task`, and `mastra-task-review` must invoke this skill at the stages defined in their own contracts. Do not rely on an earlier agent having invoked it.

This skill must:

1. inspect the current stage, task, repository, and changed capabilities,
2. load `references/00-overview.md`,
3. load only the relevant numbered reference files unless a full final assessment was requested,
4. report every reference file loaded,
5. distinguish applicable, complete, incomplete, not-applicable, and deferred items,
6. require repository evidence before calling an item complete, and
7. load every reference for the final workflow assessment.

## Reference index

- `references/00-overview.md` — purpose and completion rule
- `references/01-style-and-code-quality.md`
- `references/02-testing.md`
- `references/03-documentation.md`
- `references/04-developer-environment.md`
- `references/05-ci-cd.md`
- `references/06-code-health-and-maintainability.md`
- `references/07-security.md`
- `references/08-recommended-canonical-commands.md`
- `references/09-expected-repository-files.md`
- `references/10-definition-of-done.md`

Select references from the repository or task surface. For example, testing work requires the testing reference; CI work requires the CI/CD reference; documentation work requires the documentation reference. Load multiple references when the scope crosses sections. Do not load every file merely because it exists.

## Modes

### Scope

Use during talk-through and planning. Identify which guideline sections are relevant now, which are likely to become relevant later, and which applicability questions need a product or architecture decision. Do not turn future work into a current blocker.

### Implement

Use before and after implementation. Return the applicable checklist items and the repository evidence needed to complete them. Reassess when implementation introduces a capability that was not visible during planning.

### Review

Use as an independent review input. Check the task's declared guideline sections, the actual diff, existing repository standards, and claimed proof. Report concrete missing or violated items with evidence.

### Final assessment

Use before `mastra-workflow` reports the product or plan complete. Load every reference file. Every item must be complete, not applicable under its own wording, or explicitly represented by unfinished planned work. The workflow must not report completion while an applicable item remains unaddressed.

## Output contract

Return a compact structured result containing:

- mode,
- references loaded,
- applicable items,
- complete items and evidence,
- incomplete items,
- not-applicable items and reasons,
- deferred items and owning task when one exists,
- decisions that genuinely require the user.

Never mark an item complete from assertion alone. Follow `references/00-overview.md`: where applicable, completion requires the item to be configured, documented, committed, and working in CI.

## Rules

- Do not invent standards that are absent from the bundled references.
- Do not silently weaken or expand checklist wording.
- Do not copy the full guideline set into task files, plans, or `AGENTS.md`; record relevant sections, requirements, and proof only.
- Do not classify an item as not applicable unless its wording or the repository's actual shape supports that conclusion.
- Ordinary task review blocks only current applicable requirements and violations of established standards. The complete set is enforced by the final assessment.
