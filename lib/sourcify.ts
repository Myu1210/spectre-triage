import type { SourceFile } from './types';

export type SourcifyResult =
  | { status: 'verified'; files: SourceFile[] }
  | { status: 'unverified' };

const SOURCIFY_BASE = 'https://sourcify.dev/server/v2/contract';

/** Shape of the Sourcify v2 response we rely on (`?fields=sources`):
 * a top-level `sources` map, path -> { content }. */
interface SourcifyResponse {
  sources?: Record<string, { content?: string }>;
}

function normalizeSources(json: SourcifyResponse): SourceFile[] {
  const sources = json.sources ?? {};
  const files: SourceFile[] = [];
  for (const [path, entry] of Object.entries(sources)) {
    if (typeof entry?.content === 'string') {
      files.push({ path, content: entry.content });
    }
  }
  return files;
}

/**
 * Fetch verified source for a contract from the Sourcify v2 API.
 * Returns { status: 'unverified' } for a 404 (contract not verified) —
 * callers must be able to distinguish that from a real failure, so it is
 * a typed result, not an exception.
 */
export async function fetchVerifiedSource(
  chainId: number,
  address: string,
): Promise<SourcifyResult> {
  // `?fields=sources` is required: the default response carries only match
  // metadata (matchId, creationMatch, ...), no source files.
  const url = `${SOURCIFY_BASE}/${chainId}/${address}?fields=sources`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    throw new Error(
      `Sourcify didn't answer (${err instanceof Error ? err.message : 'network error'}) — try again in a minute`,
    );
  }
  if (res.status === 404) {
    return { status: 'unverified' };
  }
  if (!res.ok) {
    throw new Error(`Sourcify didn't answer (HTTP ${res.status}) — try again in a minute`);
  }
  const json = (await res.json()) as SourcifyResponse;
  const files = normalizeSources(json);
  if (files.length === 0) {
    return { status: 'unverified' };
  }
  return { status: 'verified', files };
}
