# Steering — tech

## Stack (decided, do not swap without a reason in the build log)
- Next.js App Router + TypeScript (scaffold: `create-next-app`, standard
  starter template).
- Plain CSS. No Tailwind, no UI kit — the design is custom and small.
- Vercel free tier for hosting. API routes run server-side (avoids CORS on
  Sourcify/RPC).
- `next/font/google` for fonts (one display face + one body face).

## Upstreams (public, no keys)
- Sourcify v2 API (`sourcify.dev/server/v2/contract/{chainId}/{address}`) for
  verified source.
- Public RPC endpoints per chain (see `lib/chain.ts`): only `eth_getBalance`,
  `eth_getStorageAt`, `eth_call` for view functions. 8 s timeout, 1 retry,
  fallback to the next RPC in the list.
- No other third-party APIs in v1.

## Hard constraints
- Read-only. No wallet connect, no signing, no transactions, no payments.
- No user data stored. No database. No analytics.
- Never present a detector lead as a confirmed vulnerability. The UI says
  "lead" and the report says "verify every lead".
- `.kiro/` must ship in the repo. Never add it to `.gitignore`.
- Node 24, npm. `npm run build` must pass with zero errors before any demo.
