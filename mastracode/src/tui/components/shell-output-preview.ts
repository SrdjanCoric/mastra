export const MAX_SHELL_PREVIEW_CHARS = 65_536;
export const MAX_SHELL_PREVIEW_LINES = 1_000;

interface ShellOutputPreviewLimits {
  maxChars: number;
  maxLines: number;
}

interface PreviewChunk {
  text: string;
  offset: number;
}

export class BoundedShellOutputPreview {
  private chunks: PreviewChunk[] = [];
  private head = 0;
  private charCount = 0;
  private newlineCount = 0;
  private endsWithNewline = false;
  private limits: ShellOutputPreviewLimits;

  constructor(limits: ShellOutputPreviewLimits) {
    this.limits = normalizeLimits(limits);
  }

  get retainedChars(): number {
    return this.charCount;
  }

  get retainedLines(): number {
    if (this.charCount === 0) return 0;
    return this.newlineCount + (this.endsWithNewline ? 0 : 1);
  }

  setLimits(limits: ShellOutputPreviewLimits): void {
    this.limits = normalizeLimits(limits);
    this.trimToLimits();
  }

  append(output: string): void {
    if (!output) return;
    this.chunks.push({ text: output, offset: 0 });
    this.charCount += output.length;
    this.newlineCount += countNewlines(output);
    this.endsWithNewline = output.endsWith('\n');
    this.trimToLimits();
  }

  toString(): string {
    if (this.charCount === 0) return '';
    const retained = this.chunks.slice(this.head);
    if (retained.length === 0) return '';
    return retained.map((chunk, index) => chunk.text.slice(index === 0 ? chunk.offset : 0)).join('');
  }

  clear(): void {
    this.chunks = [];
    this.head = 0;
    this.charCount = 0;
    this.newlineCount = 0;
    this.endsWithNewline = false;
  }

  private trimToLimits(): void {
    this.trimChars();
    this.trimLines();
    this.compactConsumedChunks();
  }

  private trimChars(): void {
    let overflow = this.charCount - this.limits.maxChars;
    while (overflow > 0 && this.head < this.chunks.length) {
      const chunk = this.chunks[this.head]!;
      const available = chunk.text.length - chunk.offset;
      const removeCount = Math.min(overflow, available);
      const removed = chunk.text.slice(chunk.offset, chunk.offset + removeCount);
      chunk.offset += removeCount;
      this.charCount -= removeCount;
      this.newlineCount -= countNewlines(removed);
      overflow -= removeCount;
      if (chunk.offset === chunk.text.length) this.head += 1;
    }
  }

  private trimLines(): void {
    while (this.retainedLines > this.limits.maxLines) {
      const newlineOffset = this.findFirstNewlineOffset();
      if (newlineOffset < 0) break;
      this.removeFromFront(newlineOffset + 1);
    }
  }

  private findFirstNewlineOffset(): number {
    let traversed = 0;
    for (let index = this.head; index < this.chunks.length; index += 1) {
      const chunk = this.chunks[index]!;
      const start = index === this.head ? chunk.offset : 0;
      const newline = chunk.text.indexOf('\n', start);
      if (newline >= 0) return traversed + newline - start;
      traversed += chunk.text.length - start;
    }
    return -1;
  }

  private removeFromFront(count: number): void {
    let remaining = count;
    while (remaining > 0 && this.head < this.chunks.length) {
      const chunk = this.chunks[this.head]!;
      const available = chunk.text.length - chunk.offset;
      const removeCount = Math.min(remaining, available);
      const removed = chunk.text.slice(chunk.offset, chunk.offset + removeCount);
      chunk.offset += removeCount;
      this.charCount -= removeCount;
      this.newlineCount -= countNewlines(removed);
      remaining -= removeCount;
      if (chunk.offset === chunk.text.length) this.head += 1;
    }
  }

  private compactConsumedChunks(): void {
    if (this.head < 1_024 || this.head * 2 < this.chunks.length) return;
    this.chunks = this.chunks.slice(this.head);
    this.head = 0;
  }
}

function normalizeLimits(limits: ShellOutputPreviewLimits): ShellOutputPreviewLimits {
  return {
    maxChars: Math.max(1, Math.floor(limits.maxChars)),
    maxLines: Math.max(1, Math.floor(limits.maxLines)),
  };
}

function countNewlines(value: string): number {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 10) count += 1;
  }
  return count;
}
