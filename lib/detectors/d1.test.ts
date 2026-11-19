import { describe, expect, it } from 'vitest';
import type { LiveState, SourceFile } from '../types';
import { detect } from './d1';

const live: LiveState = {
  implementation: null,
  ethBalance: '0',
  totalSupply: null,
  balanceOf: null,
  isProxy: false,
};
const file = (content: string): SourceFile[] => [{ path: 'Vault.sol', content }];

// Kiln-style: cleared with msg.sender key, keyed by pool/token elsewhere.
const POSITIVE = `
contract Vault {
    function _exitAndFundCoverageFund(address pool, uint256 shares) internal {
        $poolShares.get()[msg.sender.k()] = 0;
        uint256 current = $poolShares.get()[pool.k()];
    }
    function balanceOf(address token) external view returns (uint256) {
        return $poolShares.get()[token.k()];
    }
}
`;

describe('D1', () => {
  it('flags the Kiln-style wrong-key clear', () => {
    const findings = detect(file(POSITIVE), live);
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('D1');
    expect(findings[0].severity).toBe('High');
    expect(findings[0].line).toBe(4);
    expect(findings[0].file).toBe('Vault.sol');
  });

  it('exempts token-receiver callbacks', () => {
    const findings = detect(
      file(`
contract Vault {
    function onERC721Received(address, address, uint256, bytes memory) external returns (bytes4) {
        $poolShares.get()[msg.sender.k()] = 0;
        return this.onERC721Received.selector;
    }
    function balanceOf(address token) external view returns (uint256) {
        return $poolShares.get()[token.k()];
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });

  it('returns nothing when every key is msg.sender', () => {
    const findings = detect(
      file(`
contract Vault {
    function exit() external {
        $poolShares.get()[msg.sender.k()] = 0;
    }
    function myShares() external view returns (uint256) {
        return $poolShares.get()[msg.sender.k()];
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });
});
