import { describe, expect, it } from 'vitest';
import type { LiveState, SourceFile } from '../types';
import { detect } from './d3';

const live: LiveState = {
  implementation: null,
  ethBalance: '0',
  totalSupply: null,
  balanceOf: null,
  isProxy: false,
};
const file = (content: string): SourceFile[] => [{ path: 'Vault.sol', content }];

describe('D3', () => {
  it('flags an unguarded withdraw', () => {
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
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('D3');
    expect(findings[0].severity).toBe('High');
  });

  it('returns nothing when onlyOwner guards the function', () => {
    const findings = detect(
      file(`
contract Vault {
    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });

  it('returns nothing for a guarded owner change', () => {
    const findings = detect(
      file(`
contract Vault {
    address public owner;
    function setOwner(address next) external onlyOwner {
        owner = next;
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });
});
