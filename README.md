# Spectre — Triage Desk for Smart-Contract Bounties

**Kiroween 2026 entry · Category: Frankenstein**

Spectre is the ghost that haunts the graveyard of dead contracts. Paste a contract
address and it tells you, in under 30 seconds, whether the contract is worth
auditing — or already dead.

It stitches together four technologies that were never meant to meet in one app:
verified source from **Sourcify**, live on-chain state from public **EVM RPCs**,
a battery of hand-written **static detectors** (TypeScript, no heavy tooling),
and a **triage report** that ranks leads by severity with file:line,
explanation, and a PoC direction for each. (The verdict is rules-based, not
an LLM call — the report says "lead", never "confirmed bug".)

## The problem

Bug-bounty hunters burn most of their time on triage, not auditing. Most programs
die before the audit starts: unverified code, frozen repos, already-found bugs,
or contracts that cannot pay. Our team ran 50 audit runs in 2026; the majority
ended in triage. Spectre automates the triage step.

## What it does

1. **Fetch** — verified source from Sourcify + live state (proxy implementation,
   balances, admin) from public RPC. Read-only. No wallet, no signing, no keys.
2. **Detect** — ~10 lightweight detectors over source + live state, e.g. mapping
   cleared with the wrong key (the exact bug class of a real HIGH we found on
   Kiln V2 in Nov 2026), reentrancy patterns, missing access control, unchecked
   external calls, `tx.origin` auth, unbounded loops, oracle staleness,
   centralization risk, uninitialized proxies.
3. **Report** — verdict (AUDIT / SKIP) + severity-ranked findings with file:line,
   why it matters, and how to prove it. Export as Markdown.
4. **Examples** — one-click preloaded contracts, including a known-vulnerable
   and a known-clean control.

## Status (2026-11-19)

- ✅ App built and verified: `npm test` 48/48, `npm run build` zero errors
- ✅ Kiln vTreasury → D1 HIGH at `src/vTreasury.sol:155`; Multicall3 clean
  control → 0 HIGH findings; Chainlink ETH/USD feed → 1× D3 High + 4× D7 Medium
- ✅ Spec + steering + agent hook in `.kiro/` (see `BUILD-LOG.md` for the
  full check log)
- ⏳ Deploy BLOCKED on Vercel auth (no credentials in this environment;
  `vercel login` is the entrant's step) — see `BUILD-LOG.md`

## How it was built (honest note)

The spec, steering docs, and agent hook were authored in Kiro format and the
build followed them — but the implementation itself was written by Muse, not
by the Kiro CLI, because Kiro CLI login was blocked (device-flow
safety-flagged, loopback OAuth unreachable from the cloud browser, and the
entrant has no laptop). The Next.js scaffold is the standard `create-next-app`
starter template. The detectors are hand-written TypeScript heuristics:
rules-based triage, not an LLM, and every finding is a lead to verify, not a
confirmed vulnerability — never a full audit.

## How to run it

```bash
npm install
npm test     # vitest suite (includes live RPC/Sourcify checks)
npm run build
npm start    # production server on http://localhost:3000
```

## Pass / fail checks (must ALL pass before demo)

1. `npm run build` — zero errors.
2. Kiln vTreasury `0xA06634ed78C5121c2A3702b90b6E3926c7B2A641` → report contains the
   D1 mapping-key HIGH at `vTreasury.sol` (~line 155) with a correct explanation.
3. Known-clean control contract → 0 HIGH findings.
4. End-to-end analyze at the public URL completes in < 30 s; Markdown export works.
5. Repo contains `/.kiro` (specs + steering + hooks), MIT `LICENSE`, this README.

## Deploy

Vercel (free tier), Next.js App Router. API routes do the fetching server-side
(Sourcify + RPC) so the browser never hits CORS walls.

## License

MIT — see `LICENSE`.
