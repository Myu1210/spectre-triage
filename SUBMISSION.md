# SUBMISSION.md — Spectre (Devpost draft, Kiroween 2026)

> DRAFT — do not submit from here. Submission is the entrant's step.
> Deadline: 4 Dec 2026 14:00 PT (5 Dec 2026 05:00 WIB).
> Category: **Frankenstein**. Repo: https://github.com/Myu1210/spectre-triage
> Live URL: **https://spectre-triage.vercel.app/** (deployed 19 Nov 2026, Vercel Production).

## What it does

Spectre is the ghost that haunts the graveyard of dead contracts. Paste an
EVM contract address, pick a chain (Ethereum, BSC, Base, Arbitrum, Optimism),
and in under 30 seconds it tells you whether the contract is worth auditing —
or already dead.

Bug-bounty hunters burn most of their time on triage, not auditing. Most
programs die before the audit starts: unverified code, frozen repos,
already-found bugs, or contracts that cannot pay. Spectre automates the
triage step:

1. **Fetch** — verified source from Sourcify + live on-chain state (proxy
   implementation, ETH balance, token data) from public RPCs. Read-only.
   No wallet, no signing, no keys, no account.
2. **Detect** — 10 hand-written static detectors (TypeScript, pure functions
   over source + live state): mapping cleared with the wrong key (the exact
   bug class of a real HIGH found on Kiln V2 in Nov 2026), reentrancy
   patterns, missing access control, unchecked external calls, `tx.origin`
   auth, unbounded loops, oracle staleness, centralization risk,
   uninitialized proxies, `selfdestruct`/user-controlled `delegatecall`.
3. **Report** — verdict (AUDIT / SKIP) + severity-ranked findings with real
   file:line, why it matters, and a PoC direction for each. Export as
   Markdown. Every finding is labelled a *lead*, never a confirmed bug.

## Try it (one-click examples)

- **Kiln vTreasury** (`0xA06634ed78C5121c2A3702b90b6E3926c7B2A641`,
  Ethereum) → AUDIT: D1 HIGH, mapping cleared with the wrong key at
  `src/vTreasury.sol:155` — the real Kiln HIGH.
- **Multicall3** (`0xcA11bde05977b3631167028862bE2a173976CA11`, Ethereum)
  → SKIP: 0 findings, 0 HIGH — the clean control.
- **Chainlink ETH/USD feed**
  (`0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`, Ethereum) → AUDIT: 1× D3
  High + 4× D7 Medium.

## How we built it (Kiro usage — truthful)

The build was spec-driven: the full spec (requirements, design, task list)
lives in `.kiro/specs/spectre/`, steering docs stating the stack and
conventions live in `.kiro/steering/`, and an agent hook
(`.kiro/hooks/typecheck-tests-on-save.json`, typecheck + unit tests on file
save, validated against the hook schema in the official Kiro docs at
kiro.dev/docs/hooks/) lives in `.kiro/hooks/`. The build followed those
docs, and the pass/fail checks from the spec were run and recorded in
`BUILD-LOG.md` (48/48 unit tests, `npm run build` zero errors, Kiln D1
HIGH verified live, Multicall3 0 HIGH verified live).

One honest disclosure: the implementation itself was written by **Muse**,
not by the Kiro CLI. Kiro CLI login was blocked in this environment
(device-flow sign-in safety-flagged, loopback OAuth unreachable from the
cloud browser, and the entrant has no laptop), so the spec/steering/hook
were authored in Kiro format and the code was built by Muse following
them. The Next.js scaffold is the standard `create-next-app` starter
template. The detectors are hand-written TypeScript heuristics —
rules-based triage, no LLM — and the report says so: findings are leads
to verify, not a full audit.

## What's next

Live URL is deployed; record the < 3 min demo video, and submit. Stretch goal (only after the
checks pass): a Solana tab.

## Links

- Repo: https://github.com/Myu1210/spectre-triage
- Live demo: https://spectre-triage.vercel.app/
- License: MIT
