import { type Options, execa } from "execa";
import { ShellError } from "../../errors/errors.js";

export type ExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  failed: boolean;
};

export async function execCommand(
  command: string,
  args: string[],
  opts: { cwd?: string; timeout?: number; env?: Record<string, string> } = {},
): Promise<ExecResult> {
  const start = Date.now();
  try {
    const result = await execa(command, args, {
      cwd: opts.cwd,
      timeout: opts.timeout,
      env: opts.env,
      reject: false,
    } as Options);
    return {
      stdout: String(result.stdout ?? ""),
      stderr: String(result.stderr ?? ""),
      exitCode: result.exitCode ?? 0,
      durationMs: Date.now() - start,
      failed: Boolean(result.failed),
    };
  } catch (e) {
    throw new ShellError(`exec failed: ${command} ${args.join(" ")}`, e);
  }
}
