# Design — Spectre

## Stack
- **Next.js (App Router, TypeScript)** — scaffolded from `create-next-app`
  (standard starter template, disclosed as such in the submission).
- **Vercel (free tier)** for hosting. API routes run server-side so the browser
  never hits CORS walls on Sourcify/RPC.
- **No database, no auth, no wallet.** No secrets: every upstream call is to a
  public endpoint with no API key (Sourcify v2 API, public RPC endpoints).
- **Styling:** plain CSS (no heavy UI kit). One display face + one body face
  via `next/font/google`. Inline SVG ghost mark; no emoji icons.

## Architecture

```
Browser (single page)
  └─ POST /api/analyze { address, chain }
       ├─ Sourcify v2 API  → verified source files (chain-aware)
       ├─ Public RPC (chain) → eth_getBalance, eth_getStorageAt (EIP-1967
       │   implementation slot), eth_call for totalSupply/balanceOf
       ├─ Detectors (lib/detectors/*.ts, pure functions) → findings[]
       └─ Rank + verdict → JSON { verdict, summary, findings, liveState }
```

- `lib/sourcify.ts` — fetch + normalize verified source (multi-file → pick
  main contract file; keep file:line mapping honest).
- `lib/chain.ts` — chain table: id, name, Sourcify chain id, public RPC URL(s)
  with fallback order.
- `lib/rpc.ts` — minimal JSON-RPC client (fetch, 8 s timeout, 1 retry).
- `lib/detectors/` — one file per detector (D1–D10), each exporting
  `detect(files, liveState) → Finding[]`. D1 follows the validated prototype
  in `/tmp/spectre-prototype/detect.mjs` (research only — reimplement cleanly
  from the requirements, do not copy-paste the prototype).
- `lib/verdict.ts` — verdict rules: any Critical/High → AUDIT (with a note
  that findings are leads, not confirmed bugs); unverified → SKIP; no findings
  above Low → SKIP (clean) with reason.
- `lib/report-md.ts` — findings → Markdown export.
- `app/page.tsx` — the single page: input, examples, progress, verdict,
  findings, live-state panel, export.
- `app/api/analyze/route.ts` — the only API route.

## Detector honesty rules
- A finding MUST cite a real file:line from the fetched source. No finding
  without evidence.
- Detector output is a *lead*, never a confirmed vulnerability. The report
  says so in one line under the verdict.
- Live-state facts shown in the report are only the values actually read.

## UI structure (one page, top to bottom)
1. Header: name "Spectre", one-line promise, ghost mark.
2. Input row: address field + chain select + Analyze button.
3. Example buttons (3 preloaded contracts).
4. Progress (named steps) → Verdict banner → Findings list (severity-sorted,
   expandable) → Live-state panel → Export Markdown button.
5. Footer: "How it works" (4 steps) + honest limits ("heuristics, not a full
   audit; verify every lead").

## Design language (haunted terminal)
- Near-black background (#0a0f0a-ish), spectral-green accent, warm off-white
  text. Body text contrast ≥ 4.5:1; large text ≥ 3:1.
- Generous spacing; tight groups. One authored motion moment (the ghost mark
  drift on load); no scattered animations.
- States: hover / disabled / loading / error / empty — all styled, all real.

## Error handling
- Bad address → "That doesn't look like an EVM address" + what a valid one
  looks like. Unverified contract → SKIP with reason. Upstream down →
  "Sourcify/RPC didn't answer — try again in a minute" (name which one).
- Never show a stack trace to the user. Log server-side only.
