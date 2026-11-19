import { describe, expect, it } from 'vitest';
import type { LiveState, SourceFile } from '../types';
import { detect } from './d4';

const live: LiveState = {
  implementation: null,
  ethBalance: '0',
  totalSupply: null,
  balanceOf: null,
  isProxy: false,
};
const file = (content: string): SourceFile[] => [{ path: 'Vault.sol', content }];

describe('D4', () => {
  it('flags a bare low-level call', () => {
    const findings = detect(
      file(`
contract Vault {
    function send(address target) external {
        target.call{value: 1 ether}("");
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('D4');
    expect(findings[0].severity).toBe('Medium');
  });

  it('returns nothing when the return value is checked', () => {
    const findings = detect(
      file(`
contract Vault {
    function send(address target) external {
        (bool success, ) = target.call{value: 1 ether}("");
        require(success, "call failed");
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });
});
