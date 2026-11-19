import { describe, expect, it } from 'vitest';
import type { LiveState, SourceFile } from '../types';
import { detect } from './d2';

const live: LiveState = {
  implementation: null,
  ethBalance: '0',
  totalSupply: null,
  balanceOf: null,
  isProxy: false,
};
const file = (content: string): SourceFile[] => [{ path: 'Vault.sol', content }];

describe('D2', () => {
  it('flags an external call before a state update', () => {
    const findings = detect(
      file(`
contract Vault {
    mapping(address => uint256) public balances;
    function withdraw(uint256 amount) external {
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok);
        balances[msg.sender] -= amount;
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('D2');
    expect(findings[0].severity).toBe('High');
  });

  it('returns nothing when state is updated before the call', () => {
    const findings = detect(
      file(`
contract Vault {
    mapping(address => uint256) public balances;
    function withdraw(uint256 amount) external {
        balances[msg.sender] -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok);
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });

  it('returns nothing when a nonReentrant guard is present', () => {
    const findings = detect(
      file(`
contract Vault {
    mapping(address => uint256) public balances;
    function withdraw(uint256 amount) external nonReentrant {
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok);
        balances[msg.sender] -= amount;
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });
});
