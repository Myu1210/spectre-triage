import { NextResponse } from 'next/server';
import { chainBySlug } from '@/lib/chain';
import { fetchVerifiedSource } from '@/lib/sourcify';
import { ethCall, getBalance, getImplementation } from '@/lib/rpc';
import { detect as detectD1 } from '@/lib/detectors/d1';
import { detect as detectD2 } from '@/lib/detectors/d2';
import { detect as detectD3 } from '@/lib/detectors/d3';
import { detect as detectD4 } from '@/lib/detectors/d4';
import { detect as detectD5 } from '@/lib/detectors/d5';
import { detect as detectD6 } from '@/lib/detectors/d6';
import { detect as detectD7 } from '@/lib/detectors/d7';
import { detect as detectD8 } from '@/lib/detectors/d8';
import { detect as detectD9 } from '@/lib/detectors/d9';
import { detect as detectD10 } from '@/lib/detectors/d10';
import { decideVerdict, sortFindings } from '@/lib/verdict';
import type { Finding, LiveState } from '@/lib/types';

const DETECTORS = [
  detectD1,
  detectD2,
  detectD3,
  detectD4,
  detectD5,
  detectD6,
  detectD7,
  detectD8,
  detectD9,
  detectD10,
];

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const TOTAL_SUPPLY_SELECTOR = '0x18160ddd';
const BALANCE_OF_SELECTOR = '0x70a08231';

function errorJson(message: string, upstream: string, status: number) {
  return NextResponse.json(
    { error: message, upstream, recovery: 'Try again in a minute.' },
    { status },
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }
  const { address, chain: chainSlug } = (body ?? {}) as {
    address?: unknown;
    chain?: unknown;
  };

  if (typeof address !== 'string' || !ADDRESS_RE.test(address)) {
    return NextResponse.json(
      {
        error:
          "That doesn't look like an EVM address. A valid address starts with 0x followed by 40 hexadecimal characters.",
      },
      { status: 400 },
    );
  }
  const chain = typeof chainSlug === 'string' ? chainBySlug(chainSlug) : undefined;
  if (!chain) {
    return NextResponse.json(
      { error: 'Unknown chain. Pick one of: Ethereum, BNB Smart Chain, Base, Arbitrum One, Optimism.' },
      { status: 400 },
    );
  }

  // 1. Verified source from Sourcify. Unverified is a normal outcome:
  // HTTP 200 with verdict SKIP, no fake findings.
  let source;
  try {
    source = await fetchVerifiedSource(chain.id, address);
  } catch (err) {
    console.error('Sourcify upstream failure:', err);
    return errorJson(
      'Sourcify didn’t answer while fetching verified source.',
      'Sourcify',
      502,
    );
  }
  if (source.status === 'unverified') {
    const verdict = decideVerdict([], false);
    return NextResponse.json({
      verdict: verdict.verdict,
      summary: verdict.summary,
      findings: [] as Finding[],
      liveState: null,
      address,
      chain: chain.slug,
      verified: false,
    });
  }
  const files = source.files;

  // 2. Live state from the public RPC. The reads are independent, so run
  // them in parallel; totalSupply/balanceOf revert on non-token contracts,
  // which just means "not applicable" (null), not a failure.
  let liveState: LiveState;
  try {
    const paddedAddress = address.slice(2).toLowerCase().padStart(64, '0');
    const [ethBalance, implementation, totalSupplyRaw, balanceOfRaw] = await Promise.all([
      getBalance(chain, address),
      getImplementation(chain, address),
      ethCall(chain, address, TOTAL_SUPPLY_SELECTOR).catch(() => null),
      ethCall(chain, address, BALANCE_OF_SELECTOR + paddedAddress).catch(() => null),
    ]);
    // An empty `0x` return means the call produced no data (not a token),
    // which is "not applicable", not a zero value.
    const totalSupply = totalSupplyRaw && totalSupplyRaw !== '0x' ? totalSupplyRaw : null;
    const balanceOf = balanceOfRaw && balanceOfRaw !== '0x' ? balanceOfRaw : null;
    liveState = {
      implementation,
      ethBalance,
      totalSupply,
      balanceOf,
      isProxy: implementation !== null,
    };
  } catch (err) {
    console.error('RPC upstream failure:', err);
    return errorJson(
      `The ${chain.name} RPC didn’t answer while reading live state.`,
      'RPC',
      503,
    );
  }

  // 3. Detectors (pure) + verdict.
  const findings = sortFindings(
    DETECTORS.flatMap((detect) => detect(files, liveState)),
  );
  const verdict = decideVerdict(findings, true);

  return NextResponse.json({
    verdict: verdict.verdict,
    summary: verdict.summary,
    findings,
    liveState,
    address,
    chain: chain.slug,
    verified: true,
  });
}
