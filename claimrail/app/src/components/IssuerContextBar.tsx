"use client";
import { PERSONAS, type PersonaKey } from "@/lib/eligibilityEngine";

interface Props {
  walletAddress: string | null;
  onLoadPersona: (key: PersonaKey) => void;
  activePersona: PersonaKey | null;
}

export default function IssuerContextBar({ walletAddress, onLoadPersona, activePersona }: Props) {
  return (
    <div className="panel p-5 mb-6">
      {/* Issuer header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <span className="lbl">Issuer</span>
          <h2 className="mt-1 font-body text-[20px] font-600 leading-tight" style={{ letterSpacing: "-0.02em" }}>
            Northline Credit Desk
          </h2>
          <p className="mt-1 text-[13px]" style={{ color: "var(--ink-2)" }}>
            private credit · borrower eligibility only · EU + SG + CH + UK
          </p>
        </div>
        <div className="text-right">
          <span className="lbl">Applicant</span>
          <p className="mt-1 font-mono text-[11px]" style={{ color: walletAddress ? "var(--ink)" : "var(--ink-3)" }}>
            {walletAddress
              ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}`
              : "not connected"}
          </p>
        </div>
      </div>

      {/* Policy summary — three cell grid mirroring the mark */}
      <div className="grid grid-cols-3 mt-4" style={{ border: "1px solid var(--b2)" }}>
        {[
          { l: "Min profile",    v: "Verified borrower", h: "jurisdiction + dossier checks" },
          { l: "Borrowing cap",  v: "$75,000",          h: "tier B demo borrower limit" },
          { l: "Sanctions",      v: "OFAC + EU",        h: "manual review if flagged" },
        ].map((item, i) => (
          <div key={item.l} className="px-3 py-2.5 bg-bg-2"
            style={{ borderRight: i < 2 ? "1px solid var(--b2)" : "none" }}>
            <span className="lbl">{item.l}</span>
            <p className="mt-1 text-[13px] font-500">{item.v}</p>
            <p className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>{item.h}</p>
          </div>
        ))}
      </div>

      {/* Replay demo personas */}
      <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--b)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="lbl">Replay demo</span>
          <span className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
            three personas - see policy outcomes without connecting a wallet
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(Object.entries(PERSONAS) as [PersonaKey, typeof PERSONAS[PersonaKey]][]).map(([key, p]) => {
            const active = activePersona === key;
            return (
              <button
                key={key}
                onClick={() => onLoadPersona(key)}
                className="text-left p-3 transition-colors"
                style={{
                  border: active ? "1px solid #2D5BFF" : "1px solid var(--b2)",
                  background: active ? "rgba(45,91,255,0.06)" : "var(--bg-2)",
                  cursor: "pointer",
                }}
              >
                <span className="lbl" style={{ color: active ? "#2D5BFF" : undefined }}>{p.label}</span>
                <p className="mt-1 text-[12px]" style={{ color: "var(--ink-2)" }}>{p.description}</p>
                <p className="mt-1 font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>{p.expected}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
