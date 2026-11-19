export interface Chain {
  /** Slug used in the UI and API route, e.g. 'ethereum'. */
  slug: string;
  name: string;
  /** EVM chain id, also the Sourcify chain id. */
  id: number;
  /** Public RPC URLs in fallback order. */
  rpcUrls: string[];
}

// RPC endpoints verified live 2026-11-19 (eth_chainId probe):
// eth.llamarpc.com and base.llamarpc.com returned Cloudflare 525, so they
// were swapped for eth.drpc.org and base.publicnode.com respectively.
export const CHAINS: Chain[] = [
  {
    slug: 'ethereum',
    name: 'Ethereum',
    id: 1,
    rpcUrls: ['https://ethereum.publicnode.com', 'https://eth.drpc.org'],
  },
  {
    slug: 'bsc',
    name: 'BNB Smart Chain',
    id: 56,
    rpcUrls: ['https://bsc.publicnode.com', 'https://bsc-dataseed.binance.org'],
  },
  {
    slug: 'base',
    name: 'Base',
    id: 8453,
    rpcUrls: ['https://mainnet.base.org', 'https://base.publicnode.com'],
  },
  {
    slug: 'arbitrum',
    name: 'Arbitrum One',
    id: 42161,
    rpcUrls: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum.publicnode.com'],
  },
  {
    slug: 'optimism',
    name: 'Optimism',
    id: 10,
    rpcUrls: ['https://mainnet.optimism.io', 'https://optimism.publicnode.com'],
  },
];

export function chainById(id: number): Chain | undefined {
  return CHAINS.find((c) => c.id === id);
}

export function chainBySlug(slug: string): Chain | undefined {
  return CHAINS.find((c) => c.slug === slug);
}
