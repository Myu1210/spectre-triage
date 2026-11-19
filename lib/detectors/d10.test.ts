import { describe, expect, it } from 'vitest';
import type { LiveState, SourceFile } from '../types';
import { detect } from './d10';

const live: LiveState = {
  implementation: null,
  ethBalance: '0',
  totalSupply: null,
  balanceOf: null,
  isProxy: false,
};
const file = (content: string): SourceFile[] => [{ path: 'Vault.sol', content }];

describe('D10', () => {
  it('flags selfdestruct', () => {
    const findings = detect(
      file(`
contract Vault {
    function kill() external {
        selfdestruct(payable(msg.sender));
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('D10');
    expect(findings[0].severity).toBe('Critical');
  });

  it('flags delegatecall to a caller-supplied address', () => {
    const findings = detect(
      file(`
contract Vault {
    function exec(address target, bytes memory data) external {
        target.delegatecall(data);
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('Critical');
  });

  it('returns nothing for delegatecall to an immutable implementation', () => {
    const findings = detect(
      file(`
contract Vault {
    address public immutable impl;
    constructor(address _impl) { impl = _impl; }
    function exec(bytes memory data) external {
        impl.delegatecall(data);
    }
}
`),
      live,
    );
    expect(findings).toHaveLength(0);
  });
});
