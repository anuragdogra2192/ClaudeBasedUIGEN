# UIGen

AI-powered React component generator with live preview.

Describe a component in chat; Claude generates the files and the app compiles and renders them in a sandboxed iframe — no files are ever written to disk. Work is persisted per-project in SQLite for signed-in users, and kept in `sessionStorage` for anonymous users (migrated on sign-up).

## Prerequisites

- Node.js 18+ (scripts preload a small shim in `node-compat.cjs` to neutralize experimental `globalThis.localStorage` on Node 25+)
- npm

## Setup

1. **Optional** — create a `.env` file in the project root and add your Anthropic API key:

   ```
   ANTHROPIC_API_KEY=your-api-key-here
   ```

   The project will run without an API key. When unset, a mock provider returns a deterministic tool-call sequence that builds one of three demo components — `counter`, `form`, or `card` — based on keywords in your prompt. Great for offline dev and tests, not great for anything else.

2. Install dependencies and initialize the database:

   ```bash
   npm run setup
   ```

   This installs dependencies, generates the Prisma client, and runs migrations.

## Running the Application

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Use `npm run dev:daemon` to run the dev server in the background with logs streamed to `logs.txt`.

### Production

```bash
npm run build
npm start
```

## Testing

```bash
npm test                                 # run the full Vitest suite (jsdom)
npx vitest run path/to/file.test.ts      # run one file
npx vitest run -t "test name"            # filter by test name
```

## Usage

1. Sign up, or continue as an anonymous user.
2. Describe the React component you want to create in the chat.
3. Watch the component render live in the preview pane as the model streams tool calls.
4. Switch to the Code view to read or edit the generated files directly.
5. Iterate with the AI to refine the component.

## Features

- AI-powered component generation via Claude (Vercel AI SDK)
- Live in-browser preview with JSX/TSX compiled by `@babel/standalone`
- Virtual file system (no files written to disk; serialized to SQLite per project)
- Monaco-based code editor with a file tree
- JWT cookie auth with per-user project persistence
- Anonymous usage with automatic migration to a real project on sign-up
- Offline-friendly mock provider when no API key is configured

## Tech Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Prisma + SQLite
- Anthropic Claude via the Vercel AI SDK
- Monaco Editor, Radix UI primitives, `jose` (JWT), `bcrypt`
- Vitest + React Testing Library

## Architecture

See [`CLAUDE.md`](./CLAUDE.md) for an overview of the virtual file system, chat → tool-call → preview loop, JSX transformer, and auth/persistence model.
