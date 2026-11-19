import { describe, expect, it } from 'vitest';
import type { LiveState, SourceFile } from '../types';
import { detect } from './d7';

const live: LiveState = {
  implementation: null,
  ethBalance: '0',
  totalSupply: null,
  balanceOf: null,
  isProxy: false,
};
const file = (content: string): SourceFile[] => [{ path: 'Vault.sol', content }];

describe('D7', () => {
  it('flags a Chainlink read with no staleness check', () => {
    const findings = detect(
      file(`
contract Vault {
    AggregatorV3Interface public priceFeed;
    function price() external view returns (int256) {
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        return answer;
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('D7');
    expect(findings[0].severity).toBe('Medium');
  });

  it('returns nothing when updatedAt is checked', () => {
    const findings = detect(
      file(`
contract Vault {
    AggregatorV3Interface public priceFeed;
    function price() external view returns (int256) {
        (, int256 answer, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(block.timestamp - updatedAt < 1 hours, "stale price");
        return answer;
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });
});
