# Akmeiir Quiz

A quiz app for practising multiple-choice tests, made for phones and desktops. Live at
https://akmeiir-quiz.akmeiir-quiz.workers.dev.

- **Question sets** are uploaded by admins as JSON files ([format](docs/test-file-format.md)) and
  every user sees all of them.
- **Each attempt is set up separately:** Practice (each answer is checked right away) or Exam (the
  score at the end), how many questions, random or in order, and an optional time limit.
- **History per test:** best score, past attempts, and "Redo mistakes" to repeat only the questions
  that went wrong.
- **English, Kazakh and Russian**, light and dark theme, and it can be added to a phone's home screen.

## Stack

SvelteKit 3 (Svelte 5) and TypeScript, Tailwind CSS 4, Drizzle ORM on libSQL (a local SQLite file
in development, [Turso](https://turso.tech) in production), Better Auth (email and password),
Paraglide (translations), Vitest and Playwright. Deployed to Cloudflare Workers.

## Local development

Tool versions (Node, pnpm, the Turso CLI) are pinned in `.tool-versions` for [mise](https://mise.jdx.dev).

```sh
mise install
pnpm install
cp .env.example .env      # then set BETTER_AUTH_SECRET: openssl rand -base64 32
pnpm db:migrate           # creates local.db
pnpm db:seed              # optional: a 3-question sample test
pnpm dev
```

Open http://localhost:5173 and register. To upload question sets, make your account an admin:

```sh
pnpm make-admin you@example.com
```

## Commands

| Command                    | What it does                                                       |
| -------------------------- | ------------------------------------------------------------------ |
| `pnpm dev`                 | Development server.                                                |
| `pnpm build`               | Production build for Cloudflare Workers.                           |
| `pnpm check` / `pnpm lint` | Type check / formatting and lint.                                  |
| `pnpm test:unit`           | Unit tests (repositories, file parser, passwords, translations).   |
| `pnpm test:e2e`            | Browser tests (phone and desktop sizes) against a fresh `e2e.db`.  |
| `pnpm db:generate`         | A new migration in `drizzle/` after changing a `*.schema.ts` file. |
| `pnpm db:migrate`          | Apply migrations to the database in `DATABASE_URL`.                |
| `pnpm make-admin <email>`  | Give an account the admin role.                                    |

## Where things are

- `src/routes/(app)/`: the signed-in pages (tests, setup, attempts, history, upload).
- `src/routes/(auth)/`: log in, register, log out.
- `src/lib/server/`: database repositories, auth, the question set parser, password hashing.
- `src/lib/components/`: shared UI; design tokens are in `src/routes/layout.css`.
- `messages/`: the UI text in `en`, `kk` and `ru`.
- `drizzle/`: database migrations.

## Docs

- [Question set file format](docs/test-file-format.md)
- [Deploying](docs/deploy.md): Cloudflare Workers, Turso, secrets, and the free plan's limits.
