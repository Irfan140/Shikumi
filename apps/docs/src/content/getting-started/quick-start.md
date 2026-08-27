# Quick Start

```bash
# Interactive TUI
shikumi
# → Welcome to Shikumi • Tab switch plan/agent • ↑/↓ scroll

# One-off prompt
shikumi run "list files and summarize this project"

# Resume a session
shikumi sessions
shikumi resume <id> "continue the refactor"

# Check config (keys redacted)
shikumi config
```

## First Run

1. On first launch Shikumi checks for `OPENAI_API_KEY` or `.shikumi/config.json`. If missing, it runs with `MockProvider` and shows a BYOK banner.
2. Press `Tab` to toggle **PLAN** (read-only, yellow) vs **AGENT** (full, green).
3. Ask something. The agent streams, then may call tools. Critical tools (`write_file`, `run_command`) prompt `y/n/a`.

## Example Session

```
▶ You
list files

● Harness
◐ list_directory running…
✓ list_directory done

Harness
Found 12 files...
```

Press `Ctrl+C` to exit, `Ctrl+U` clear line, `Tab` switch mode.
