import { describe, expect, it } from 'vitest';
import type { LiveState, SourceFile } from '../types';
import { detect } from './d9';

const file = (content: string): SourceFile[] => [{ path: 'Proxy.sol', content }];
const base: LiveState = {
  implementation: null,
  ethBalance: '0',
  totalSupply: null,
  balanceOf: null,
  isProxy: true,
};

describe('D9', () => {
  it('flags a proxy with a zero implementation', () => {
    const findings = detect(file('contract Proxy {}'), {
      ...base,
      implementation: '0x0000000000000000000000000000000000000000',
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('D9');
    expect(findings[0].severity).toBe('High');
    expect(findings[0].line).toBe(1);
  });

  it('flags a proxy with no implementation read at all', () => {
    const findings = detect(file('contract Proxy {}'), base);
    expect(findings).toHaveLength(1);
  });

  it('returns nothing when the implementation is set', () => {
    const findings = detect(file('contract Proxy {}'), {
      ...base,
      implementation: '0x1234567890123456789012345678901234567890',
    });
    expect(findings).toHaveLength(0);
  });

  it('returns nothing when the contract is not a proxy', () => {
    const findings = detect(file('contract Proxy {}'), { ...base, isProxy: false });
    expect(findings).toHaveLength(0);
  });

  it('returns nothing when there is no source file to cite', () => {
    const findings = detect([], base);
    expect(findings).toHaveLength(0);
  });
});
