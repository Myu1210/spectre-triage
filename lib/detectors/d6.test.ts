import { describe, expect, it } from 'vitest';
import type { LiveState, SourceFile } from '../types';
import { detect } from './d6';

const live: LiveState = {
  implementation: null,
  ethBalance: '0',
  totalSupply: null,
  balanceOf: null,
  isProxy: false,
};
const file = (content: string): SourceFile[] => [{ path: 'Vault.sol', content }];

describe('D6', () => {
  it('flags an unbounded loop over a caller-supplied array', () => {
    const findings = detect(
      file(`
contract Vault {
    function batch(address[] memory users) external {
        for (uint256 i = 0; i < users.length; i++) {
            pay(users[i]);
        }
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('D6');
    expect(findings[0].severity).toBe('Medium');
  });

  it('returns nothing for a fixed-bound loop', () => {
    const findings = detect(
      file(`
contract Vault {
    function batch() external {
        for (uint256 i = 0; i < 10; i++) {
            pay(i);
        }
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });

  it('returns nothing when the length is capped', () => {
    const findings = detect(
      file(`
contract Vault {
    function batch(address[] memory users) external {
        require(users.length <= 100, "too many");
        for (uint256 i = 0; i < users.length; i++) {
            pay(users[i]);
        }
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });
});
