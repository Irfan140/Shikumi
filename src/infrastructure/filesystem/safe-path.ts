import { join, normalize, resolve, sep } from "node:path";
import { FilesystemError } from "../../errors/errors.js";

export function resolveSafePath(
  workspaceRoot: string,
  requested: string,
): string {
  const base = resolve(workspaceRoot);
  const target = resolve(join(base, normalize(requested)));
  if (target !== base && !target.startsWith(base + sep)) {
    throw new FilesystemError(`Path escapes workspace: ${requested}`);
  }
  return target;
}
