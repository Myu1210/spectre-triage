import type { Finding, LiveState, SourceFile } from '../types';
import { lineOf, parseFunctions, stripComments } from './util';

const ORACLE_RE = /\.(latestRoundData|latestAnswer)\s*\(/g;

/**
 * D7 — Oracle price used without a staleness check (Medium).
 * A Chainlink price is consumed without checking `updatedAt` (or an
 * equivalent freshness condition), so a stale/never-updated feed can silently
 * price operations at an old value.
 */
export function detect(files: SourceFile[], _liveState: LiveState): Finding[] {
  const findings: Finding[] = [];
  for (const file of files) {
    const code = stripComments(file.content);
    for (const fn of parseFunctions(code)) {
      let m: RegExpExecArray | null;
      ORACLE_RE.lastIndex = 0;
      while ((m = ORACLE_RE.exec(fn.body)) !== null) {
        if (/updatedAt|answeredInRound|stale|heartbeat|block\.timestamp\s*-/.test(fn.body)) continue;
        findings.push({
          id: 'D7',
          title: 'Oracle price used without a staleness check',
          severity: 'Medium',
          file: file.path,
          line: lineOf(code, fn.bodyStartIndex + m.index),
          explanation:
            `Function '${fn.name}' reads a Chainlink price (${m[1]}) without checking 'updatedAt' or any ` +
            `freshness condition. A stale feed — or a feed that stopped updating — prices operations at an old value.`,
          poc: `Point the feed at a stale round (or simulate one) and show '${fn.name}' still accepts the old price with no revert.`,
        });
      }
    }
  }
  return findings;
}
