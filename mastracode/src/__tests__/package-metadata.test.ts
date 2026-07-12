import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const packageJsonPath = new URL('../../package.json', import.meta.url);

type PackageJson = {
  name?: string;
  version?: string;
  description?: string;
  type?: string;
  author?: string;
  repository?: { type?: string; url?: string; directory?: string };
  homepage?: string;
  bugs?: { url?: string };
  files?: string[];
  main?: string;
  types?: string;
  bin?: Record<string, string>;
  exports?: Record<string, unknown>;
  scripts?: Record<string, string>;
  engines?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

async function readPackageJson(): Promise<PackageJson> {
  return JSON.parse(await readFile(packageJsonPath, 'utf8')) as PackageJson;
}

describe('mastracode package metadata', () => {
  it('keeps the installed CLI entrypoint and public exports aligned with dist output', async () => {
    const pkg = await readPackageJson();

    expect(pkg.name).toBe('mastracode-remote');
    expect(pkg.version).toBe('0.2.1');
    expect(pkg.description).toBe(
      'MastraCode with Telegram. Run the normal terminal TUI and continue the same session from Telegram.',
    );
    expect(pkg.type).toBe('module');
    expect(pkg.author).toBe('Srdjan Coric');
    expect(pkg.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/SrdjanCoric/mastra.git',
      directory: 'mastracode',
    });
    expect(pkg.homepage).toBe('https://github.com/SrdjanCoric/mastra/tree/main/mastracode#readme');
    expect(pkg.bugs).toEqual({ url: 'https://github.com/SrdjanCoric/mastra/issues' });
    expect(pkg.files).toEqual(expect.arrayContaining(['dist', '!dist/headless', 'CHANGELOG.md', 'LICENSE.md']));
    expect(pkg.bin).toEqual({ 'mastracode-remote': './dist/telegram-cli.js' });
    expect(pkg.bin).not.toHaveProperty('mastracode');
    expect(pkg.bin).not.toHaveProperty('mastracode-telegram');
    expect(pkg.main).toBe('dist/index.js');
    expect(pkg.types).toBe('dist/index.d.ts');
    expect(pkg.exports).toMatchObject({
      '.': {
        import: { types: './dist/index.d.ts', default: './dist/index.js' },
        require: { types: './dist/index.d.ts', default: './dist/index.cjs' },
      },
      './tui': {
        import: { types: './dist/tui/index.d.ts', default: './dist/tui.js' },
        require: { types: './dist/tui/index.d.ts', default: './dist/tui.cjs' },
      },
      './acp': {
        import: { types: './dist/acp.d.ts', default: './dist/acp.js' },
        require: { types: './dist/acp.d.ts', default: './dist/acp.cjs' },
      },
      './package.json': './package.json',
    });
    expect(pkg.exports).not.toHaveProperty('./headless');
    expect(pkg.scripts?.postinstall).toBeUndefined();
    expect(pkg.scripts?.['verify:publication-package']).toBe('tsx src/scripts/verify-publication-package.ts');
    expect(pkg.dependencies?.['@mastracode-remote/mastracode-runtime']).toBeUndefined();
    expect(pkg.engines?.node).toBe('>=22.19.0');
  });

  it('does not publish floating latest dependency ranges', async () => {
    const pkg = await readPackageJson();
    const dependencyGroups = {
      dependencies: pkg.dependencies ?? {},
      devDependencies: pkg.devDependencies ?? {},
      peerDependencies: pkg.peerDependencies ?? {},
      optionalDependencies: pkg.optionalDependencies ?? {},
    };

    for (const [groupName, deps] of Object.entries(dependencyGroups)) {
      for (const [name, range] of Object.entries(deps)) {
        expect(range, `${groupName}.${name}`).not.toBe('latest');
      }
    }
  });
});
