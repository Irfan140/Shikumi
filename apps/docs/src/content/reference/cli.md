# CLI Reference

```bash
shikumi                         # TUI (Mock if no key)
shikumi setup                   # BYOK wizard → .shikumi/config.json
shikumi config                  # show redacted config
shikumi config set model.apiKey sk-... 
shikumi run "prompt"            # one-off, non-interactive
shikumi resume <id> ["prompt"]  # resume TUI or continue with prompt
shikumi sessions                # list
shikumi --help
```

## TUI Keys

- `Enter` send, `Ctrl+C` exit, `Ctrl+U` clear line, `Ctrl+W` delete word
- `Tab` toggle PLAN (yellow) / AGENT (green) — toast, not history spam
- `↑/↓` `PgUp/PgDn` scroll (frozen while scrolled, queued messages on `↓` to bottom)
- `y/n/a` on permission prompt (write/run)

## TUI Slash Commands

Type `/` to open the palette (`↑/↓` select, `Tab` complete, `Enter` run, `Esc` dismiss):

- `/help` — list all commands
- `/status` — session, model, mode, message/tool-call counts, MCP
- `/new` — start a fresh session
- `/sessions` — list previous sessions (`*` = current)
- `/resume <id>` (alias `/switch`) — switch to a previous session, history restored
- `/rename <title>` — title the current session
- `/model [provider] [name]` — show or switch model (`openai`/`groq`/`mock`)
- `/plan`, `/agent` — switch mode
- `/tools` — list available tools
- `/mcp [reconnect]` — show MCP servers or reconnect
- `/config` — show config (keys redacted)
- `/clear` — clear the screen
- `/quit` (alias `/exit`) — exit
