# Task 0021: Fix terminal image prompts

**Branch**: `fix/terminal-image-prompts`
**Depends on**: 0020
**Source**: user report 2026-07-12 · **User story**: when I include an image in a terminal TUI prompt, process the prompt normally instead of failing

## What to build

Diagnose and fix the terminal TUI regression where any prompt containing an image fails. Preserve the existing MastraCode terminal image-input behavior and model capability checks. This task does not add Telegram image ingestion.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `06-code-health-and-maintainability.md`, `07-security.md`, `10-definition-of-done.md`

- [x] Keep image decoding, temporary-file handling, MIME validation, and model input boundaries typed and explicit.
- [x] Do not expose local paths, image bytes, or prompt content in diagnostics or Telegram output.
- [x] Add deterministic unit coverage and checked-in TUI proof for image-only and mixed text/image prompts.

## AFK tasks

- [x] Reproduce the failure through the real terminal input and session-send path.
- [x] Identify whether the regression is in clipboard/file intake, prompt normalization, message conversion, model capability handling, or serialization.
- [x] Fix the smallest responsible boundary without changing Telegram transport behavior.
- [x] Cover supported images, mixed prompts, unsupported media, and cleanup/error paths.
- [x] Run focused tests, package checks, and a checked-in TUI end-to-end scenario.

## Acceptance criteria

- [x] A supported image-only terminal prompt reaches the selected model without failing.
- [x] A terminal prompt containing text and one or more supported images reaches the model with all parts intact.
- [x] Unsupported or unreadable images produce a clear terminal error without crashing the session.
- [x] Existing text-only terminal prompts and Telegram text routing remain unchanged.
- [x] Temporary image data is cleaned up and no image content or sensitive path leaks into logs.
- [x] Focused tests, type checking, lint, package validation, and checked-in end-to-end proof pass.

## Implementation log

- Root cause: the normal PNG terminal path and the signal/session conversion were intact, but macOS clipboard extraction could fall back to `image/tiff`, which the model input path does not reliably accept.
- macOS TIFF clipboard fallbacks are converted to PNG with `sips`; randomized temporary source/output files are removed in all outcomes.
- Pasted local files now admit PNG, JPEG, GIF, and WebP, while unreadable files and unsupported BMP/TIFF/HEIC inputs show a terminal error instead of starting a failed model turn.
- The checked-in `clipboard-image-paste` scenario now proves mixed text/image prompts, image-only prompts, provider request attachment bytes, placeholder removal, and unsupported-format feedback.
- Verification: focused image/editor tests passed; `pnpm build:mastracode` passed `50/50` tasks; the post-review `pnpm check:mastracode` run passed `209/209` files and `2,130/2,130` tests plus formatting, lint, type checks, performance, release configuration, and archive verification; the focused TUI scenario passed `1/1`.
