import { describe, expect, it } from 'vitest';
import { CHAINS, chainById, chainBySlug } from './chain';

describe('chain table', () => {
  it('covers Ethereum, BSC, Base, Arbitrum, Optimism with Sourcify chain ids', () => {
    expect(CHAINS).toHaveLength(5);
    const byId = new Map(CHAINS.map((c) => [c.id, c.slug]));
    expect(byId.get(1)).toBe('ethereum');
    expect(byId.get(56)).toBe('bsc');
    expect(byId.get(8453)).toBe('base');
    expect(byId.get(42161)).toBe('arbitrum');
    expect(byId.get(10)).toBe('optimism');
  });

  it('gives every chain 2+ public RPC URLs in fallback order', () => {
    for (const chain of CHAINS) {
      expect(chain.rpcUrls.length, chain.slug).toBeGreaterThanOrEqual(2);
      for (const url of chain.rpcUrls) {
        expect(url.startsWith('https://'), `${chain.slug}: ${url}`).toBe(true);
      }
    }
  });

  it('looks chains up by id and slug', () => {
    expect(chainById(1)?.slug).toBe('ethereum');
    expect(chainBySlug('bsc')?.id).toBe(56);
    expect(chainById(999)).toBeUndefined();
  });

  it('prints the table', () => {
    for (const c of CHAINS) {
      console.log(`${c.name} (id ${c.id}): ${c.rpcUrls.join(', ')}`);
    }
  });
});
