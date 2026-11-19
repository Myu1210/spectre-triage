import type { Finding, LiveState, SourceFile } from '../types';
import {
  isCallback,
  mappingUsages,
  parseFunctions,
  stripComments,
} from './util';

/**
 * D1 — Mapping cleared with the wrong key (High).
 * A mapping entry is cleared (`= 0` / `delete`) with a `msg.sender` key
 * inside a non-callback function, while the same mapping is keyed
 * differently elsewhere — so the clear touches a slot that was never written
 * and the real entry survives. Covers both plain `map[key]` and namespaced
 * `$map.get()[key]` (Kiln-style) storage.
 */
export function detect(files: SourceFile[], _liveState: LiveState): Finding[] {
  const findings: Finding[] = [];
  // Every usage of every mapping, keyed by bare map name.
  const keysByMap = new Map<string, { file: string; line: number; key: string }[]>();
  for (const f of files) {
    for (const u of mappingUsages(f)) {
      const list = keysByMap.get(u.map) ?? [];
      list.push({ file: f.path, line: u.line, key: u.key });
      keysByMap.set(u.map, list);
    }
  }

  for (const file of files) {
    const code = stripComments(file.content);
    for (const u of mappingUsages(file)) {
      if (!u.key.includes('msg.sender')) continue;
      if (!u.isClear) continue;
      const fn = parseFunctions(code).find(
        (f) => u.index >= f.bodyStartIndex && u.index <= f.bodyStartIndex + f.body.length,
      );
      if (fn && isCallback(fn.name)) continue; // msg.sender IS the caller in callbacks
      const other = (keysByMap.get(u.map) ?? []).find(
        (o) => o.key !== u.key && !(o.file === file.path && o.line === u.line),
      );
      if (!other) continue;
      findings.push({
        id: 'D1',
        title: 'Mapping cleared with the wrong key',
        severity: 'High',
        file: file.path,
        line: u.line,
        explanation:
          `Mapping '${u.map}' is cleared with key '${u.key}' here, but the same mapping is keyed ` +
          `by '${other.key}' elsewhere (${other.file}:${other.line}). The clear touches a slot that ` +
          `was never written, so the real entry survives — e.g. a user's funds/shares stay locked ` +
          `in the mapping after the "cleanup".`,
        poc:
          `1) Write to the mapping via the path that keys it by '${other.key}' (${other.file}:${other.line}). ` +
          `2) Call this function as msg.sender. 3) Read the mapping at '${other.key}' afterwards: the entry is still there.`,
      });
    }
  }
  return findings;
}
