import type { Finding, LiveState, SourceFile } from '../types';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * D9 — Proxy with uninitialized or zero implementation (High).
 * Evidence is on-chain live state, not source: the EIP-1967 implementation
 * slot reads as the zero address (or empty) while the contract is a proxy.
 * Calls delegate to nothing, so the contract is bricked — or an attacker can
 * initialize it first.
 */
export function detect(files: SourceFile[], liveState: LiveState): Finding[] {
  if (!liveState.isProxy) return [];
  const impl = liveState.implementation;
  if (impl && impl.toLowerCase() !== ZERO_ADDRESS) return [];
  const main = files[0];
  if (!main) return []; // no source file to cite — never invent a finding
  return [
    {
      id: 'D9',
      title: 'Proxy with uninitialized or zero implementation',
      severity: 'High',
      file: main.path,
      line: 1,
      explanation:
        `The EIP-1967 implementation slot reads as ${impl ?? 'empty'} (evidence is the on-chain slot ` +
        `value, not a source line — hence the line-1 citation). The proxy has no implementation to ` +
        `delegate to, so calls fail or the proxy can be initialized by whoever gets there first.`,
      poc: `Read the EIP-1967 implementation slot (0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc) ` +
        `via eth_getStorageAt and confirm it is zero; call any function on the proxy and observe the failure.`,
    },
  ];
}
