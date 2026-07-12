import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  execFileSync: vi.fn(),
  execSync: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFileSync: mocks.execFileSync,
  execSync: mocks.execSync,
}));

vi.mock('node:fs', () => ({
  readFileSync: mocks.readFileSync,
  unlinkSync: mocks.unlinkSync,
}));

import { getClipboardImage } from '../index.js';

describe('getClipboardImage', () => {
  beforeEach(() => {
    mocks.execFileSync.mockReset();
    mocks.execSync.mockReset();
    mocks.readFileSync.mockReset();
    mocks.unlinkSync.mockReset();
    mocks.readFileSync.mockReturnValue(Buffer.from('clipboard-image-binary'));
    vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads png clipboard images on macOS', () => {
    mocks.execSync.mockReturnValueOnce(undefined);

    expect(getClipboardImage()).toEqual({
      data: Buffer.from('clipboard-image-binary').toString('base64'),
      mimeType: 'image/png',
    });
  });

  it('converts the TIFF clipboard fallback to PNG for model compatibility', () => {
    mocks.execSync.mockImplementationOnce(() => {
      throw new Error('PNG clipboard coercion failed');
    });
    mocks.execSync.mockReturnValueOnce(undefined);
    mocks.execFileSync.mockReturnValueOnce(Buffer.alloc(0));

    expect(getClipboardImage()).toEqual({
      data: Buffer.from('clipboard-image-binary').toString('base64'),
      mimeType: 'image/png',
    });
    expect(mocks.execFileSync).toHaveBeenCalledWith(
      'sips',
      expect.arrayContaining(['-s', 'format', 'png', '--out']),
      expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
    );
    const convertedFiles = mocks.unlinkSync.mock.calls.slice(-2).map(([file]) => String(file));
    expect(convertedFiles[0]).toMatch(/\.tiff$/);
    expect(convertedFiles[1]).toMatch(/\.png$/);
  });

  it('returns null when direct macOS image coercions all fail', () => {
    mocks.execSync.mockImplementation(() => {
      throw new Error('clipboard coercion failed');
    });

    expect(getClipboardImage()).toBeNull();
    expect(mocks.readFileSync).not.toHaveBeenCalled();
    expect(mocks.execSync).toHaveBeenCalledTimes(3);
  });
});
