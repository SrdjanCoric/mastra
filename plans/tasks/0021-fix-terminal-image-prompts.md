# Task 0021: Fix terminal image prompts

**Branch**: `fix/terminal-image-prompts`
**Depends on**: 0020
**Source**: user report 2026-07-12 · **User story**: when I include an image in a terminal TUI prompt, process the prompt normally instead of failing

## What to build

Diagnose and fix the terminal TUI regression where any prompt containing an image fails. Preserve the existing MastraCode terminal image-input behavior and model capability checks. This task does not add Telegram image ingestion.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `06-code-health-and-maintainability.md`, `07-security.md`, `10-definition-of-done.md`

- [ ] Keep image decoding, temporary-file handling, MIME validation, and model input boundaries typed and explicit.
- [ ] Do not expose local paths, image bytes, or prompt content in diagnostics or Telegram output.
- [ ] Add deterministic unit coverage and checked-in TUI proof for image-only and mixed text/image prompts.

## AFK tasks

- [ ] Reproduce the failure through the real terminal input and session-send path.
- [ ] Identify whether the regression is in clipboard/file intake, prompt normalization, message conversion, model capability handling, or serialization.
- [ ] Fix the smallest responsible boundary without changing Telegram transport behavior.
- [ ] Cover supported images, mixed prompts, unsupported media, and cleanup/error paths.
- [ ] Run focused tests, package checks, and a checked-in TUI end-to-end scenario.

## Acceptance criteria

- [ ] A supported image-only terminal prompt reaches the selected model without failing.
- [ ] A terminal prompt containing text and one or more supported images reaches the model with all parts intact.
- [ ] Unsupported or unreadable images produce a clear terminal error without crashing the session.
- [ ] Existing text-only terminal prompts and Telegram text routing remain unchanged.
- [ ] Temporary image data is cleaned up and no image content or sensitive path leaks into logs.
- [ ] Focused tests, type checking, lint, package validation, and checked-in end-to-end proof pass.
