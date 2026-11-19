# BUILD-LOG — Spectre (Kiroween 2026, Frankenstein)

Repo: https://github.com/Myu1210/spectre-triage — branch `master`.
Stack: Next.js 16.4.6 App Router + TypeScript (strict), plain CSS, Vitest.
All reads are public (Sourcify v2 API, public RPCs). No secrets, no wallet,
no database, no LLM anywhere in the app.

## Package D changes (2026-11-19)

### D9 reachability fix (commit `d3fa0f3`)
Root cause: `app/api/analyze/route.ts` set `isProxy: implementation !== null`,
and `lib/rpc.ts` `getImplementation` returns `null` both when a contract is
not a proxy AND when its EIP-1967 slot is zero — so `detectD9`'s
`if (!liveState.isProxy) return []` could never fire. D9's own logic in
`lib/detectors/d9.ts` was correct and was NOT touched.

Fix (surgical, 3 files):
- `lib/rpc.ts`: new pure helper `isEip1967ProxyCode(code: string): boolean`
  — true when the runtime code contains the EIP-1967 implementation-slot
  constant `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`
  (hex, case-insensitive); `0x` returns false. Plus `getCode`
  (`eth_getCode`) and `isEip1967Proxy` (code-based). Code comment records
  that D9 covers EIP-1967 proxies only; EIP-1167 minimal proxies are out
  of scope.
- `app/api/analyze/route.ts`: `isProxy` now comes from `isEip1967Proxy`
  (run in parallel with the other live-state reads); `implementation`
  stays the slot value (null when zero).
- `lib/rpc.test.ts`: 4 pure unit tests (positive, case-insensitive,
  negative, empty code) + 1 live Kiln regression test
  (`isEip1967Proxy` false for Kiln).

Live verification of the fix (local production server, 2026-11-19):
- Kiln vTreasury: `isProxy: false`, `implementation: null`, D9 silent.
- Aave V3 Pool `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` (Ethereum, live
  EIP-1967 proxy, Sourcify-verified): `isProxy: true`,
  `implementation: 0x4295fe69b3e978eb511e4558b4407ad871612fcb`, D9 silent
  (implementation is set, so there is nothing to flag — correct).
  - Note: USDC, USDT, DAI, stETH and WETH were probed first and are NOT
    EIP-1967 proxies by this test (their bytecode does not contain the
    slot constant); Aave V3 Pool / V2 LendingPool do. A zero-slot
    EIP-1967 proxy (D9 actually firing) was not found live — no such
    contract was observed; the firing path is covered only by the D9
    unit tests, which pass.
- `npm test`: 48/48 (was 43/43 before this package).

### Kiro hook — spec task 4.1 (commit `d3fa0f3`)
Created `.kiro/hooks/typecheck-tests-on-save.json` (valid JSON, 2 hooks):
`PostFileSave` on `^(app|lib)/.*\.(ts|tsx)$` → `npx tsc --noEmit`, and
`PostFileSave` on the same matcher → `npm test` (timeout 120 s each).

Validation status (honest):
- Schema confirmed against the official docs, read-only:
  https://kiro.dev/docs/hooks/ (page updated 2026-11-12) — top-level
  `{ "version": "v1", "hooks": [...] }` with `name`, `trigger`
  (PascalCase `PostFileSave`), `matcher` (regex), `action: { type:
  "command", command }`, optional `timeout`/`enabled`. Our file matches
  every field. JSON validity + matcher regexes checked locally with node.
- NOT confirmed by the CLI: installed `kiro-cli` 3.3.0
  (`~/.local/bin/kiro-cli`) exposes no hooks subcommand and no hook
  validator (`--help`, `agent --help`, `settings --help` inspected
  read-only; there is an `agent validate` for agent configs only, not
  hooks). No `kiro-cli login` was attempted (blocked, per brief).
  Remaining: open the repo in Kiro IDE/CLI V3 once logged in and confirm
  the hooks activate on save.

### Steering check — spec task 4.2
Steering docs (`.kiro/steering/structure.md`, `tech.md`) were followed:
TypeScript strict, detectors pure `(files, liveState) => Finding[]`, every
finding cites a real file:line, server validates the address, no secrets,
small diffs / one concern per commit / imperative English messages,
`.kiro/` ships in the repo (explicitly NOT in `.gitignore`).
Deviations recorded:
1. `vitest` added as a devDependency (test runner; required by the spec's
   own verify steps).
2. Two dead RPC endpoints swapped in `lib/chain.ts` (verified live
   2026-11-19 via eth_chainId probe): `eth.llamarpc.com` →
   `eth.drpc.org`, `base.llamarpc.com` → `base.publicnode.com`
   (both returned Cloudflare 525).
3. D9 fix in this package (see above) — route now reads `eth_getCode`
   in addition to the previously listed RPC methods.
4. `next dev` returns 500s in this sandbox while `npm run build` +
   `npm start` work — sandbox quirk, not a repo defect. All live checks
   below ran against `npm start` (production server, port 3100).
5. No dependencies beyond the scaffold + vitest were added.

## Pass / fail checks — spec task 5.1 (run 2026-11-19)

### 1. `npm run build` — PASS
Zero errors. `Compiled successfully in 11.1s`, TypeScript clean,
routes: `/` (static), `/api/analyze` (dynamic).

### 2. Kiln vTreasury → D1 HIGH — PASS
`POST /api/analyze` `{ address: 0xA06634ed78C5121c2A3702b90b6E3926c7B2A641,
chain: "ethereum" }` on the local production server: 3.7 s, HTTP 200,
verdict AUDIT. Findings include **D1 High — `src/vTreasury.sol:155`,
"Mapping cleared with the wrong key"** (plus a D10 High in an
OpenZeppelin dependency file, which is a lead, not the target finding).
`liveState.isProxy: false`, D9 silent (regression check for the fix).

### 3. Clean control → 0 HIGH findings — PASS
Multicall3 `0xcA11bde05977b3631167028862bE2a173976CA11` (Ethereum),
re-verified live 2026-11-19 on the local production server: 1.9 s,
HTTP 200, verdict SKIP, **0 findings, 0 High/Critical**.

### 4. End-to-end < 30 s at the public URL; Markdown export downloads — PARTIAL (deploy blocked)
- All four live analyses on the local production server completed in
  under 8 s (Kiln 3.7 s, Multicall3 1.9 s, Chainlink 7.5 s, Aave V3
  Pool 4.5 s) — the < 30 s budget holds with wide margin.
- Markdown export: the export path is implemented (`app/page.tsx`
  `exportMarkdown` → `lib/report-md.ts` `toMarkdown`, download via a
  Blob anchor) and covered by unit tests (`lib/report-md.test.ts`,
  2 tests passing). The actual download click could NOT be exercised
  end-to-end: there is no public URL (deploy blocked, see below) and no
  live browser in this environment. Entrant to click "Export Markdown"
  once on the deployed URL and confirm the `.md` downloads.

### 5. Repo contains `/.kiro`, MIT `LICENSE`, `README.md` — PASS
All tracked in git (`git ls-files`): `.kiro/specs/spectre/`
(requirements/design/tasks), `.kiro/steering/` (structure/tech),
`.kiro/hooks/typecheck-tests-on-save.json`, `LICENSE` (MIT, Copyright
(c) 2026 Wahyuni), `README.md`. `.gitignore` explicitly refuses to
ignore `.kiro`. README was corrected in this package: it previously
claimed the app "will be written BY Kiro" — it now states truthfully
that the spec/steering/hook are Kiro-format, the implementation was
built by Muse because Kiro CLI login was blocked, the scaffold is the
standard `create-next-app` template, and the detectors are heuristic
leads (rules-based, no LLM, not a full audit).

## R4 examples (recorded, verified live 2026-11-19)
| Example | Address (Ethereum) | Verdict | Result |
|---|---|---|---|
| Kiln vTreasury | `0xA06634ed78C5121c2A3702b90b6E3926c7B2A641` | AUDIT | D1 High at `src/vTreasury.sol:155` (+ D10 High) |
| Multicall3 (clean control) | `0xcA11bde05977b3631167028862bE2a173976CA11` | SKIP | 0 findings, 0 HIGH |
| Chainlink ETH/USD feed | `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` | AUDIT | 1× D3 High + 4× D7 Medium |
| (extra, D9 fix proof) Aave V3 Pool | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` | AUDIT | `isProxy: true`, impl `0x4295fe…2fcb`, D9 silent |

## Deploy — spec task 5.2: BLOCKED (no public URL)
- The pre-installed `vercel` binary (`/opt/hatch/bin/vercel`) is
  Vercel's MCP-server shim only — its commands are `status`,
  `authorize-url`, `exchange-code`, `refresh`, `disconnect`,
  `list-tools`, `call-tool`. No `deploy`, no `whoami`. `vercel status`
  reports `{"auth_status":"not_connected","authenticated":false}`.
  No Vercel auth config exists (`~/.vercel`, `~/.config/vercel`
  absent) and `VERCEL_TOKEN` is not set.
- Real CLI attempted non-interactively: `npx -y vercel@latest`
  (CLI 66.2.0) `deploy --prod --yes` →
  `Error: No existing credentials found. Run vercel deploy --temporary
  to create a temporary deployment you can claim later, or vercel login
  to log in.` (https://err.sh/vercel/no-credentials-found)
- Fallback attempted: `deploy --temporary --yes` →
  `Temporary deployments aren't available for this attempt. Log in to
  continue. Error: No existing credentials found. Please run vercel
  login or pass "--token"`.
- STOPPED here, honestly. No login was attempted (needs interactive
  OAuth the entrant must do). No live URL exists; none is claimed.
- Entrant step: on a machine/browser where she can log in, run
  `vercel login && vercel deploy --prod` from the repo root (or import
  the GitHub repo in the Vercel dashboard), then re-run check 4 at the
  public URL (Kiln example < 30 s + Export Markdown downloads).

## Remaining steps for the entrant
1. `vercel login` + deploy (see above); verify check 4 at the public URL.
2. Demo video < 3 min (screen-record the Kiln + Multicall3 examples).
3. Submit to Devpost (Kiroween 2026, Frankenstein) using `SUBMISSION.md`
   as the draft — DO NOT submit from here; submission is the entrant's step.
4. Optional: open the repo in Kiro (once logged in) and confirm the
   `.kiro/hooks/` hooks activate on file save.
