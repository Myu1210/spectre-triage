import { describe, expect, it } from 'vitest';
import { chainById } from './chain';
import {
  EIP1967_IMPLEMENTATION_SLOT,
  getBalance,
  getCode,
  getImplementation,
  getStorageAt,
  isEip1967Proxy,
  isEip1967ProxyCode,
} from './rpc';

const KILN_VTREASURY = '0xA06634ed78C5121c2A3702b90b6E3926c7B2A641';
// EIP-1967 implementation-slot constant, as it appears in proxy bytecode.
const SLOT_HEX = '360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

describe('isEip1967ProxyCode (pure)', () => {
  it('returns true when the code contains the EIP-1967 slot constant', () => {
    expect(isEip1967ProxyCode('0x600080' + SLOT_HEX + '6000f3')).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(isEip1967ProxyCode('0x' + SLOT_HEX.toUpperCase())).toBe(true);
  });

  it('returns false for code without the constant', () => {
    expect(isEip1967ProxyCode('0x608060405234801561001057600080fd5b50')).toBe(false);
  });

  it('returns false for empty code (0x, EOA / no contract)', () => {
    expect(isEip1967ProxyCode('0x')).toBe(false);
  });
});

describe('RPC client (live Ethereum)', () => {
  it('returns a plausible balance and a 32-byte implementation slot for Kiln vTreasury', async () => {
    const chain = chainById(1)!;
    const balance = await getBalance(chain, KILN_VTREASURY);
    const slot = await getStorageAt(chain, KILN_VTREASURY, EIP1967_IMPLEMENTATION_SLOT);
    const implementation = await getImplementation(chain, KILN_VTREASURY);
    console.log('Kiln balance:', balance, '| impl slot:', slot, '| implementation:', implementation);
    expect(balance).toMatch(/^0x[0-9a-f]+$/);
    expect(slot).toMatch(/^0x[0-9a-f]{64}$/);
    if (implementation !== null) {
      expect(implementation).toMatch(/^0x[0-9a-f]{40}$/);
    }
  }, 60_000);

  it('Kiln vTreasury is NOT an EIP-1967 proxy (code lacks the slot constant)', async () => {
    const chain = chainById(1)!;
    const code = await getCode(chain, KILN_VTREASURY);
    expect(code).toMatch(/^0x[0-9a-f]*$/);
    expect(isEip1967ProxyCode(code)).toBe(false);
    await expect(isEip1967Proxy(chain, KILN_VTREASURY)).resolves.toBe(false);
  }, 60_000);
});
