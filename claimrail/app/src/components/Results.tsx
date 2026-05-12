"use client";
import React, { useState } from "react";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";
import type { SubmitResult } from "@/hooks/useConfidentialKyc";
import EligibilityResult from "@/components/EligibilityResult";
import ArciumFlow from "@/components/ArciumFlow";
import type { EligibilityOutput } from "@/lib/claimrailView";

interface Props {
  results: SubmitResult[];
  walletAddress: string;
  eligibility: EligibilityOutput | null;
  onBack: () => void;
  onContinueToPolicy: () => void;
}

const trunc = (s: string, n = 10) => s.length <= n * 2 + 3 ? s : `${s.slice(0, n)}…${s.slice(-n)}`;

export default function Results({ results, walletAddress, eligibility, onBack, onContinueToPolicy }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 lbl hover:text-ink-2"
        style={{ cursor: "pointer", background: "none", border: "none" }}>
        <ArrowLeft className="h-3 w-3" /> back
      </button>

      {/* Eligibility verdict — the hero moment */}
      <EligibilityResult result={eligibility} onContinue={eligibility?.eligible ? onContinueToPolicy : undefined} />

      {/* Arcium compute boundary diagram */}
      <ArciumFlow />

      {/* Attestation ledger — collapsed below the verdict */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="lbl">On-chain ledger</span>
          <div className="flex-1 rule" />
          <span className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
            {results.length} encrypted handles · solana devnet
          </span>
        </div>
        {results[0]?.computeTxSignature && (
          <div className="mb-2 panel-1 px-3 py-2">
            <p className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
              profile tx: {trunc(results[0].txSignature, 12)}
            </p>
            <p className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
              compute tx: {trunc(results[0].computeTxSignature, 12)}
            </p>
            {results[0].finalizeTxSignature && (
              <p className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
                finalize tx: {trunc(results[0].finalizeTxSignature, 12)}
              </p>
            )}
          </div>
        )}
        <div className="space-y-px">
          {results.map((r, i) => (
            <div key={i} className="panel-1 px-3 py-2 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="lbl">field #{r.fieldIndex}</span>
                <p className="font-mono text-[10px] truncate s-blue">{trunc(r.handle, 22)}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <a href={`https://explorer.solana.com/tx/${r.txSignature}?cluster=devnet`}
                  target="_blank" rel="noopener noreferrer" className="btn !py-1 !px-2 text-[11px]">
                  <ExternalLink className="h-3 w-3" />tx
                </a>
                <button onClick={() => copy(r.txSignature, `tx-${i}`)} className="btn !py-1 !px-2"
                  style={{ background: "none", borderColor: "var(--b2)" }}>
                  <Copy className="h-3 w-3" style={{ color: copied === `tx-${i}` ? "var(--green)" : undefined }} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
          Owner: {trunc(walletAddress, 8)} · No readable identity data on-chain.
        </p>
      </div>
    </div>
  );
}
