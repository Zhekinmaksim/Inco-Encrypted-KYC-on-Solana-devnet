"use client";
import React, { useState } from "react";
import { ShieldCheck, Copy, CheckCircle2, ExternalLink, Clock, Eye, KeyRound } from "lucide-react";
import type { SubmitResult } from "@/hooks/useConfidentialKyc";
import { KYC_FIELDS } from "@/hooks/useConfidentialKyc";

interface ResultsProps {
  results: SubmitResult[];
  walletAddress: string;
  onBack: () => void;
  onDecrypt: (handle: string) => Promise<string>;
}

function truncate(s: string, n: number = 10) {
  if (s.length <= n * 2 + 3) return s;
  return s.slice(0, n) + "···" + s.slice(-n);
}

export default function Results({ results, walletAddress, onBack, onDecrypt }: ResultsProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState<number | null>(null);
  const [decrypted, setDecrypted] = useState<Record<number, string>>({});

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDecrypt = async (idx: number, handle: string) => {
    setDecrypting(idx);
    try {
      const val = await onDecrypt(handle);
      setDecrypted((p) => ({ ...p, [idx]: val }));
    } catch (e) {
      setDecrypted((p) => ({ ...p, [idx]: "(decrypt failed)" }));
    } finally {
      setDecrypting(null);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-body text-inco-muted hover:text-inco-accent transition-colors">
        ← New Submission
      </button>

      {/* Success banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-inco-accent/10 to-inco-accent2/10 border border-inco-accent/20 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-inco-accent/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-inco-accent" />
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-base mb-0.5">KYC On-Chain</h3>
            <p className="text-xs text-inco-muted font-body leading-relaxed">
              All 6 fields encrypted via Inco Lightning and stored on Solana devnet.
              Only you (and parties you authorize) can decrypt the data.
            </p>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-inco-panel border border-inco-border">
          <p className="text-[9px] font-body text-inco-muted uppercase tracking-wider mb-0.5">Wallet</p>
          <p className="text-[10px] font-display text-inco-text truncate">{walletAddress}</p>
        </div>
        <div className="p-3 rounded-xl bg-inco-panel border border-inco-border">
          <p className="text-[9px] font-body text-inco-muted uppercase tracking-wider mb-0.5">Timestamp</p>
          <p className="text-[10px] font-body text-inco-text flex items-center gap-1">
            <Clock className="w-3 h-3" /> {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      {/* Encrypted fields */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-body font-semibold text-inco-muted uppercase tracking-wider flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" /> Encrypted Handles
        </h4>
        {results.map((r, i) => (
          <div key={i} className="group p-3 rounded-xl bg-inco-dark border border-inco-border hover:border-inco-accent/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-body text-inco-muted uppercase tracking-wider">{KYC_FIELDS[r.fieldIndex]}</p>
                <p className="text-[11px] font-display text-inco-accent/80 truncate mt-0.5">
                  handle: {truncate(r.handle, 14)}
                </p>
                {decrypted[i] && (
                  <p className="text-[11px] font-body text-inco-warn mt-0.5">
                    <KeyRound className="w-3 h-3 inline mr-1" />decrypted: {decrypted[i]}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={() => handleDecrypt(i, r.handle)}
                  disabled={decrypting === i || !!decrypted[i]}
                  className="p-1.5 rounded-lg hover:bg-inco-border/50 transition-colors text-inco-muted hover:text-inco-warn disabled:opacity-30"
                  title="Decrypt (Attested Reveal)"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => copy(r.txSignature, `tx-${i}`)}
                  className="p-1.5 rounded-lg hover:bg-inco-border/50 transition-colors"
                  title="Copy tx signature"
                >
                  {copied === `tx-${i}` ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-inco-accent" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-inco-muted group-hover:text-inco-text" />
                  )}
                </button>
              </div>
            </div>
            <a
              href={`https://explorer.solana.com/tx/${r.txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 mt-1.5 text-[9px] font-display text-inco-muted hover:text-inco-accent transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> tx: {r.txSignature.slice(0, 16)}…
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
