# Why Shikumi Exists

Modern language models are powerful but incomplete. They can reason and generate, but they cannot act without a harness that provides execution, context, and tools.

Most agent frameworks are either too coupled to a single model provider, too heavy with hidden abstractions, or too fragmented across plugins and SDKs. Shikumi exists to provide a **minimal, production-quality harness** with clear runtime boundaries.

## Principles

- **Separation of concerns** — `ModelProvider`, `ToolRegistry`, `ContextManager` and `SessionRepository` are ports, not hard-wired dependencies.
- **Explicit composition** — `src/application/bootstrap/create-app.ts` wires the app. No DI framework, no magic.
- **Workspace isolation** — safe-path and `execa` enforce workspace-relative execution.
- **Terminal-first** — Ink + React for a responsive, streaming TUI that feels native.

Shikumi turns intelligence into action by giving models a safe, observable place to work: your workspace, your tools, your rules.
