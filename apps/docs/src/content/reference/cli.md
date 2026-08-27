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
