import { describe, expect, it } from 'vitest';
import { chainById } from './chain';
import {
  EIP1967_IMPLEMENTATION_SLOT,
  getBalance,
  getImplementation,
  getStorageAt,
} from './rpc';

const KILN_VTREASURY = '0xA06634ed78C5121c2A3702b90b6E3926c7B2A641';

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
});
