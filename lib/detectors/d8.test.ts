import { describe, expect, it } from 'vitest';
import type { LiveState, SourceFile } from '../types';
import { detect } from './d8';

const live: LiveState = {
  implementation: null,
  ethBalance: '0',
  totalSupply: null,
  balanceOf: null,
  isProxy: false,
};
const file = (content: string): SourceFile[] => [{ path: 'Vault.sol', content }];

describe('D8', () => {
  it('flags an onlyOwner drain', () => {
    const findings = detect(
      file(`
contract Vault {
    address public owner;
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('D8');
    expect(findings[0].severity).toBe('High');
  });

  it('returns nothing for an onlyOwner function with no privileged power', () => {
    const findings = detect(
      file(`
contract Vault {
    string public name;
    function setName(string memory next) external onlyOwner {
        name = next;
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });

  it('returns nothing when the drain has no admin guard', () => {
    const findings = detect(
      file(`
contract Vault {
    function withdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });
});
