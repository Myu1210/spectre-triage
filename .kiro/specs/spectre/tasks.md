# Tasks — Spectre (implement in order; verify each step before the next)

## 0. Scaffold
- [ ] 0.1 Run `create-next-app` (TypeScript, App Router, no Tailwind — plain CSS
  per design) inside this repo root. Verify: `npm run build` passes on the
  untouched template.
- [ ] 0.2 Confirm `.kiro/` is NOT in `.gitignore` (it must ship in the repo).

## 1. Data layer (no UI yet)
- [ ] 1.1 `lib/chain.ts` — chain table (Ethereum, BSC, Base, Arbitrum,
  Optimism) with Sourcify chain ids + public RPC URLs + fallback order.
  Verify: a unit test prints the table for all 5 chains.
- [ ] 1.2 `lib/sourcify.ts` — fetch verified source from Sourcify v2 API.
  Verify: fetch Kiln vTreasury source on Ethereum; assert the returned files
  include `vTreasury.sol` with the `_exitAndFundCoverageFund` function.
- [ ] 1.3 `lib/rpc.ts` — minimal JSON-RPC client (8 s timeout, 1 retry).
  Verify: `eth_getBalance` + EIP-1967 implementation slot read for the Kiln
  pool proxy return plausible values.
- [ ] 1.4 `lib/detectors/d1.ts` — mapping-key-mismatch detector, reimplemented
  from `requirements.md` R2/D1 (do NOT copy the /tmp research prototype — it
  was wiped with /tmp on VM replacement; re-derive from the requirements and
  re-validate here). Fixtures in the local audit archive
  `~/workspace/bug-bounty/kiln-v2/`: `vTreasury.sol` at
  `src/impl/cub/treasury-impl/src/vTreasury.sol`, clean control `MultiPool.sol`
  at `src/impl/lst-impl-a/src/MultiPool.sol` (do not ship fixtures).
  Verify: flags line ~155 in the real vTreasury source; 0 findings on the
  MultiPool source.

## 2. Remaining detectors + verdict + report
- [ ] 2.1 `lib/detectors/d2.ts`–`d10.ts` — one file per detector per R2.
  Verify: each detector has at least one positive and one negative unit test.
- [ ] 2.2 `lib/verdict.ts` + `lib/report-md.ts`. Verify: verdict AUDIT when a
  HIGH exists, SKIP when unverified, SKIP-clean when no finding above Low;
  Markdown export contains verdict + findings + live-state facts.
- [ ] 2.3 `app/api/analyze/route.ts` — wire fetch → detectors → verdict.
  Verify: `curl` the route with the Kiln vTreasury address; response contains
  the D1 HIGH. Response time < 30 s.

## 3. UI
- [ ] 3.1 Single page per design.md: input, chain select, examples, progress,
  verdict, findings, live-state panel, export. Verify: every state renders
  (loading, error ×3, empty) — screenshot each.
- [ ] 3.2 Haunted-terminal styling per design.md + craft-floor checks
  (contrast, spacing, focus rings, responsive). Verify: phone-width layout
  has no overflow; body contrast ≥ 4.5:1.
- [ ] 3.3 Example buttons (Kiln vTreasury, clean control, one more audited
  contract). Verify: clicking each fills the form AND runs the analysis.

## 4. Kiro-native pieces
- [ ] 4.1 Create an agent hook in `.kiro/hooks/` (typecheck + unit tests on
  file save). Validate the hook schema against the installed Kiro CLI first;
  fix the schema if Kiro rejects it.
- [ ] 4.2 Confirm steering docs in `.kiro/steering/` were followed; note any
  deviation in the build log.

## 5. Verify, deploy, document
- [ ] 5.1 Run ALL five pass/fail checks from `requirements.md`. Record the
  result of each (pass/fail + evidence) in `BUILD-LOG.md`.
- [ ] 5.2 Deploy to Vercel (free tier) and verify the public URL end-to-end
  (Kiln example → D1 HIGH in < 30 s; Markdown export downloads).
- [ ] 5.3 Write the Devpost write-up draft (`SUBMISSION.md`): description,
  Kiro usage (truthful, from the build log), category = Frankenstein,
  repo URL, live URL. Do NOT submit — submission is the entrant's step.
- [ ] 5.4 STOP and report: live URL, repo URL, check results, and the exact
  remaining steps for the entrant (demo video, Devpost submit).

## Stretch (only if all checks pass with time to spare)
- [ ] S.1 Solana tab: paste a program id → fetch IDL → 3–4 Anchor-pattern
  detectors. Only if the EVM flow is fully green first.
