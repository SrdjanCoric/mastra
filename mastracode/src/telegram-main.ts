#!/usr/bin/env node
import { runTelegramCli } from './telegram/cli.js';
import { createTelegramCliHandlers } from './telegram/entry.js';

runTelegramCli(process.argv.slice(2), createTelegramCliHandlers()).catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
