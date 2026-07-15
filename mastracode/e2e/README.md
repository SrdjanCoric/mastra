# Mastra Code TUI e2e runner

Mastra Code scenarios live in `e2e/scenarios/` and run through the zero-subprocess Vitest runner. CLI-boundary regressions that require a real pseudo-terminal live in `e2e/pty/`.

## Run all scenarios

```bash
pnpm --filter ./mastracode run e2e:test -- --reporter=dot
```

The runner constructs Mastra Code in-process, injects a `pi-tui` terminal backed by `@xterm/headless`, and runs four static Vitest shard files in one CI job. It does not launch the `mastracode` CLI, `tsx` scenario entrypoints, worker threads, or Mastra Code subprocesses.

Failed runs keep their per-scenario temp directories under `mastracode/.tmp-mc-e2e-vitest/` until cleanup runs; inspect that directory when debugging a failed scenario.

## Real PTY regressions

Run the CLI-boundary tests through a real pseudo-terminal:

```bash
pnpm --filter ./mastracode exec vitest run --config e2e/pty/vitest.config.ts --reporter=dot
```

These tests launch the built `dist/cli.js` through `e2e/pty/pty_driver.py`. Run `pnpm build:mastracode` first. The package `test:integration` script runs both the in-process integration scenarios and this PTY suite.

The PTY suite runs on macOS and Linux and requires `python3` on `PATH`. Vitest skips it on Windows.

## Smoke test

Run the default smoke scenarios (`startup`, `automated-chat`, and `modal-and-shell`):

```bash
pnpm --filter ./mastracode run e2e:smoke
```

## Focused scenario runs

Run one or more scenarios through the single-wrapper Vitest config:

```bash
MC_E2E_VITEST_SCENARIOS=startup,automated-chat pnpm --filter ./mastracode exec vitest run --config e2e/vitest.config.ts --reporter=dot
```

List available scenarios:

```bash
pnpm --filter ./mastracode run e2e:list
```

Use focused runs for scenario development, then run `e2e:test` before shipping runner changes.
