# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts the Next.js App Router source, including `page.tsx`, `layout.tsx`, and route handlers under `app/api/.../route.ts`.
- `app/components/` contains feature-level React components; shared primitives live in `components/ui/`.
- `app/lib/` stores helpers/utilities; `app/stores/` holds Zustand stores.
- `public/` contains static assets (images, icons).
- `app/globals.css` defines global styles and Tailwind layers.
- `.env.example` is the environment template for local setup.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` starts the Next.js dev server (Turbopack) at `http://localhost:3000`.
- `npm run build` creates a production build.
- `npm run start` serves the production build.
- `npm run lint` runs ESLint with `next/core-web-vitals` and `next/typescript` rules.

## Coding Style & Naming Conventions
- Use TypeScript/TSX with 2-space indentation; prefer double quotes as seen in existing files.
- Components use PascalCase file names (example: `ConsultingResearchForm.tsx`).
- Hooks, helpers, and stores use camelCase or kebab-case file names (examples: `auth-store.ts`, `researchHistory.ts`).
- API endpoints follow `app/api/<feature>/route.ts` naming and route nesting.

## Testing Guidelines
- No automated test framework is configured currently.
- If you introduce tests, add the runner to `package.json` scripts and document where tests live (for example, `__tests__/` or colocated next to source).

## Commit & Pull Request Guidelines
- Commit messages are short and imperative, often sentence-cased without conventional prefixes (examples from history: `Add Posthog analytics`, `remove unused imports`).
- PRs should include a concise summary, testing notes (or “Not tested”), and screenshots for UI changes. Link related issues when applicable.

## Security & Configuration Tips
- Copy `.env.example` to `.env` and keep secrets local; never commit API keys.
- `NEXT_PUBLIC_APP_MODE` controls auth mode; ensure related OAuth variables are set before deploying.
