import type { Finding, LiveState } from './types';
import { sortFindings, type VerdictResult } from './verdict';

/**
 * Findings + verdict + live-state facts → Markdown export (R3.4).
 * Only values actually read are included; nothing is invented.
 */
export function toMarkdown(
  address: string,
  chain: string,
  verdict: VerdictResult,
  findings: Finding[],
  liveState: LiveState,
): string {
  const lines: string[] = [
    `# Spectre triage report`,
    ``,
    `**Contract:** \`${address}\` (${chain})`,
    `**Verdict:** ${verdict.verdict}`,
    `**Summary:** ${verdict.summary}`,
    ``,
    `> Findings are leads, not confirmed vulnerabilities — verify every lead before acting on it.`,
    ``,
    `## Live state`,
    ``,
    `- Proxy: ${liveState.isProxy ? 'yes' : 'no'}`,
  ];
  if (liveState.implementation) lines.push(`- Implementation: \`${liveState.implementation}\``);
  lines.push(`- ETH balance: ${liveState.ethBalance}`);
  if (liveState.totalSupply !== null) lines.push(`- totalSupply: ${liveState.totalSupply}`);
  if (liveState.balanceOf !== null) lines.push(`- balanceOf (contract): ${liveState.balanceOf}`);
  lines.push(``, `## Findings (${findings.length})`, ``);
  if (findings.length === 0) {
    lines.push(`No findings.`);
  }
  for (const f of sortFindings(findings)) {
    lines.push(
      `### ${f.id} — ${f.title} [${f.severity}]`,
      ``,
      `**Location:** \`${f.file}:${f.line}\``,
      ``,
      f.explanation,
      ``,
      `**PoC direction:** ${f.poc}`,
      ``,
    );
  }
  return lines.join('\n');
}
