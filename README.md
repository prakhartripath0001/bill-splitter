# Bill Splitter

A small shared-expense app for managing homes, members, bills, and payments. The application lets you create a home, add members in order, split a bill across all members, and mark individual shares as paid with idempotent payment handling.

## What this app does

- Create homes and members
- Add bills with total amounts in whole cents
- Split totals across members using stable ordering
- Mark shares as paid with a required idempotency key
- View outstanding balances per member
- Provide a lightweight React UI for interacting with the API

## Stack

- API: Hono on Cloudflare Workers
- Database: Cloudflare D1 / SQLite via Wrangler
- Web: React + Vite + TanStack Router
- Language: TypeScript
- Testing: Vitest
- Linting/formatting: Biome

## Project structure

- `api/` – API server, migrations, and tests
- `web/` – frontend app
- `assignment.md` – assignment brief and requirements
- `package.json` – workspace scripts

## Getting started

Install dependencies at the repo root:

```bash
pnpm install
```

Start the app in development mode:

```bash
pnpm dev
```

This runs:

- API on `http://localhost:8787`
- Web app on `http://localhost:5173`

## Available scripts

```bash
pnpm dev
pnpm test
pnpm check
pnpm check:fix
pnpm format
pnpm lint
pnpm typecheck
pnpm build
```

## API overview

Core endpoints:

- `GET /api/health` – health check
- `POST /api/homes` – create a home
- `POST /api/homes/:homeId/members` – add a member to a home
- `POST /api/homes/:homeId/bills` – create a bill and split it across members
- `POST /api/bills/:billId/shares/:shareId/pay` – mark a share as paid
- `GET /api/homes/:homeId/balances` – view outstanding balances

The app follows the assignment requirements for:

- whole-cent money values
- member ordering for share distribution
- idempotent payment requests using `Idempotency-Key`
- consistent error JSON responses

## Development notes

The API applies database migrations automatically when run in development mode. The frontend uses the API layer from `web/src/lib/api.ts` to manage requests and error states.

## Decisions

1. **Store money in integer cents**

   I store bill amounts and individual shares as integer cents instead of floating-point values. This avoids decimal precision issues when calculating and splitting payments.

2. **Distribute remaining cents deterministically**

   When a bill cannot be divided equally, the remaining cents are distributed one by one to the first members. This ensures that the total of all shares always equals the original bill amount.

3. **Use idempotency keys for payments**

   Each payment request requires an idempotency key. Retrying a request with the same key does not create another payment. I also use a conditional database update to prevent multiple requests from marking the same share as paid.

## License

This project is for the assignment and is intended for local development and demonstration purposes.
