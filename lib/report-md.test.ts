import { describe, expect, it } from 'vitest';
import { toMarkdown } from './report-md';
import type { Finding, LiveState } from './types';
import { decideVerdict } from './verdict';

const finding: Finding = {
  id: 'D1',
  title: 'Mapping cleared with the wrong key',
  severity: 'High',
  file: 'vTreasury.sol',
  line: 155,
  explanation: 'The mapping is cleared with the wrong key.',
  poc: 'Write via pool.k(), then exit as msg.sender.',
};
const live: LiveState = {
  implementation: '0x1234567890123456789012345678901234567890',
  ethBalance: '1.5 ETH',
  totalSupply: '1000000',
  balanceOf: null,
  isProxy: true,
};

describe('toMarkdown', () => {
  it('contains verdict, findings with file:line, and live-state facts', () => {
    const md = toMarkdown(
      '0xA06634ed78C5121c2A3702b90b6E3926c7B2A641',
      'Ethereum',
      decideVerdict([finding], true),
      [finding],
      live,
    );
    expect(md).toContain('AUDIT');
    expect(md).toContain('Mapping cleared with the wrong key');
    expect(md).toContain('vTreasury.sol:155');
    expect(md).toContain('0x1234567890123456789012345678901234567890');
    expect(md).toContain('1.5 ETH');
    expect(md).toContain('1000000');
    expect(md).toContain('leads, not confirmed vulnerabilities');
  });

  it('omits live-state values that were not read', () => {
    const md = toMarkdown('0xabc', 'BSC', decideVerdict([], true), [], {
      ...live,
      implementation: null,
      totalSupply: null,
    });
    expect(md).toContain('SKIP');
    expect(md).toContain('No findings.');
    expect(md).not.toContain('totalSupply');
    expect(md).not.toContain('Implementation:');
  });
});
