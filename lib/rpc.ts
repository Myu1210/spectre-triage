import type { Chain } from './chain';

const RPC_TIMEOUT_MS = 8_000;
const RPC_RETRIES = 1;

/** EIP-1967 implementation slot: keccak256("eip1967.proxy.implementation") - 1 */
export const EIP1967_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

const ZERO_SLOT = '0x' + '0'.repeat(64);

interface JsonRpcResponse {
  jsonrpc?: string;
  id?: number;
  result?: unknown;
  error?: { code?: number; message?: string };
}

async function postJsonRpc(
  url: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`RPC HTTP ${res.status}`);
  }
  const json = (await res.json()) as JsonRpcResponse;
  if (json.error) {
    throw new Error(`RPC error ${json.error.code ?? ''}: ${json.error.message ?? 'unknown'}`);
  }
  return json.result;
}

/**
 * Minimal JSON-RPC call: 8 s timeout, 1 retry per URL, then falls back to
 * the next RPC URL in the chain's list. Throws the last error if all fail.
 */
export async function rpcCall(
  chain: Chain,
  method: string,
  params: unknown[],
): Promise<unknown> {
  let lastError: Error = new Error('No RPC URLs configured');
  for (const url of chain.rpcUrls) {
    for (let attempt = 0; attempt <= RPC_RETRIES; attempt++) {
      try {
        return await postJsonRpc(url, method, params);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
  }
  throw new Error(
    `RPC didn't answer on ${chain.name} (${lastError.message}) — try again in a minute`,
  );
}

function asHexString(result: unknown, method: string): string {
  if (typeof result !== 'string' || !result.startsWith('0x')) {
    throw new Error(`Unexpected ${method} result: ${String(result)}`);
  }
  return result;
}

export async function getBalance(chain: Chain, address: string): Promise<string> {
  const result = await rpcCall(chain, 'eth_getBalance', [address, 'latest']);
  return asHexString(result, 'eth_getBalance');
}

export async function getStorageAt(
  chain: Chain,
  address: string,
  slot: string,
): Promise<string> {
  const result = await rpcCall(chain, 'eth_getStorageAt', [address, slot, 'latest']);
  return asHexString(result, 'eth_getStorageAt');
}

/** Read the EIP-1967 implementation slot; returns the implementation address or null. */
export async function getImplementation(chain: Chain, address: string): Promise<string | null> {
  const slot = await getStorageAt(chain, address, EIP1967_IMPLEMENTATION_SLOT);
  if (slot === ZERO_SLOT) {
    return null;
  }
  // Slot holds a left-padded address (last 40 hex chars).
  return '0x' + slot.slice(-40);
}

/** eth_call for a view function; `data` is the 4-byte selector + args. */
export async function ethCall(
  chain: Chain,
  to: string,
  data: string,
): Promise<string> {
  const result = await rpcCall(chain, 'eth_call', [{ to, data }, 'latest']);
  return asHexString(result, 'eth_call');
}
