import { describe, expect, it } from 'vitest';
import type { Finding } from './types';
import { decideVerdict } from './verdict';

const high: Finding = {
  id: 'D1',
  title: 'Mapping cleared with the wrong key',
  severity: 'High',
  file: 'vTreasury.sol',
  line: 155,
  explanation: 'wrong key',
  poc: 'prove it',
};
const low: Finding = { ...high, id: 'D4', severity: 'Low' };

describe('decideVerdict', () => {
  it('returns AUDIT when a High finding exists', () => {
    const r = decideVerdict([high], true);
    expect(r.verdict).toBe('AUDIT');
    expect(r.summary).toMatch(/leads, not confirmed bugs/);
  });

  it('returns SKIP when the contract is unverified', () => {
    const r = decideVerdict([high], false);
    expect(r.verdict).toBe('SKIP');
    expect(r.summary).toMatch(/Unverified/);
  });

  it('returns SKIP (clean) when there are no findings', () => {
    const r = decideVerdict([], true);
    expect(r.verdict).toBe('SKIP');
    expect(r.summary).toMatch(/No findings/);
  });

  it('returns SKIP (clean) when no finding is above Low', () => {
    const r = decideVerdict([low], true);
    expect(r.verdict).toBe('SKIP');
    expect(r.summary).toMatch(/Only 1 low-severity/);
  });
});
