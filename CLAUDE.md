# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Conventions

- Use comments sparingly. Only comment complex code where the WHY is non-obvious.
- The database schema is defined in `prisma/schema.prisma`. Reference it anytime you need to understand the structure of the data stored in the database.

## Project

UIGen — a Next.js 15 app that uses Claude (via the Vercel AI SDK) to generate React components from chat prompts and renders them in a live in-browser preview. There is no on-disk component output; everything lives in a virtual file system that is serialized into SQLite per project.

## Commands

- `npm run setup` — install deps, generate Prisma client, run migrations (run once after clone)
- `npm run dev` — start Next.js dev server with Turbopack on port 3000
- `npm run dev:daemon` — same, but backgrounded with logs to `logs.txt` (useful when you need to leave the server running and tail logs)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — Next.js ESLint
- `npm test` — run Vitest suite (jsdom environment)
- `npx vitest run path/to/file.test.ts` — run a single test file
- `npx vitest run -t "test name"` — run tests matching a name
- `npm run db:reset` — destructive: wipe SQLite DB and re-run migrations

All `dev`/`build`/`start` scripts preload `node-compat.cjs` via `NODE_OPTIONS`. This is a Node 25+ workaround that deletes the experimental `globalThis.localStorage` / `sessionStorage` so SSR-time `typeof localStorage === "undefined"` guards behave correctly. Don't strip it.

## Environment

- `ANTHROPIC_API_KEY` is **optional**. When unset, `getLanguageModel()` returns `MockLanguageModel` (`src/lib/provider.ts`), which deterministically streams a hand-rolled "create a counter/form/card" tool sequence. Tests and offline dev rely on this — preserve the mock branch when touching the provider.
- `JWT_SECRET` defaults to `"development-secret-key"` if unset (`src/lib/auth.ts`).
- The default model is hardcoded as `claude-haiku-4-5` in `src/lib/provider.ts`.

## Architecture

### Virtual file system (the central abstraction)
`src/lib/file-system.ts` defines `VirtualFileSystem`, an in-memory tree of `FileNode`s. **No generated files are ever written to disk.** The same instance is:
1. Mutated server-side inside the chat tool handlers (`/api/chat`).
2. Serialized to JSON and persisted into `Project.data` (TEXT column) for logged-in users.
3. Hydrated client-side via `FileSystemProvider` (`src/lib/contexts/file-system-context.tsx`) and rendered by `FileTree`, `CodeEditor`, and `PreviewFrame`.

Server and client both apply mutations through `handleToolCall`, so streaming tool calls update the UI in real time as the model works.

### Chat → tool-call → file-system loop
`POST /api/chat` (`src/app/api/chat/route.ts`):
1. Prepends `generationPrompt` (`src/lib/prompts/generation.tsx`) as a cached system message.
2. Reconstructs a server-side `VirtualFileSystem` from the client-supplied `files` payload.
3. Calls `streamText` with two tools bound to that VFS:
   - `str_replace_editor` (`src/lib/tools/str-replace.ts`) — `create` / `str_replace` / `insert` commands.
   - `file_manager` (`src/lib/tools/file-manager.ts`) — `rename` / `delete`.
4. On `onFinish`, if a `projectId` is present and the session is valid, persists messages + serialized VFS back to `Project`.
5. `maxSteps` is intentionally clamped to **4 for the mock provider** (avoid infinite loops in offline mode) and **40 for real Claude**.

Any new tool must mutate the VFS server-side **and** be mirrored in `handleToolCall` inside `file-system-context.tsx`, otherwise the preview won't reflect the change live.

### Live preview (`PreviewFrame`)
`src/components/preview/PreviewFrame.tsx` + `src/lib/transform/jsx-transformer.ts` compile JSX/TSX in the browser using `@babel/standalone`, build an import map, and inject everything into a sandboxed iframe. Convention: the entry point is `/App.jsx` (other fallbacks: `/App.tsx`, `/index.jsx`, `/index.tsx`, `/src/App.*`). Imports beginning with `@/` are resolved against the VFS root. The `generationPrompt` enforces these conventions on the model side — keep prompt and transformer in sync.

### Auth & persistence
- JWT cookie sessions via `jose` (`src/lib/auth.ts`); 7-day expiry, `httpOnly`.
- `src/middleware.ts` gates any route under `/api/projects` or `/api/filesystem` (no logged-in user → 401). Those route handlers don't currently exist — project CRUD and auth live in server actions under `src/actions/`. The only live API route is `/api/chat`, which is intentionally ungated so anonymous users can generate.
- Anonymous users can use the app fully; their work lives in `sessionStorage` via `src/lib/anon-work-tracker.ts` and is migrated to a real `Project` row on sign-up/sign-in.
- Prisma + SQLite (`prisma/schema.prisma`). The Prisma client is generated to `src/generated/prisma` (non-default location) — import `prisma` from `@/lib/prisma`, not from `@prisma/client` directly.

### Path alias
`@/*` → `src/*` (configured in both `tsconfig.json` and `vitest.config.mts` via `vite-tsconfig-paths`).

## Testing notes

- Vitest with jsdom; React Testing Library is set up. No global setup file — tests import what they need.
- Tests covering the VFS, JSX transformer, and React contexts live in `__tests__/` siblings of the code they cover.
- The mock provider makes `/api/chat` deterministic without an API key, but the route itself isn't directly tested — exercise it through the context/component tests.
