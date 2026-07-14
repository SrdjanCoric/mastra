import os
import pty
import select
import sys


def main() -> int:
    if len(sys.argv) < 2:
        raise SystemExit("usage: pty_driver.py COMMAND [ARG ...]")

    pid, master_fd = pty.fork()
    if pid == 0:
        cwd = os.environ.get("MC_PTY_CWD")
        if cwd:
            os.chdir(cwd)
        os.execvpe(sys.argv[1], sys.argv[1:], os.environ)

    stdin_fd = sys.stdin.fileno()
    stdout_fd = sys.stdout.fileno()

    while True:
        readable, _, _ = select.select([master_fd, stdin_fd], [], [], 0.1)
        if master_fd in readable:
            try:
                data = os.read(master_fd, 65536)
            except OSError:
                data = b""
            if not data:
                break
            os.write(stdout_fd, data)

        if stdin_fd in readable:
            data = os.read(stdin_fd, 65536)
            if not data:
                break
            os.write(master_fd, data)

        exited_pid, status = os.waitpid(pid, os.WNOHANG)
        if exited_pid == pid:
            return os.waitstatus_to_exitcode(status)

    _, status = os.waitpid(pid, 0)
    return os.waitstatus_to_exitcode(status)


if __name__ == "__main__":
    raise SystemExit(main())
