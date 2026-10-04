# Deploying

The app runs on [Cloudflare Workers](https://workers.cloudflare.com) (free plan) with its database
on [Turso](https://turso.tech). Live at https://akmeiir-quiz.akmeiir-quiz.workers.dev. Worker settings are in `wrangler.jsonc`; `wrangler` is a dev
dependency, so it runs with `pnpm exec wrangler`.

## One-time setup

### 1. Tools

The Turso CLI comes from mise (`.tool-versions`); `wrangler` from the project's dev dependencies.

```sh
mise install
turso auth login
pnpm exec wrangler login
```

### 2. Database

Turso has no Frankfurt; Stockholm is its closest location to Kazakhstan (`turso db locations`
lists them). Smart Placement (`wrangler.jsonc`) then runs the Worker next to the database:

```sh
turso db create akmeiir-quiz --location aws-eu-north-1
turso db show akmeiir-quiz --url        # → DATABASE_URL (libsql://…)
turso db tokens create akmeiir-quiz     # → DATABASE_AUTH_TOKEN
```

Create the tables. Run this again whenever `drizzle/` gets a new migration:

```sh
DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… pnpm db:migrate
```

Don't run `pnpm db:seed` here unless you want the 3-question sample test in production.

### 3. First deploy and secrets

```sh
pnpm build && pnpm exec wrangler deploy
```

This prints the address, e.g. `https://akmeiir-quiz.<your-subdomain>.workers.dev`. The site errors
until the secrets are set; each `secret put` asks for the value and takes effect right away:

```sh
pnpm exec wrangler secret put DATABASE_URL          # the libsql://… URL from step 2
pnpm exec wrangler secret put DATABASE_AUTH_TOKEN   # the token from step 2
pnpm exec wrangler secret put ORIGIN                # the address printed above
pnpm exec wrangler secret put BETTER_AUTH_SECRET    # a new one: openssl rand -base64 32
```

`ORIGIN` must be the address people use. If you add your own domain, change it to that domain.

A brand-new `workers.dev` subdomain needs a few minutes for its HTTPS certificate; until then
browsers show a connection error.

### 4. First admin

Register on the live site, then promote that account:

```sh
DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… pnpm make-admin you@example.com
```

Log out and in again; the Admin badge and "Upload a question set" appear.

## Later deploys

Run `pnpm build && pnpm exec wrangler deploy` again. To deploy on every push instead, connect the
GitHub repository under the Worker's **Settings → Builds** in the Cloudflare dashboard:

- Build command: `pnpm build`; deploy command: `npx wrangler deploy`.
- Build variable `PNPM_VERSION` = `12.9.0` (the build image has an older pnpm).

## The free plan's limits

- **10 ms of CPU per request.** Waiting for the database doesn't count, but password hashing does.
  That's why passwords use PBKDF2 with 40,000 iterations (`src/lib/server/password.ts`) instead of
  Better Auth's default scrypt, which takes about 40 ms. Fewer iterations means stored passwords are
  easier to crack if the database leaks; OWASP suggests 600,000.
- **Measured on 2026-10-05** (warm): page views 3–13 ms (median 8), log in 16–22 ms, log out 10–17 ms,
  register about 40 ms. Cloudflare tolerates a Worker that "infrequently runs over" the limit and
  stops one that does so consistently (error 1102). Logging in is rare next to page views, so this
  fits for now; if 1102 errors appear, the paid plan is the fix.
- **Keep an eye on it:** the Worker's **Observability** tab shows each request's CPU time, and
  **Metrics → Errors** counts "Exceeded CPU Time Limits". After moving to the paid plan ($5/month,
  30 s of CPU), raise `ITERATIONS`; existing passwords keep working, because each hash stores its
  own iteration count.
- **100,000 requests a day, and 50 database queries per request.**

## Good to know

- **Registration is open:** anyone with the link can create an account and take the tests. Only
  admins can upload.
- **To try the built Worker locally**, put the four variables in `.dev.vars` (git-ignored) and run
  `pnpm build && pnpm exec wrangler dev`. It needs a Turso URL, not `file:`; `turso dev` gives a
  local one.
