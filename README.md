# Pulse

A modern productivity platform foundation.

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router, Turbopack) + React 19
- TypeScript
- Tailwind CSS
- [TanStack Query](https://tanstack.com/query) for server state
- [Zustand](https://github.com/pmndrs/zustand) for client state
- [axios](https://axios-http.com/) for HTTP requests
- [react-hook-form](https://react-hook-form.com/) + [zod](https://zod.dev/) for forms and validation
- ESLint + Prettier (with `prettier-plugin-tailwindcss`)

## Prerequisites

- Node.js 18.18+ (or 20+)
- [pnpm](https://pnpm.io/) 9.15.0 (managed via `packageManager` in `package.json`)

## Getting Started

Install dependencies:

```bash
pnpm install
```

Set up environment variables by creating a `.env.local` file in the project root:

```bash
# Environment mode: development | production | test
NEXT_PUBLIC_APP_ENV=development

# Base URL for the API (used by the axios client)
NEXT_PUBLIC_API_BASE_URL=
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Available Scripts

| Command      | Description                              |
| ------------ | ----------------------------------------- |
| `pnpm dev`   | Start the dev server with Turbopack        |
| `pnpm build` | Build the app for production               |
| `pnpm start` | Start the production server                |
| `pnpm lint`  | Run ESLint                                  |

## Project Structure

```
src/
├── app/                # App Router pages, layouts, and global styles
├── lib/                # Env validation, constants, axios instance, query client, utils
├── middleware.ts       # Next.js middleware
├── providers/          # App-wide React providers (e.g. React Query)
└── services/
    ├── api/            # API client setup
    └── queries/        # React Query hooks
```

## Environment Variables

Environment variables are validated at startup via [`src/lib/env.ts`](src/lib/env.ts) using `zod`.

| Variable                     | Required | Description                                   |
| ----------------------------- | -------- | ---------------------------------------------- |
| `NEXT_PUBLIC_APP_ENV`         | No       | `development`, `production`, or `test` (defaults to `development`) |
| `NEXT_PUBLIC_API_BASE_URL`    | No       | Base URL used by the axios API client           |
