import { describe, expect, it } from 'vitest';
import type { LiveState, SourceFile } from '../types';
import { detect } from './d5';

const live: LiveState = {
  implementation: null,
  ethBalance: '0',
  totalSupply: null,
  balanceOf: null,
  isProxy: false,
};
const file = (content: string): SourceFile[] => [{ path: 'Vault.sol', content }];

describe('D5', () => {
  it('flags tx.origin in an authorization check', () => {
    const findings = detect(
      file(`
contract Vault {
    address public owner;
    function withdraw() external {
        require(tx.origin == owner, "not owner");
        payable(msg.sender).transfer(address(this).balance);
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('D5');
    expect(findings[0].severity).toBe('High');
  });

  it('returns nothing for msg.sender authorization', () => {
    const findings = detect(
      file(`
contract Vault {
    address public owner;
    function withdraw() external {
        require(msg.sender == owner, "not owner");
        payable(msg.sender).transfer(address(this).balance);
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });

  it('returns nothing when tx.origin is only logged', () => {
    const findings = detect(
      file(`
contract Vault {
    event Seen(address origin);
    function note() external {
        emit Seen(tx.origin);
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });
});
