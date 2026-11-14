# Steering — structure

## Repo layout
```
spectre/
  README.md  LICENSE  .gitignore
  package.json  tsconfig.json  next.config.* 
  app/
    page.tsx            # the single page
    layout.tsx
    globals.css         # haunted-terminal styles
    api/analyze/route.ts
  lib/
    chain.ts  sourcify.ts  rpc.ts
    verdict.ts  report-md.ts
    detectors/          # one file per detector: d1.ts … d10.ts
  .kiro/
    specs/spectre/      # requirements.md, design.md, tasks.md
    steering/           # this file + tech.md
    hooks/              # agent hooks (JSON, schema validated against kiro-cli)
```

## Conventions
- TypeScript strict. No `any` without a one-line comment saying why.
- Detectors are pure functions: `(files, liveState) => Finding[]`. No network
  inside detectors. No side effects.
- Every finding cites a real file:line. A detector that cannot locate evidence
  returns nothing — never invent.
- Server code never trusts the client: validate the address server-side.
- No secrets anywhere. No `.env` needed for v1 (all upstreams are public).
- Small diffs, one concern per commit. Commit messages in English, imperative.
- Do not add dependencies without naming them in the build log with a reason.
