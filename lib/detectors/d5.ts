import type { Finding, LiveState, SourceFile } from '../types';
import { lineOf, stripComments } from './util';

/**
 * D5 — `tx.origin` used for authorization (High).
 * `tx.origin` is the original external account, not the immediate caller, so
 * any contract the user interacts with can act with the user's authority —
 * the classic phishing vector. Authorization must use `msg.sender`.
 */
export function detect(files: SourceFile[], _liveState: LiveState): Finding[] {
  const findings: Finding[] = [];
  const re = /tx\.origin/g;
  for (const file of files) {
    const code = stripComments(file.content);
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      // Only flag authorization use: inside require/if or a comparison.
      const lineStart = code.lastIndexOf('\n', m.index) + 1;
      const lineEnd = code.indexOf('\n', m.index);
      const line = code.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      if (!/(require|if)\s*\(/.test(line) && !/==|!=/.test(line)) continue;
      findings.push({
        id: 'D5',
        title: 'tx.origin used for authorization',
        severity: 'High',
        file: file.path,
        line: lineOf(code, m.index),
        explanation:
          `'tx.origin' authenticates the original external account, not the immediate caller. A malicious ` +
          `contract can trick the user into calling it and then act with the user's authority here. Use 'msg.sender' instead.`,
        poc: `Deploy an attacker contract that calls this function; have the victim call the attacker contract and show the authorization passes.`,
      });
    }
  }
  return findings;
}
