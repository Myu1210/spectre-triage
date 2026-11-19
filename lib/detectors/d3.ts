import type { Finding, LiveState, SourceFile } from '../types';
import { lineOf, parseFunctions, stripComments } from './util';

const FUNDS_RE = /\.(call\s*\{[^}]*value|transfer|send)\s*\(|payable\s*\(/;
/** Body assigns to an owner/admin variable or manages a role. */
const ADMIN_CHANGE_RE =
  /\b(owner|admin|pendingOwner)\s*=|grantRole\s*\(|revokeRole\s*\(|renounceRole\s*\(/;
const NAME_RE = /withdraw|transfer|setOwner|setAdmin|transferOwnership|grantRole|revokeRole|pause|upgrade/i;
const GUARD_RE =
  /only[A-Z]\w*|_checkOwner|require\s*\(\s*msg\.sender\s*==\s*(owner|admin)|require\s*\(\s*hasRole\s*\(/;

/**
 * D3 — Missing access control (High).
 * A public/external state-changing function that moves funds or changes an
 * owner/admin, with no onlyOwner/onlyRole (or equivalent) check — anyone can
 * call it.
 */
export function detect(files: SourceFile[], _liveState: LiveState): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    const code = stripComments(file.content);
    for (const fn of parseFunctions(code)) {
      if (!/external|public/.test(fn.header)) continue;
      if (/view|pure/.test(fn.header)) continue;
      const sensitive = FUNDS_RE.test(fn.body) || ADMIN_CHANGE_RE.test(fn.body) || NAME_RE.test(fn.name);
      if (!sensitive) continue;
      if (GUARD_RE.test(fn.header) || GUARD_RE.test(fn.body)) continue;
      findings.push({
        id: 'D3',
        title: 'Missing access control on sensitive function',
        severity: 'High',
        file: file.path,
        line: fn.startLine,
        explanation:
          `Function '${fn.name}' moves funds or changes an owner/admin but has no access-control ` +
          `check (no onlyOwner/onlyRole/equivalent). Any address can call it.`,
        poc: `Call '${fn.name}' from a fresh address with no privileges and observe the fund movement or admin change succeed.`,
      });
    }
  }
  return findings;
}
