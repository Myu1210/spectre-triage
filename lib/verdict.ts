import type { Finding, Severity } from './types';

export type Verdict = 'AUDIT' | 'SKIP';

export interface VerdictResult {
  verdict: Verdict;
  summary: string;
}

const LEADS_NOTE = 'Findings are leads, not confirmed bugs — verify every lead before acting on it.';

/**
 * Verdict rules (design.md): any Critical/High finding → AUDIT; unverified
 * contract → SKIP; no findings above Low → SKIP (clean).
 */
export function decideVerdict(findings: Finding[], verified: boolean): VerdictResult {
  if (!verified) {
    return {
      verdict: 'SKIP',
      summary: 'Unverified contract: source code is not published, so it cannot be triaged.',
    };
  }
  const top = findings.find((f) => f.severity === 'Critical' || f.severity === 'High');
  if (top) {
    const highs = findings.filter((f) => f.severity === 'Critical' || f.severity === 'High').length;
    return {
      verdict: 'AUDIT',
      summary:
        `${highs} ${highs === 1 ? 'finding' : 'findings'} at High severity or above — worth a closer audit. ${LEADS_NOTE}`,
    };
  }
  if (findings.length === 0) {
    return { verdict: 'SKIP', summary: 'No findings: detectors found nothing worth flagging in the verified source.' };
  }
  return {
    verdict: 'SKIP',
    summary: `Only ${findings.length} low-severity ${findings.length === 1 ? 'finding' : 'findings'} — nothing above Low. ${LEADS_NOTE}`,
  };
}

/** Severity rank for sorting: Critical first. */
export function severityRank(s: Severity): number {
  return { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 }[s];
}

/** Findings sorted by severity, then file, then line. */
export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line,
  );
}
