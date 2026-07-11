import fs from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';

export async function acquireTelegramBrokerLock(lockPath: string): Promise<FileHandle | undefined> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const lock = await fs.open(lockPath, 'wx', 0o600);
      await lock.writeFile(`${process.pid}\n`, 'utf8');
      return lock;
    } catch (error) {
      if (!hasErrorCode(error, 'EEXIST')) throw error;
      let ownerPid = await readLockPid(lockPath);
      if (ownerPid === undefined) {
        await new Promise(resolve => setTimeout(resolve, 50));
        ownerPid = await readLockPid(lockPath);
      }
      if (ownerPid !== undefined && isProcessRunning(ownerPid)) return undefined;
      await fs.rm(lockPath, { force: true });
    }
  }
  return undefined;
}

async function readLockPid(lockPath: string): Promise<number | undefined> {
  try {
    const pid = Number((await fs.readFile(lockPath, 'utf8')).trim());
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch {
    return undefined;
  }
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !hasErrorCode(error, 'ESRCH');
  }
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}
