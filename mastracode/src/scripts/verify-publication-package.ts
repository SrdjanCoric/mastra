import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MAX_ARCHIVE_BYTES = 5 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 20 * 1024 * 1024;

async function directoryBytes(directory: string): Promise<number> {
  let bytes = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    bytes += entry.isDirectory() ? await directoryBytes(entryPath) : (await fs.stat(entryPath)).size;
  }
  return bytes;
}

function run(command: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): string {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      [`Command failed: ${command} ${args.join(' ')}`, result.stdout.trim(), result.stderr.trim()]
        .filter(Boolean)
        .join('\n'),
    );
  }
  return result.stdout;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mastracode-remote-publication-'));
  try {
    const packDir = path.join(root, 'pack');
    const prefix = path.join(root, 'prefix');
    const home = path.join(root, 'home');
    const project = path.join(root, 'project');
    const externalCheckout = path.join(root, 'external-checkout');
    const legacyDir = path.join(home, '.mastracode-remote');
    const launchAgentsDir = path.join(home, 'Library', 'LaunchAgents');
    await Promise.all([
      fs.mkdir(packDir, { recursive: true }),
      fs.mkdir(project, { recursive: true }),
      fs.mkdir(externalCheckout, { recursive: true }),
      fs.mkdir(legacyDir, { recursive: true }),
      fs.mkdir(launchAgentsDir, { recursive: true }),
    ]);

    const legacySentinel = path.join(legacyDir, 'sentinel.json');
    const launchdSentinel = path.join(launchAgentsDir, 'com.mastracode-remote.test.plist');
    const externalSentinel = path.join(externalCheckout, 'sentinel.txt');
    await Promise.all([
      fs.writeFile(legacySentinel, '{"legacy":true}\n', 'utf8'),
      fs.writeFile(launchdSentinel, 'legacy-launchd-service\n', 'utf8'),
      fs.writeFile(externalSentinel, 'external-checkout\n', 'utf8'),
    ]);

    run('pnpm', ['pack', '--pack-destination', packDir], { cwd: packageDir });
    const archiveName = (await fs.readdir(packDir)).find(file => file.endsWith('.tgz'));
    assert(archiveName, 'pnpm pack did not create an archive.');
    const archivePath = path.join(packDir, archiveName);
    const archiveBytes = (await fs.stat(archivePath)).size;
    const archiveSha256 = createHash('sha256')
      .update(await fs.readFile(archivePath))
      .digest('hex');
    assert(
      archiveBytes <= MAX_ARCHIVE_BYTES,
      `The archive is ${archiveBytes} bytes, above the ${MAX_ARCHIVE_BYTES}-byte release budget.`,
    );

    const unpackDir = path.join(root, 'unpacked');
    await fs.mkdir(unpackDir);
    run('tar', ['-xzf', archivePath, '-C', unpackDir]);
    const unpackedBytes = await directoryBytes(unpackDir);
    assert(
      unpackedBytes <= MAX_UNPACKED_BYTES,
      `The unpacked package is ${unpackedBytes} bytes, above the ${MAX_UNPACKED_BYTES}-byte release budget.`,
    );

    const archiveFiles = run('tar', ['-tzf', archivePath]).split('\n');
    assert(archiveFiles.includes('package/README.md'), 'The archive is missing README.md.');
    assert(archiveFiles.includes('package/LICENSE.md'), 'The archive is missing LICENSE.md.');
    assert(archiveFiles.includes('package/dist/telegram-cli.js'), 'The archive is missing the CLI entrypoint.');
    assert(
      archiveFiles.some(file => file.startsWith('package/assets/skills/mastra-workflow/')),
      'The archive is missing bundled workflow skills.',
    );
    assert(
      !archiveFiles.some(file => /^package\/dist\/headless(?:[/.]|$)/.test(file)),
      'The archive contains the removed headless runtime.',
    );
    assert(
      !archiveFiles.some(file => /(^|\/)\.env(?:\.|$)/.test(file) || file.includes('.mastracode-telegram/')),
      'The archive contains local credentials or runtime state.',
    );

    const packedPackage = JSON.parse(run('tar', ['-xOf', archivePath, 'package/package.json'])) as {
      name?: string;
      bin?: Record<string, string>;
      exports?: Record<string, unknown>;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
    };
    assert(packedPackage.name === 'mastracode-remote', 'The packed package name is not mastracode-remote.');
    assert(
      packedPackage.bin?.['mastracode-remote'] === './dist/telegram-cli.js',
      'The packed executable is not mastracode-remote.',
    );
    assert(!packedPackage.bin?.mastracode, 'The archive would overwrite the official mastracode executable.');
    assert(!packedPackage.exports?.['./headless'], 'The archive still exports the headless runtime.');
    assert(!packedPackage.scripts?.postinstall, 'The archive must not run setup from postinstall.');
    assert(
      !packedPackage.dependencies?.['@mastracode-remote/mastracode-runtime'],
      'The archive still depends on the legacy split runtime.',
    );

    const binDir = process.platform === 'win32' ? prefix : path.join(prefix, 'bin');
    await fs.mkdir(binDir, { recursive: true });
    const officialBin = path.join(binDir, process.platform === 'win32' ? 'mastracode.cmd' : 'mastracode');
    if (process.platform === 'win32') {
      await fs.writeFile(officialBin, '@echo official-mastracode\r\n', 'utf8');
    } else {
      await fs.writeFile(officialBin, '#!/bin/sh\necho official-mastracode\n', { encoding: 'utf8', mode: 0o755 });
    }

    run('npm', ['install', '--global', '--prefix', prefix, archivePath]);
    const remoteBin = path.join(binDir, process.platform === 'win32' ? 'mastracode-remote.cmd' : 'mastracode-remote');
    await fs.access(remoteBin);
    assert(run(officialBin, []).trim() === 'official-mastracode', 'Installing the archive replaced mastracode.');

    const isolatedEnv = {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
    };
    const help = run(remoteBin, ['--help'], { cwd: project, env: isolatedEnv });
    assert(help.includes('mastracode-remote --init'), 'The installed executable did not print package help.');

    const startup = spawnSync(remoteBin, [], { cwd: project, env: isolatedEnv, encoding: 'utf8' });
    assert(startup.status !== 0, 'An uninitialized package run should stop before starting the TUI.');
    assert(
      `${startup.stdout}\n${startup.stderr}`.includes('Run `mastracode-remote --init` from this project first.'),
      'The installed executable did not provide initialization guidance.',
    );

    assert((await fs.readFile(legacySentinel, 'utf8')) === '{"legacy":true}\n', 'Legacy state was modified.');
    assert(
      (await fs.readFile(launchdSentinel, 'utf8')) === 'legacy-launchd-service\n',
      'Legacy launchd state was modified.',
    );
    assert(
      (await fs.readFile(externalSentinel, 'utf8')) === 'external-checkout\n',
      'An external checkout was modified.',
    );

    console.info(
      `Verified ${archiveName}: sha256=${archiveSha256} archiveBytes=${archiveBytes} unpackedBytes=${unpackedBytes}, isolated install, executable coexistence, archive contents, and legacy state.`,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

await main();
