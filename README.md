# CHAT-AGENT

*Empowering Conversations, Unlocking Career Success Instantly*

---

![Last Commit](https://img.shields.io/github/last-commit/HirenTumbadiya/chat-agent?color=blue&label=last%20commit)
![TypeScript](https://img.shields.io/badge/typescript-94.4%25-blue)
![Languages](https://img.shields.io/badge/languages-3-brightgreen)

---

### Built with the tools and technologies:

![JSON](https://img.shields.io/badge/JSON-black?logo=json&logoColor=white)
![Markdown](https://img.shields.io/badge/Markdown-black?logo=markdown&logoColor=white)
![npm](https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?logo=prettier&logoColor=black)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-2B6CB0?logo=zod&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?logo=eslint&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)
![React Hook Form](https://img.shields.io/badge/React%20Hook%20Form-EC5990?logo=reacthookform&logoColor=white)
![YAML](https://img.shields.io/badge/YAML-CB171E?logo=yaml&logoColor=white)


A TypeScript-first Next.js app with tRPC, TanStack Query, Prisma, Supabase Auth, and OpenAI integration for a career counseling chat experience.

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
- Streaming replies (SSE) with live typing indicator
- Optimistic user message and auto-scroll during streaming
- Deep-linkable chats at `/chat/[id]` (refresh keeps you on the same chat)
- Theme toggle (light/dark) persisted in localStorage and respects system preference

## TRPC API
- `session.list` (cursor, limit)
- `session.create`
- `session.rename`
- `session.delete`
- `message.listBySession` (cursor, limit)
- `message.send` (persists user msg, calls OpenAI, persists assistant msg; auto-titles session if needed)

## Streaming (SSE)
- Endpoint: `POST /api/chat/message/stream`
- Body: `{ sessionId: string, content: string }`
- Server streams `data: { type: "delta", content }` events, followed by `data: { type: "done", id }` when complete
- UI consumes the stream and shows a live-updating assistant bubble; on completion it refetches persisted messages

Note: SSE is used instead of WebSocket subscriptions for compatibility with Vercel serverless runtime.

## Deployment (Vercel)
- Set the same env vars in Vercel project settings
- Point `DATABASE_URL` to production DB (Supabase/Neon) and set `DIRECT_URL`
- Run Prisma migrations (via deploy hook or CLI) before first boot
- Redeploy after any schema changes

### Middleware placement
Ensure auth middleware runs on Vercel by adding a root `middleware.ts` that re-exports the Supabase middleware:

```ts
// middleware.ts
export { middleware, config } from "@/utils/supabase/middleware";
```

## Notes on Supabase + Prisma
- Supabase manages `auth.users`. Prisma should not migrate or create it.
- Ensure your Prisma schema references `auth.users(id)` via foreign keys.
- Use `DIRECT_URL` for running migrations (non-pooled) and `DATABASE_URL` for app runtime (pooled).

If you map `User` to `auth.users` in Prisma, prefer schema-aware mapping and do not attempt to upsert into `auth.users` from the app:

```prisma
model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String?  @db.VarChar
  createdAt DateTime @default(now()) @map("created_at")

  profile   Profile?
  sessions  ChatSession[]
  messages  ChatMessage[]

  @@map("users")
  @@schema("auth")
}
```

The app relies on Supabase Auth to create users; do not upsert `User` rows.

## Roadmap / Improvements
- Streaming AI responses
- Typing & delivery indicators
- Theme toggle
- Better error boundaries and retries

## Screenshots
![App Screenshot](./public/readme_image/login.png)
![App Screenshot](./public/readme_image/signup.png)
![App Screenshot](./public/readme_image/dashboard.png)
![App Screenshot](./public/readme_image/chatinterface.png)
