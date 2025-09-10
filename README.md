# Oration AI - Career Counselor Chat (Next.js + tRPC)

A TypeScript-first Next.js app with tRPC, TanStack Query, Prisma, Supabase Auth, and OpenAI integration for a career counseling chat experience.

## Tech Stack
- Next.js App Router, React 19
- TypeScript (strict)
- tRPC 11 + TanStack Query
- Prisma 6 + PostgreSQL (Supabase/Neon)
- Supabase Auth (SSR helpers)
- OpenAI (chat completions)
- TailwindCSS 4 + shadcn/ui

## Local Setup
1. Install deps
```bash
pnpm install
```

2. Environment variables (`.env.local`)
```bash
# Database
DATABASE_URL=postgres://...        # pooled connection (for app)
DIRECT_URL=postgres://...          # direct connection (for prisma migrate)

# Supabase (Anon key only; do NOT use service key in the app)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# OpenAI
OPEN_AI_API_KEY=sk-...
```

3. Prisma migrate and generate
```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

4. Dev server
```bash
pnpm dev
```

Open http://localhost:3000.

## Features
- Authenticated app area `(main)` protected by middleware and SSR checks
- Chat sessions: create, list (infinite), rename, delete (with confirmation)
- Messages: persisted per-session, infinite history load in UI
- AI responses via OpenAI using recent conversation context

## TRPC API
- `session.list` (cursor, limit)
- `session.create`
- `session.rename`
- `session.delete`
- `message.listBySession` (cursor, limit)
- `message.send` (persists user msg, calls OpenAI, persists assistant msg; auto-titles session if needed)

## Deployment (Vercel)
- Set the same env vars in Vercel project settings
- Point `DATABASE_URL` to production DB (Supabase/Neon) and set `DIRECT_URL`
- Run Prisma migrations (via deploy hook or CLI) before first boot
- Redeploy after any schema changes

## Notes on Supabase + Prisma
- Supabase manages `auth.users`. Prisma should not migrate or create it.
- Ensure your Prisma schema references `auth.users(id)` via foreign keys.
- Use `DIRECT_URL` for running migrations (non-pooled) and `DATABASE_URL` for app runtime (pooled).

## Roadmap / Improvements
- Streaming AI responses
- Typing & delivery indicators
- Theme toggle
- Better error boundaries and retries

## Screenshots
- Add screenshots of login, dashboard, and chat.
