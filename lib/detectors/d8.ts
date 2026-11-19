import type { Finding, LiveState, SourceFile } from '../types';
import { parseFunctions, stripComments } from './util';

const ADMIN_GUARD_RE = /only[A-Z]\w*|require\s*\(\s*msg\.sender\s*==\s*(owner|admin)/;
const POWER_RE =
  /\.(call\s*\{[^}]*value|transfer|send)\s*\(|withdraw|pause\s*\(|unpause\s*\(|upgradeTo\s*\(|setImplementation\s*\(|selfdestruct\s*\(/;

/**
 * D8 — Centralization: a single admin can drain, pause, or upgrade (High).
 * A function only the owner/admin can call moves funds out, pauses the
 * contract, or upgrades it — one compromised or malicious key controls the
 * contract's funds and liveness.
 */
export function detect(files: SourceFile[], _liveState: LiveState): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    const code = stripComments(file.content);
    for (const fn of parseFunctions(code)) {
      if (!ADMIN_GUARD_RE.test(fn.header) && !ADMIN_GUARD_RE.test(fn.body)) continue;
      const power = fn.body.match(POWER_RE);
      if (!power) continue;
      const action = /pause|unpause/.test(power[0])
        ? 'pause/unpause the contract'
        : /upgradeTo|setImplementation/.test(power[0])
          ? 'upgrade the implementation'
          : 'move funds out of the contract';
      findings.push({
        id: 'D8',
        title: 'Centralization: single admin can drain, pause, or upgrade',
        severity: 'High',
        file: file.path,
        line: fn.startLine,
        explanation:
          `Function '${fn.name}' is restricted to a single owner/admin yet can ${action}. ` +
          `One compromised or malicious key controls the contract's funds and liveness.`,
        poc: `As the owner, call '${fn.name}' and show the privileged action executes with no second signer or timelock in the path.`,
      });
    }
  }
  return findings;
}
