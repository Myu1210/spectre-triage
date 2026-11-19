import type { Finding, LiveState, SourceFile } from '../types';
import { lineOf, stripComments } from './util';

/**
 * D10 — `selfdestruct` or `delegatecall` to a user-controlled address (Critical).
 * `selfdestruct` destroys the contract and sends its balance to an address.
 * `delegatecall` to an address the caller (or a settable variable) controls
 * runs arbitrary code in this contract's storage context — full takeover.
 */
export function detect(files: SourceFile[], _liveState: LiveState): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    const code = stripComments(file.content);
    // selfdestruct: always flag.
    const sdRe = /selfdestruct\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = sdRe.exec(code)) !== null) {
      findings.push({
        id: 'D10',
        title: 'selfdestruct present',
        severity: 'Critical',
        file: file.path,
        line: lineOf(code, m.index),
        explanation:
          `'selfdestruct' destroys the contract and sends its entire balance to the given address. ` +
          `Whoever can reach it can kill the contract and take the funds.`,
        poc: `Call the function containing 'selfdestruct' and confirm the contract is destroyed and its balance moved.`,
      });
    }
    // delegatecall: flag unless the target is an immutable/constant address.
    const immutable = new Set<string>();
    const immRe = /\b(?:immutable|constant)\b[^;]*\b(\w+)\b[^;]*;/g;
    let im: RegExpExecArray | null;
    while ((im = immRe.exec(code)) !== null) immutable.add(im[1]);
    const dcRe = /(\w+)\.delegatecall\s*\(/g;
    while ((m = dcRe.exec(code)) !== null) {
      const target = m[1];
      if (immutable.has(target)) continue;
      findings.push({
        id: 'D10',
        title: 'delegatecall to a user-controlled address',
        severity: 'Critical',
        file: file.path,
        line: lineOf(code, m.index),
        explanation:
          `'delegatecall' to '${target}' runs the callee's code in this contract's storage context. ` +
          `'${target}' is not an immutable/constant address, so whoever controls it controls this contract's storage and funds.`,
        poc: `Deploy a malicious contract, make '${target}' point at it, trigger the delegatecall, and show the malicious code writing this contract's storage.`,
      });
    }
  }
  return findings;
}
