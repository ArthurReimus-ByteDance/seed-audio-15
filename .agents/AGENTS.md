# AGENTS.md - seed-audio-15

Workspace for integrating and prompting **Seed Audio 1.5 (early access)** on BytePlus ModelArk.

## Confidentiality (read first)

- Seed Audio 1.5 early access is **not public**. Do not publish this repo, post outputs, or paste its content into public or customer-facing material.
- Early access API keys are temporary and are revoked if the model is exposed publicly. They stop working after the official release (tentatively Oct. 28).
- Concurrency is **2 per API key**. Do not run more than two requests at once.

## Layout

| Path | Purpose |
|-|-|
| `.agents/skills/seed-audio-api/` | Skill: call the Seed Audio 1.5 generation API (modes, limits, helper script) |
| `.agents/skills/seed-audio-prompt-15/` | Skill: write effective Seed Audio 1.5 prompts |
| `.claude/skills` | Symlink to `.agents/skills` |
| `.claude/CLAUDE.md` | Symlink to this file |
| `tests/` | Unit tests for the helper script |
| `outputs/` | Generated audio (gitignored) |

## Configuration

Copy `.env.example` to `.env` and fill in `SEED_AUDIO_API_KEY`. Never commit `.env`, never print the key.

## Conventions

- Skills are single-purpose leaf skills; they never load each other. Sequencing lives here: draft the prompt with `seed-audio-prompt-15`, then submit it with `seed-audio-api`.
- Helper script is Python 3 standard library only. Run tests with `python3 -m unittest discover -s tests`.
- No comments in code unless asked. Commit only when asked.
