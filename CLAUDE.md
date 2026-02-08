# Claude Code Hooks Mastery

## Project
IndyDevDan's hooks mastery repo — learning and customizing Claude Code lifecycle hooks.
This is Maestro's primary hooks development environment on Butch.

## What This Is
A collection of Claude Code hook scripts (Python/Bash) that fire at lifecycle events:
PreToolUse, PostToolUse, Notification, Stop, SubagentStop, and others.
Hooks are registered in ~/.claude/settings.json under the "hooks" key.

## Key Directories
- .claude/hooks/ — active hook scripts (Python, 14 files)
- .claude/hooks/validators/ — file validation hooks (4 files)
- .claude/hooks/damage-control/ — safety guardrails (3 files)
- .claude/hooks/utils/llm/ — LLM integrations: OpenAI, Ollama, Anthropic (3 files + task_summarizer)
- .claude/hooks/utils/tts/ — text-to-speech: ElevenLabs, OpenAI, pyttsx3 (4 files)
- .claude/status_lines/ — status line scripts v2-v9 (9 files)
- apps/ — example applications

## Active Hooks
- bash-tool-damage-control.py — blocks dangerous bash commands (rm -rf, mkfs, dd, etc.)
- write-tool-damage-control.py — blocks dangerous file write operations
- edit-tool-damage-control.py — blocks dangerous file edit operations
- send_event.py — streams all lifecycle events to observability dashboard via HTTP POST

## Commands
```bash
# Start observability dashboard
tmux new-session -d -s obs-server 'cd observability/server && bun run index.ts'
tmux new-session -d -s obs-client 'cd observability/client && bun run dev --port 5173'

# Test a hook manually
python .claude/hooks/damage-control/bash-tool-damage-control.py < test-payload.json

# View active hooks config
cat ~/.claude/settings.json | jq '.hooks'
```

## Hook Development Rules
- Hooks read JSON from stdin, write JSON to stdout
- PreToolUse hooks can return {"decision": "block", "reason": "..."} to prevent execution
- PostToolUse hooks receive the tool result for logging/transformation
- Keep hooks fast — they run synchronously on every tool invocation
- Test hooks with sample JSON payloads before registering in settings.json

## Gotchas
- Hook paths in settings.json must be absolute
- Python hooks need #!/usr/bin/env python3 shebang and executable permissions
- Observability server must be running before dashboard client connects
- Bun is used for the observability stack, not Node
