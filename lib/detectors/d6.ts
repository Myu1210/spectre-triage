import type { Finding, LiveState, SourceFile } from '../types';
import { lineOf, paramNames, parseFunctions, stripComments } from './util';

const LOOP_RE = /for\s*\([^;]*;\s*[^;]*<\s*(\w+)\.length[^;]*;/g;

/**
 * D6 — Unbounded loop over a user-controlled array (Medium).
 * A loop bounded only by the length of an array the caller supplies has no
 * cap: a long enough array makes the call run out of gas, so the function can
 * be bricked — or an attacker can grief it. Scoped to function parameters
 * (the clearly caller-controlled case); storage arrays are admin-bounded in
 * practice and out of scope for this heuristic.
 */
export function detect(files: SourceFile[], _liveState: LiveState): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    const code = stripComments(file.content);
    for (const fn of parseFunctions(code)) {
      const params = new Set(paramNames(fn.params));
      let m: RegExpExecArray | null;
      LOOP_RE.lastIndex = 0;
      while ((m = LOOP_RE.exec(fn.body)) !== null) {
        const arr = m[1];
        if (!params.has(arr)) continue; // only caller-supplied (parameter) arrays
        if (/require\s*\([^)]*\.length\s*(<=|<)/.test(fn.body)) continue; // length cap present
        findings.push({
          id: 'D6',
          title: 'Unbounded loop over a user-controlled array',
          severity: 'Medium',
          file: file.path,
          line: lineOf(code, fn.bodyStartIndex + m.index),
          explanation:
            `Loop in '${fn.name}' iterates over the full length of '${arr}' with no upper bound. ` +
            `A caller-supplied (or ever-growing) array can push the call past the block gas limit and brick the function.`,
          poc: `Call '${fn.name}' with an array long enough that the transaction runs out of gas; the function becomes unusable for that input size.`,
        });
      }
    }
  }
  return findings;
}
