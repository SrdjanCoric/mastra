# Task 0027: Send images during active runs

**Branch**: `fix/active-run-image-signals`
**Depends on**: 0026
**Source**: user report 2026-07-13 · **User story**: submit image-and-text input while original MastraCode is already running, without waiting for the current run to finish

## What to build

Route terminal image-and-text submissions through the same native active signal path as text-only interjections. Preserve image-only input, attachment metadata, optimistic rendering, stream-echo deduplication, and normal `delivery="while-active"` semantics.

Keep explicit follow-up queueing available through its existing shortcut, but do not silently divert ordinary Enter submissions with images into that queue. This is an original MastraCode TUI fix and must not add Telegram image ingestion.

## Acceptance criteria

- [x] Submitting image-and-text input during any normal active run immediately calls the native signal path with the matching attachments.
- [x] Image-only active-run input is supported.
- [x] Text-only interjections and explicitly queued follow-ups keep their existing behavior.
- [x] The editor clears consumed placeholders and pending images exactly once without dropping or duplicating attachments.
- [x] Focused queueing tests and checked-in TUI image coverage pass.

## Diagnosis evidence

- The normal active-run path sends text directly through `signalMessage(content)`.
- The same path detected attachments and diverted the submission to `queueFollowUpMessage(text)`, so the active run never received the image signal.
- `signalMessage(text, images)` already assembled image/file signal content and had idle-image stream-echo deduplication coverage; the missing behavior was at the input-routing boundary.

## Implementation and verification evidence

- Active Enter submissions now consume image placeholders once and call `signalMessage(content, images)` immediately; the explicit Ctrl+F follow-up queue retains its existing attachment-aware behavior.
- Focused queueing coverage passed with 42 tests, including image-and-text and image-only active submissions plus unchanged text and explicit follow-up paths.
- The checked-in `active-image-interjection` TUI scenario passed against the real running-tool boundary. The terminal rendered `[1 image] Inspect the active image`, the active request carried the PNG bytes and `image/png`, and the current run returned `MC active image signal response` without placeholder leakage.
- `pnpm check:mastracode` passed with 209 files / 2,135 tests, all three package integration scenarios, type and quality checks, the active-display benchmark (`20,000` chunks in `150.9 ms`), release configuration, and exact `mastracode-remote-0.2.5.tgz` archive verification (`sha256=0dfbfacd5c4f46158c4733725fc2045a2ba7bae7825c359b0e585dbd3c8b365c`).

## Review evidence

- Automatic standards, specification, bug, and security review found no blocker, major, minor, or nit findings. The change reuses the existing attachment validation and signal serialization boundary; it does not add a new file, network, permission, or Telegram ingestion path.
- Software Repository Guidelines review loaded `00-overview`, `01-style-and-code-quality`, `02-testing`, `06-code-health-and-maintainability`, `07-security`, and `10-definition-of-done`. The patch is localized and strictly typed, carries meaningful unit and real TUI boundary coverage, passes package validation, adds no dependency or artifact-size regression, and includes the required package changeset.
