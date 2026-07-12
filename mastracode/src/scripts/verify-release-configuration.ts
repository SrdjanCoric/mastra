import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rootDir = path.resolve(packageDir, '..');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function parseWorkflow(source: string, name: string): Record<string, unknown> {
  const parsed = parse(source) as unknown;
  assert(typeof parsed === 'object' && parsed !== null, `${name} must contain a YAML object.`);
  return parsed as Record<string, unknown>;
}

async function main(): Promise<void> {
  const ciWorkflow = await fs.readFile(path.join(rootDir, '.github/workflows/mastracode-remote-ci.yml'), 'utf8');
  const releaseWorkflow = await fs.readFile(
    path.join(rootDir, '.github/workflows/mastracode-remote-release.yml'),
    'utf8',
  );
  const ci = parseWorkflow(ciWorkflow, 'MastraCode CI workflow');
  parseWorkflow(releaseWorkflow, 'MastraCode release workflow');
  const committedConfiguration = `${ciWorkflow}\n${releaseWorkflow}`;
  const jobs = ci.jobs as Record<string, unknown> | undefined;

  assert(ciWorkflow.includes('runs-on: ubuntu-latest'), 'MastraCode CI must use a GitHub-hosted runner.');
  assert(jobs?.changes, 'MastraCode CI must detect whether package checks are required.');
  assert(jobs?.quality, 'MastraCode CI must run quality checks.');
  assert(jobs?.tests, 'MastraCode CI must run tests and performance checks.');
  assert(jobs?.package, 'MastraCode CI must verify the release package.');
  assert(jobs?.codeql, 'MastraCode CI must run scoped CodeQL analysis.');
  assert(jobs?.validate, 'MastraCode CI must expose the required aggregate validation job.');
  assert(ciWorkflow.includes('run: pnpm check:mastracode:quality'), 'MastraCode CI must run canonical quality checks.');
  assert(ciWorkflow.includes('run: pnpm check:mastracode:tests'), 'MastraCode CI must run canonical test checks.');
  assert(ciWorkflow.includes('run: pnpm check:mastracode:package'), 'MastraCode CI must run canonical package checks.');
  assert(ciWorkflow.match(/Restore Turbo build cache/g)?.length === 3, 'Each build job must restore its Turbo cache.');
  assert(ciWorkflow.includes("- 'packages/core/**'"), 'MastraCode CI must run for direct workspace dependencies.');
  assert(ciWorkflow.includes("- 'plans/**'"), 'Plan-only pull requests must receive the required aggregate check.');
  assert(
    ciWorkflow.includes('Only plan files changed; package checks are not required.'),
    'Plan-only changes must bypass expensive package jobs.',
  );
  assert(
    ciWorkflow.includes("grep -qv '^plans/'") && !ciWorkflow.includes("! grep -qv '^plans/'"),
    'Any non-plan file must enable package checks.',
  );
  assert(ciWorkflow.includes('github/codeql-action/analyze@'), 'MastraCode CI must include scoped CodeQL analysis.');
  assert(releaseWorkflow.includes('workflow_dispatch:'), 'Releases must require a manual workflow dispatch.');
  assert(
    releaseWorkflow.includes('Require successful package CI') && releaseWorkflow.includes('Validate package'),
    'Releases must require the successful package CI gate instead of repeating it serially.',
  );
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
