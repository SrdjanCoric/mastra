import { describe, expect, it } from 'vitest';

import {
  BoundedShellOutputPreview,
  MAX_SHELL_PREVIEW_CHARS,
  MAX_SHELL_PREVIEW_LINES,
} from '../shell-output-preview.js';

describe('BoundedShellOutputPreview', () => {
  it('retains only the latest configured lines while preserving arrival order', () => {
    const preview = new BoundedShellOutputPreview({ maxChars: MAX_SHELL_PREVIEW_CHARS, maxLines: 3 });

    preview.append('stdout 1\n');
    preview.append('stderr 2\n');
    preview.append('stdout 3\nstdout 4\n');

    expect(preview.toString()).toBe('stderr 2\nstdout 3\nstdout 4\n');
    expect(preview.retainedChars).toBeLessThanOrEqual(MAX_SHELL_PREVIEW_CHARS);
  });

  it('bounds unlimited single-line output by the TUI character maximum', () => {
    const preview = new BoundedShellOutputPreview({
      maxChars: MAX_SHELL_PREVIEW_CHARS,
      maxLines: MAX_SHELL_PREVIEW_LINES,
    });

    preview.append('a'.repeat(MAX_SHELL_PREVIEW_CHARS));
    preview.append(`${'c'.repeat(MAX_SHELL_PREVIEW_CHARS - 1)}b`);

    expect(preview.retainedChars).toBe(MAX_SHELL_PREVIEW_CHARS);
    expect(preview.toString()).toBe(`${'c'.repeat(MAX_SHELL_PREVIEW_CHARS - 1)}b`);
  });

  it('releases retained chunks when cleared', () => {
    const preview = new BoundedShellOutputPreview({ maxChars: 100, maxLines: 10 });
    preview.append('one\ntwo\n');

    preview.clear();

    expect(preview.retainedChars).toBe(0);
    expect(preview.toString()).toBe('');
  });
});
