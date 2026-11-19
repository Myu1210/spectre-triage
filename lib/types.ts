export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
export interface SourceFile { path: string; content: string; }
export interface LiveState {
  implementation: string | null;
  ethBalance: string;
  totalSupply: string | null;
  balanceOf: string | null;
  isProxy: boolean;
}
export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  file: string;
  line: number;
  explanation: string;
  poc: string;
}
