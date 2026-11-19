import { describe, expect, it } from 'vitest';
import { fetchVerifiedSource } from './sourcify';

const KILN_VTREASURY = '0xA06634ed78C5121c2A3702b90b6E3926c7B2A641';

describe('fetchVerifiedSource (live Sourcify)', () => {
  it('fetches Kiln vTreasury on Ethereum and finds _exitAndFundCoverageFund in vTreasury.sol', async () => {
    const result = await fetchVerifiedSource(1, KILN_VTREASURY);
    expect(result.status).toBe('verified');
    if (result.status !== 'verified') return;
    console.log(
      'Kiln files:',
      result.files.map((f) => f.path).join(', '),
    );
    const main = result.files.find((f) => /(^|\/)vTreasury\.sol$/.test(f.path));
    expect(main).toBeDefined();
    expect(main!.content).toContain('_exitAndFundCoverageFund');
  }, 30_000);

  it('returns a typed unverified result (not an exception) for an unverified contract', async () => {
    // EOA address — never a verified contract.
    const result = await fetchVerifiedSource(1, '0x0000000000000000000000000000000000000000');
    expect(result).toEqual({ status: 'unverified' });
  }, 30_000);
});
