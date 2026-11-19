import type { SourceFile } from '../types';

/** 1-based line number of a character offset within `content`. */
export function lineOf(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

/**
 * Blank out // and block comments while keeping newlines, so regexes match
 * code only but line numbers stay identical to the original source.
 */
export function stripComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
}

export interface FnInfo {
  name: string;
  params: string;
  header: string;
  body: string;
  startLine: number;
  bodyStartIndex: number;
}

/** Split a file's `function ... { ... }` definitions (brace-matched). */
export function parseFunctions(content: string): FnInfo[] {
  const code = stripComments(content);
  const out: FnInfo[] = [];
  const re = /function\s+(\w+)\s*\(([^)]*)\)\s*([^{;]*)\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const bodyStart = m.index + m[0].length;
    let depth = 1;
    let i = bodyStart;
    while (i < code.length && depth > 0) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}') depth--;
      i++;
    }
    out.push({
      name: m[1],
      params: m[2],
      header: m[3],
      body: code.slice(bodyStart, i - 1),
      startLine: lineOf(code, m.index),
      bodyStartIndex: bodyStart,
    });
  }
  return out;
}

/** Token-receiver callbacks: in these, msg.sender IS the calling contract. */
export function isCallback(name: string): boolean {
  return /received$/i.test(name) || /onERC\d+Received/i.test(name);
}

/** Parameter names of a function, from its raw parameter list. */
export function paramNames(params: string): string[] {
  return params
    .split(',')
    .map((p) => p.trim().split(/\s+/).pop() ?? '')
    .filter(Boolean);
}

/** Local variable names declared inside a function body (`type name = ...`). */
export function localNames(body: string): Set<string> {
  const names = new Set<string>();
  const re =
    /\b(?:uint\d*|int\d*|bool|address|bytes\d*|string|mapping\([^)]*\)|[\w.]+)\s+(?:memory\s+|calldata\s+|storage\s+)?(\w+)\s*(?:=|;|,)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) names.add(m[1]);
  return names;
}

export interface MappingUsage {
  map: string;
  file: string;
  line: number;
  key: string;
  index: number;
  /** True when this usage clears the entry (`= 0;` or `delete`). */
  isClear: boolean;
}

const USAGE_RE =
  /(?:\$(\w+)\.get\(\)\s*\[([^\]]+)\]|(?<![\w$.])(\w+)\s*\[([^\]]+)\])/g;

/**
 * All `name[...]` / `$name.get()[...]` index usages of mappings in one file,
 * with the key text, line, and whether the usage clears the entry.
 */
export function mappingUsages(file: SourceFile): MappingUsage[] {
  const out: MappingUsage[] = [];
  const code = stripComments(file.content);
  let m: RegExpExecArray | null;
  while ((m = USAGE_RE.exec(code)) !== null) {
    const map = m[1] ?? m[3];
    const key = (m[2] ?? m[4]).trim();
    const after = code.slice(m.index + m[0].length, code.indexOf('\n', m.index));
    const before = code.slice(code.lastIndexOf('\n', m.index) + 1, m.index);
    const isClear = /^\s*=\s*0\s*;/.test(after) || /delete\s*$/.test(before);
    out.push({ map, file: file.path, line: lineOf(code, m.index), key, index: m.index, isClear });
  }
  return out;
}
