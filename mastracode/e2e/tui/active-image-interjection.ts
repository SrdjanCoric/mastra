import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { installOpenAIFetchCapture } from './openai-fetch-capture.js';
import type { McE2eScenario } from './types.js';

const PASTE_START = '\x1b[200~';
const PASTE_END = '\x1b[201~';
const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
const RAW_REQUEST_CAPTURE_PATH = join(process.cwd(), '.tmp-mc-e2e', 'active-image-interjection-openai-request.json');

export const activeImageInterjectionScenario = {
  name: 'active-image-interjection',
  description: 'submits an image-and-text signal while a normal MastraCode run is active',
  testName: 'delivers image-and-text input to the active run without silently queuing it',
  useOpenAIModel: true,
  aimockFixture: 'active-image-interjection.json',
  prepare() {
    rmSync(RAW_REQUEST_CAPTURE_PATH, { force: true });
  },
  async inProcessApp({ startMastraCodeApp }) {
    const restoreFetch = installOpenAIFetchCapture({ capturePath: RAW_REQUEST_CAPTURE_PATH, append: true });
    const app = await startMastraCodeApp();
    return {
      stop: async () => {
        await app.stop?.();
        restoreFetch();
      },
    };
  },
  async run({ terminal, runtime }) {
    runtime.startLiveOutput(terminal);

    const imageDir = join(process.cwd(), '.tmp-mc-e2e', 'active-image-interjection');
    const imagePath = join(imageDir, 'active-image.png');
    mkdirSync(imageDir, { recursive: true });
    writeFileSync(imagePath, Buffer.from(TINY_PNG_BASE64, 'base64'));

    await runtime.waitForScreenText(/Project: mastra/i, terminal);
    terminal.submit('Run the active image signal check.');
    await runtime.waitForScreenText(/ACTIVE_IMAGE_2/i, terminal, 30_000);

    terminal.write('Inspect the active image ');
    terminal.write(`${PASTE_START}${imagePath}${PASTE_END}`);
    await runtime.waitForScreenText(/\[image\]/i, terminal);
    terminal.submit('');

    await runtime.waitForScreenText(/\[1 image\]\s+Inspect the active image/i, terminal);
    await runtime.waitForScreenText(/MC active image signal response/i, terminal, 30_000);
    runtime.printScreen('after active image signal', terminal);
  },
  verifyAimockRequests(requests) {
    if (requests.length !== 2) {
      throw new Error(`Expected two AIMock requests, received ${requests.length}`);
    }

    const rawRequests = readFileSync(RAW_REQUEST_CAPTURE_PATH, 'utf8')
      .trim()
      .split('\n')
      .map(line => JSON.parse(line) as { body: string });
    if (rawRequests.length !== 2) {
      throw new Error(`Expected two raw OpenAI requests, received ${rawRequests.length}`);
    }

    const activeRequest = rawRequests[1]?.body ?? '';
    if (!activeRequest.includes('Inspect the active image')) {
      throw new Error('Expected active image text in the follow-up provider request');
    }
    if (!activeRequest.includes('image/png') || !activeRequest.includes(TINY_PNG_BASE64)) {
      throw new Error('Expected active PNG attachment data in the follow-up provider request');
    }
    if (activeRequest.includes('[image]')) {
      throw new Error('Expected the image placeholder to be removed before the active provider request');
    }
  },
} satisfies McE2eScenario;
