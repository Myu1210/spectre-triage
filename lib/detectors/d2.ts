import type { Finding, LiveState, SourceFile } from '../types';
import { lineOf, localNames, paramNames, parseFunctions, stripComments } from './util';

const CALL_RE = /\.(call|delegatecall|staticcall)\s*(?:\{|\()|\.(send|transfer)\s*\(/g;
const STATE_WRITE_RE = /\b([A-Za-z_]\w*)\s*(?:\[[^\]]*\]\s*)?(?:\+=|-=|=(?!=)|\+{2}|-{2})/g;

/**
 * D2 — Reentrancy pattern (High).
 * An external call happens before a state update in the same function and no
 * reentrancy guard is present, so a malicious callee can re-enter and repeat
 * the effect before the state catches up.
 */
export function detect(files: SourceFile[], _liveState: LiveState): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    const code = stripComments(file.content);
    for (const fn of parseFunctions(code)) {
      if (/nonReentrant/i.test(fn.header) || /nonReentrant/i.test(fn.body.slice(0, 200))) continue;
      if (/view|pure/.test(fn.header)) continue;
      const locals = new Set([...localNames(fn.body), ...paramNames(fn.params)]);
      let call: RegExpExecArray | null;
      CALL_RE.lastIndex = 0;
      while ((call = CALL_RE.exec(fn.body)) !== null) {
        const after = fn.body.slice(call.index + call[0].length);
        let w: RegExpExecArray | null;
        STATE_WRITE_RE.lastIndex = 0;
        let hit = false;
        while ((w = STATE_WRITE_RE.exec(after)) !== null) {
          if (!locals.has(w[1]) && w[1] !== 'success') {
            hit = true;
            break;
          }
        }
        if (hit) {
          findings.push({
            id: 'D2',
            title: 'Reentrancy pattern: external call before state update',
            severity: 'High',
            file: file.path,
            line: lineOf(code, fn.bodyStartIndex + call.index),
            explanation:
              `Function '${fn.name}' makes an external call before updating state, with no reentrancy ` +
              `guard. A malicious callee can re-enter '${fn.name}' while the pre-call state is still ` +
              `in effect and repeat the effect (e.g. withdraw twice).`,
            poc:
              `Deploy a receiver contract whose fallback calls back into '${fn.name}' during the external ` +
              `call, then show the state update (balance/flag) only lands after the nested call returns.`,
          });
          break; // one finding per function
        }
      }
    }
  }
  return findings;
}
