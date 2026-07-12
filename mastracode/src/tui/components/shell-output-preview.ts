export const MAX_SHELL_PREVIEW_CHARS = 65_536;
export const MAX_SHELL_PREVIEW_LINES = 1_000;

interface ShellOutputPreviewLimits {
  maxChars: number;
  maxLines: number;
}

export class BoundedShellOutputPreview {
  private chunks: string[] = [];
  private charCount = 0;
  private limits: ShellOutputPreviewLimits;

  constructor(limits: ShellOutputPreviewLimits) {
    this.limits = normalizeLimits(limits);
  }

  get retainedChars(): number {
    return this.charCount;
  }

  setLimits(limits: ShellOutputPreviewLimits): void {
    this.limits = normalizeLimits(limits);
    this.trimToLimits();
  }

  append(output: string): void {
    if (!output) return;
    this.chunks.push(output);
    this.charCount += output.length;
    this.trimToLimits();
  }

  toString(): string {
    return this.chunks.join('');
  }

  clear(): void {
    this.chunks = [];
    this.charCount = 0;
  }

  private trimToLimits(): void {
    this.trimChars();
    this.trimLines();
  }

  private trimChars(): void {
    let overflow = this.charCount - this.limits.maxChars;
    while (overflow > 0 && this.chunks.length > 0) {
      const first = this.chunks[0]!;
      if (first.length <= overflow) {
        this.chunks.shift();
        this.charCount -= first.length;
        overflow -= first.length;
        continue;
      }

      this.chunks[0] = first.slice(overflow);
      this.charCount -= overflow;
      overflow = 0;
    }
  }

  private trimLines(): void {
    const value = this.toString();
    const trailingNewline = value.endsWith('\n');
    const parts = value.split('\n');
    const retainedPartCount = this.limits.maxLines + (trailingNewline ? 1 : 0);
    if (parts.length <= retainedPartCount) return;

    const retained = parts.slice(-retainedPartCount).join('\n');
    this.chunks = retained ? [retained] : [];
    this.charCount = retained.length;
  }
}

function normalizeLimits(limits: ShellOutputPreviewLimits): ShellOutputPreviewLimits {
  return {
    maxChars: Math.max(1, Math.floor(limits.maxChars)),
    maxLines: Math.max(1, Math.floor(limits.maxLines)),
  };
}
