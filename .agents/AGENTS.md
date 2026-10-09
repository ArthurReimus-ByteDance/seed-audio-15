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
| `src/`, `package.json` | Seed Audio Studio: Next.js 16 web app (App Router, Tailwind v4, shadcn/ui, TanStack Query, axios, zod, zustand) |
| `tests/` | Unit tests for the Python helper script |
| `outputs/` | Generated audio (gitignored) |

## Configuration

Copy `.env.example` to `.env.local` (web app) or `.env` (Python helper, also read by Next) and fill in `SEED_AUDIO_API_KEY`. Never commit env files, never print the key. The key is server-side only in the web app.

## Conventions

- Skills are single-purpose leaf skills; they never load each other. Sequencing lives here: draft the prompt with `seed-audio-prompt-15`, then submit it with `seed-audio-api`.
- Helper script is Python 3 standard library only. Run its tests with `python3 -m unittest discover -s tests`.
- Web app: `npm run dev`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. This is Next.js 16 with Cache Components: read `node_modules/next/dist/docs/` before changing routing or caching, and keep env-reading `GET` handlers dynamic (`await connection()`).
- Validation lives in `src/lib/seed-audio` (schemas, shared by client and server) and `src/components/studio/studio-state.ts` (form rules such as clip length, total length, size and prompt-check errors). Change limits in `constants.ts` only; the UI reads them from there.
- Browser storage is the only persistence (zustand + localStorage for metadata, IndexedDB for audio). Do not add a database.
- No comments in code unless asked. Commit only when asked.
