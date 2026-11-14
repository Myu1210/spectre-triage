# Requirements — Spectre (Kiroween 2026, Frankenstein)

## Overview
Spectre is a single-page web app that triages EVM smart contracts for bug-bounty
auditing. The user pastes a contract address; the app fetches verified source
(Sourcify) + live on-chain state (public RPC), runs lightweight static detectors,
and returns a ranked triage report. No wallet, no login, no database, no secrets.
All reads are public.

## Requirements

### R1 — Analyze flow
- **R1.1** User enters an EVM contract address + picks a chain (Ethereum, BSC,
  Base, Arbitrum, Optimism). "Analyze" starts the flow.
- **R1.2** The app fetches verified source from the Sourcify v2 API for that
  chain. If the contract is NOT verified, the report says so plainly and stops
  with verdict SKIP (reason: unverified code cannot be triaged) — no fake results.
- **R1.3** The app fetches live state via a public RPC: ETH balance, proxy
  implementation (EIP-1967 slots), and `totalSupply`/`balanceOf` where applicable.
- **R1.4** End-to-end analyze completes in < 30 seconds on a normal connection.
  A visible progress state names the current step (fetching source → reading
  live state → running detectors → ranking).

### R2 — Detectors (server-side, TypeScript, pure functions over source + live state)
Each detector returns: id, title, severity (Critical/High/Medium/Low/Info),
file, line, explanation (why it matters), and PoC direction (how to prove it).
- **D1** Mapping cleared with the wrong key: a mapping entry cleared with a
  `msg.sender` key inside a non-callback function while the same mapping is
  keyed differently elsewhere. (Validated prototype: flags Kiln vTreasury
  `_exitAndFundCoverageFund` line ~155; 0 findings on MultiPool.)
- **D2** Reentrancy pattern: external call before a state update in the same
  function, with no reentrancy guard detected.
- **D3** Missing access control: a state-changing function that moves funds or
  changes an owner/admin with no `onlyOwner`/`onlyRole`/equivalent check.
- **D4** Unchecked external call return value (low-level `.call` without a
  success check).
- **D5** `tx.origin` used for authorization.
- **D6** Unbounded loop over a user-controlled array.
- **D7** Oracle price used without a staleness/timestamp check.
- **D8** Centralization: a single admin/EOA can drain, pause, or upgrade.
- **D9** Proxy with uninitialized or zero implementation.
- **D10** `selfdestruct` or `delegatecall` to user-controlled address.
- Detectors MUST NOT invent findings: every finding cites a real file:line from
  the fetched source. A detector that cannot locate its evidence returns nothing.

### R3 — Report
- **R3.1** Verdict banner: AUDIT (worth auditing) or SKIP (with the top reason),
  plus a one-line summary.
- **R3.2** Findings sorted by severity, each expandable: title, severity badge,
  file:line, explanation, PoC direction.
- **R3.3** A "live state" panel: implementation address, ETH balance, and the
  scope facts the detectors used — i.e. the values read in R1.3 (proxy
  implementation, ETH balance, `totalSupply`/`balanceOf` where applicable).
  Only values actually read are shown.
- **R3.4** Export report as Markdown (download button). The Markdown contains
  verdict, findings, and live-state facts — no invented data.

### R4 — Examples (one-click, no typing)
- Preloaded: (a) Kiln vTreasury `0xA06634ed78C5121c2A3702b90b6E3926c7B2A641`
  (Ethereum — must surface the D1 HIGH), (b) a known-clean control contract
  (must surface 0 HIGH findings) — a deployed, Sourcify-verified contract
  chosen during the build and verified clean BEFORE the demo (the local
  `MultiPool.sol` fixture is the unit-test control, not the on-chain
  example; the chosen address + its expected 0-HIGH result are recorded in
  `BUILD-LOG.md`), (c) one more real audited contract, same rule
  (deployed + verified + expected result recorded before the demo).
  The example buttons fill the form AND run the analysis.

### R5 — States & quality
- Loading, error (bad address, unverified contract, RPC/Sourcify down — each
  error names the problem and the recovery), and empty states all exist.
- Responsive: usable on a phone. Keyboard-focusable controls. Body text
  contrast ≥ 4.5:1.
- Design: haunted-terminal dark UI (near-black, spectral-green accent, one
  authored ghost mark as inline SVG). No emoji as icons. No gradient text.

### R6 — Kiro usage (judged!)
- Spec-driven: this spec + design + tasks live in `.kiro/specs/spectre/`.
- Steering docs in `.kiro/steering/` state stack and conventions; the build
  follows them.
- At least one agent hook (e.g. typecheck + unit tests on file save) in
  `.kiro/hooks/` — validate the hook schema against the installed Kiro CLI
  before finalizing.
- The submission write-up (Devpost) will describe Kiro usage truthfully from
  this build log.

## Non-goals (do NOT build)
- Solana tab (stretch goal only after ALL pass/fail checks pass).
- Watchlists, user accounts, history, payments, wallet connect.
- Full audit engine (Slither/Foundry in the browser) — detectors are
  lightweight heuristics by design; the report says so honestly.

## Pass / fail checks (ALL must pass before demo)
1. `npm run build` — zero errors.
2. Kiln vTreasury → report contains the D1 HIGH at `vTreasury.sol` (~line 155).
3. Clean control contract → 0 HIGH findings.
4. End-to-end analyze at the public URL < 30 s; Markdown export downloads.
5. Repo contains `/.kiro` (specs + steering + hooks), MIT `LICENSE`, `README.md`.
