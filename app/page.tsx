"use client";

import { useEffect, useRef, useState } from "react";
import type { Finding, LiveState } from "@/lib/types";
import { toMarkdown } from "@/lib/report-md";
import { CHAINS } from "@/lib/chain";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

const STEPS = [
  "Fetching verified source from Sourcify",
  "Reading live state from the RPC",
  "Running detectors",
  "Ranking findings",
];

interface AnalyzeResult {
  verdict: "AUDIT" | "SKIP";
  summary: string;
  findings: Finding[];
  liveState: LiveState | null;
  address: string;
  chain: string;
  verified: boolean;
}

const EXAMPLES = [
  {
    label: "Kiln vTreasury",
    address: "0xA06634ed78C5121c2A3702b90b6E3926c7B2A641",
    chain: "ethereum",
  },
  {
    label: "Multicall3 (control)",
    address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    chain: "ethereum",
  },
  {
    label: "Chainlink ETH/USD feed",
    address: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    chain: "ethereum",
  },
];

function weiToEth(hex: string): string {
  try {
    const wei = BigInt(hex);
    const unit = BigInt(10) ** BigInt(18);
    const whole = wei / unit;
    const frac = wei % unit;
    if (frac === BigInt(0)) return `${whole} ETH`;
    const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "").slice(0, 6);
    return `${whole}.${fracStr} ETH`;
  } catch {
    return hex;
  }
}

function GhostMark() {
  return (
    <svg
      className="ghost"
      viewBox="0 0 64 64"
      role="img"
      aria-label="Spectre ghost mark"
    >
      <path
        d="M32 6c-11 0-19 8.6-19 20v26.4c0 2.6 3.4 3.6 4.9 1.5L22 49l4.2 4.9c1.5 1.7 4.1 1.7 5.6 0L36 49l4.1 4.9c1.5 2.1 4.9 1.1 4.9-1.5V26C51 14.6 43 6 32 6Z"
        fill="currentColor"
      />
      <circle cx="25" cy="26" r="3.4" fill="#0a0f0a" />
      <circle cx="39" cy="26" r="3.4" fill="#0a0f0a" />
      <path
        d="M27 38c1.6 1.8 8.4 1.8 10 0"
        fill="none"
        stroke="#0a0f0a"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Home() {
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [phase, setPhase] = useState<"idle" | "loading" | "error" | "result">("idle");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [badInput, setBadInput] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function analyze(targetAddress: string, targetChain: string) {
    const trimmed = targetAddress.trim();
    if (!ADDRESS_RE.test(trimmed)) {
      setBadInput(true);
      setError(
        "That doesn't look like an EVM address. A valid address starts with 0x followed by 40 hexadecimal characters — copy one from a block explorer and try again.",
      );
      setPhase("error");
      setResult(null);
      return;
    }
    setBadInput(false);
    setError("");
    setResult(null);
    setPhase("loading");
    setStep(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, 2500);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: trimmed, chain: targetChain }),
      });
      const json = (await res.json()) as Partial<AnalyzeResult> & {
        error?: string;
        recovery?: string;
      };
      if (!res.ok) {
        setError(
          `${json.error ?? "The analysis failed."} ${json.recovery ?? "Try again in a minute."}`,
        );
        setPhase("error");
        return;
      }
      setResult(json as AnalyzeResult);
      setPhase("result");
    } catch {
      setError(
        "Spectre couldn't reach the server — check your connection and try again in a minute.",
      );
      setPhase("error");
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }

  function runExample(example: (typeof EXAMPLES)[number]) {
    setAddress(example.address);
    setChain(example.chain);
    void analyze(example.address, example.chain);
  }

  function exportMarkdown() {
    if (!result || !result.liveState) return;
    const md = toMarkdown(
      result.address,
      result.chain,
      { verdict: result.verdict, summary: result.summary },
      result.findings,
      result.liveState,
    );
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spectre-${result.address.slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <header className="site-header">
        <GhostMark />
        <div>
          <h1 className="site-title">Spectre</h1>
          <p className="site-promise">
            Paste a contract address. Spectre reads its verified source and live
            on-chain state, then ranks the leads worth auditing — before you spend
            an hour on it.
          </p>
        </div>
      </header>

      <main>
        <form
          className="analyze-form"
          onSubmit={(e) => {
            e.preventDefault();
            void analyze(address, chain);
          }}
        >
          <div className="field field-address">
            <label htmlFor="address">Contract address</label>
            <input
              id="address"
              name="address"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="0x…"
              value={address}
              aria-invalid={badInput}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="chain">Chain</label>
            <select
              id="chain"
              name="chain"
              value={chain}
              onChange={(e) => setChain(e.target.value)}
            >
              {CHAINS.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="button button-primary"
            disabled={phase === "loading"}
          >
            {phase === "loading" ? "Analyzing…" : "Analyze"}
          </button>
        </form>

        <div className="examples">
          <p className="examples-label" id="examples-label">
            Try an example:
          </p>
          <ul className="example-buttons" aria-labelledby="examples-label">
            {EXAMPLES.map((ex) => (
              <li key={ex.address}>
                <button
                  type="button"
                  className="button button-ghost"
                  disabled={phase === "loading"}
                  onClick={() => runExample(ex)}
                >
                  {ex.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {phase === "loading" && (
          <div className="status-block">
            <progress className="progress-ring" aria-label="Analysis in progress" />
            <div>
              <p className="progress-step" role="status">
                {STEPS[step]}…
              </p>
              <p className="progress-note">
                Step {step + 1} of {STEPS.length}. This usually takes a few seconds.
              </p>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="error-block" role="alert">
            <h2>Analysis failed</h2>
            <p>{error}</p>
          </div>
        )}

        {phase === "idle" && (
          <div className="empty-block">
            <p>
              No report yet. Paste a contract address above, or try one of the
              examples — Kiln vTreasury is the one with a known lead.
            </p>
          </div>
        )}

        {phase === "result" && result && (
          <>
            <section
              className="verdict"
              data-verdict={result.verdict}
              aria-label="Verdict"
            >
              <h2>{result.verdict === "AUDIT" ? "AUDIT" : "SKIP"}</h2>
              <p className="summary">{result.summary}</p>
              <p className="report-meta">
                {result.address} · {result.chain} ·{" "}
                {result.verified ? "source verified" : "source not verified"}
              </p>
            </section>

            {result.findings.length > 0 && (
              <section className="findings" aria-label="Findings">
                <h2>
                  Findings ({result.findings.length})
                </h2>
                {result.findings.map((f) => (
                  <details className="finding" key={`${f.id}-${f.file}-${f.line}`}>
                    <summary>
                      <span className="severity" data-severity={f.severity}>
                        {f.severity}
                      </span>
                      <span className="finding-title">{f.title}</span>
                      <span className="finding-loc">
                        {f.file}:{f.line}
                      </span>
                    </summary>
                    <div className="finding-body">
                      <p className="finding-id">{f.id}</p>
                      <h3>Why it matters</h3>
                      <p>{f.explanation}</p>
                      <h3>PoC direction</h3>
                      <p>{f.poc}</p>
                    </div>
                  </details>
                ))}
              </section>
            )}

            {result.liveState && (
              <section className="live-state" aria-label="Live state">
                <h2>Live state</h2>
                <dl>
                  <dt>EIP-1967 proxy</dt>
                  <dd>{result.liveState.isProxy ? "yes" : "no"}</dd>
                  {result.liveState.implementation && (
                    <>
                      <dt>Implementation</dt>
                      <dd>{result.liveState.implementation}</dd>
                    </>
                  )}
                  <dt>ETH balance</dt>
                  <dd>{weiToEth(result.liveState.ethBalance)}</dd>
                  {result.liveState.totalSupply !== null && (
                    <>
                      <dt>totalSupply</dt>
                      <dd>{result.liveState.totalSupply}</dd>
                    </>
                  )}
                  {result.liveState.balanceOf !== null && (
                    <>
                      <dt>balanceOf (contract)</dt>
                      <dd>{result.liveState.balanceOf}</dd>
                    </>
                  )}
                </dl>
              </section>
            )}

            {result.liveState && (
              <div className="export-row">
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={exportMarkdown}
                >
                  Export Markdown
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="site-footer">
        <section aria-label="How it works">
          <h2>How it works</h2>
          <ol>
            <li>
              <strong>Fetch source.</strong> Verified source comes from Sourcify;
              unverified contracts stop here with a SKIP.
            </li>
            <li>
              <strong>Read live state.</strong> Balance, proxy implementation, and
              token reads come from a public RPC.
            </li>
            <li>
              <strong>Run detectors.</strong> Ten lightweight detectors scan the
              source for known risky patterns.
            </li>
            <li>
              <strong>Rank.</strong> Findings sort by severity; anything High or
              above earns an AUDIT verdict.
            </li>
          </ol>
        </section>
        <section aria-label="Honest limits">
          <h2>Honest limits</h2>
          <ul>
            <li>
              These are heuristics, not a full audit — a clean report does not
              mean a contract is safe.
            </li>
            <li>Every finding is a lead. Verify it against the source and live state before acting.</li>
            <li>No wallet, no login, no data stored. All reads are public.</li>
          </ul>
        </section>
      </footer>
    </div>
  );
}
