export class ShikumiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
export const HarnessError = ShikumiError;
export class ModelError extends HarnessError {
  constructor(message: string, cause?: unknown) {
    super(message, "MODEL_ERROR", cause);
  }
}
export class ToolError extends HarnessError {
  constructor(message: string, cause?: unknown) {
    super(message, "TOOL_ERROR", cause);
  }
}
export class ToolValidationError extends ToolError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "ToolValidationError";
  }
}
export class MCPError extends HarnessError {
  constructor(message: string, cause?: unknown) {
    super(message, "MCP_ERROR", cause);
  }
}
export class FilesystemError extends HarnessError {
  constructor(message: string, cause?: unknown) {
    super(message, "FILESYSTEM_ERROR", cause);
  }
}
export class ShellError extends HarnessError {
  constructor(message: string, cause?: unknown) {
    super(message, "SHELL_ERROR", cause);
  }
}
export class GitError extends HarnessError {
  constructor(message: string, cause?: unknown) {
    super(message, "GIT_ERROR", cause);
  }
}
export class PersistenceError extends HarnessError {
  constructor(message: string, cause?: unknown) {
    super(message, "PERSISTENCE_ERROR", cause);
  }
}
export class ConfigurationError extends HarnessError {
  constructor(message: string, cause?: unknown) {
    super(message, "CONFIG_ERROR", cause);
  }
}
