import type { Finding, LiveState, SourceFile } from '../types';
import { lineOf, stripComments } from './util';

/**
 * D4 — Unchecked external call return value (Medium).
 * A low-level `.call` whose boolean success value is never assigned, checked
 * in a require/if, or stored — a failed call fails silently and execution
 * continues as if it succeeded.
 */
export function detect(files: SourceFile[], _liveState: LiveState): Finding[] {
  const findings: Finding[] = [];
  const callRe = /\.call\s*(?:\{[^}]*\})?\s*\(/g;
  for (const file of files) {
    const code = stripComments(file.content);
    let m: RegExpExecArray | null;
    while ((m = callRe.exec(code)) !== null) {
      // Enclosing statement: back to the previous ';' or '{', forward to ';'.
      const start = Math.max(code.lastIndexOf(';', m.index), code.lastIndexOf('{', m.index)) + 1;
      const end = code.indexOf(';', m.index);
      const stmt = code.slice(start, end === -1 ? m.index + 80 : end);
      if (/success/i.test(stmt)) continue; // assigned or checked via `success`
      if (/^\s*(if|require|assert)\s*\(/.test(stmt.trim())) continue; // return value consumed by the check
      findings.push({
        id: 'D4',
        title: 'Unchecked low-level call return value',
        severity: 'Medium',
        file: file.path,
        line: lineOf(code, m.index),
        explanation:
          `A low-level '.call' here ignores its boolean return value. If the callee reverts or runs out ` +
          `of gas the call fails silently and execution continues as if it succeeded.`,
        poc: `Make the callee revert (e.g. a receiver that always reverts) and show the calling transaction still succeeds.`,
      });
    }
  }
  return findings;
}
