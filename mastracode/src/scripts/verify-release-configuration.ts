import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rootDir = path.resolve(packageDir, '..');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const ciWorkflow = await fs.readFile(path.join(rootDir, '.github/workflows/mastracode-remote-ci.yml'), 'utf8');
  const releaseWorkflow = await fs.readFile(
    path.join(rootDir, '.github/workflows/mastracode-remote-release.yml'),
    'utf8',
  );
  const committedConfiguration = `${ciWorkflow}\n${releaseWorkflow}`;

  assert(ciWorkflow.includes('runs-on: ubuntu-latest'), 'MastraCode CI must use a GitHub-hosted runner.');
  assert(ciWorkflow.includes('run: pnpm check:mastracode'), 'MastraCode CI must run the canonical package check.');
  assert(ciWorkflow.includes('github/codeql-action/analyze@'), 'MastraCode CI must include scoped CodeQL analysis.');
  assert(releaseWorkflow.includes('workflow_dispatch:'), 'Releases must require a manual workflow dispatch.');
  assert(releaseWorkflow.includes('environment: npm-release'), 'Releases must use the protected npm environment.');
  assert(releaseWorkflow.includes('id-token: write'), 'Trusted publishing requires OIDC permission.');
  assert(
    releaseWorkflow.includes('npm publish "${{ steps.archive.outputs.path }}" --access public --provenance'),
    'The release workflow must publish the verified archive with provenance.',
  );
  assert(releaseWorkflow.includes('sha256sum "$archive"'), 'The release workflow must record archive integrity.');
  assert(!/NPM_TOKEN|NODE_AUTH_TOKEN|npm_[A-Za-z0-9]{20,}/.test(committedConfiguration), 'Do not store npm tokens.');

  console.info('Verified MastraCode CI and trusted-publishing configuration.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
