"use client";
import React, { useEffect, useState } from "react";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import type { PersonaKey } from "@/lib/eligibilityEngine";
import { PERSONAS } from "@/lib/eligibilityEngine";

interface KYCFormProps {
  onSubmit: (values: string[]) => Promise<void>;
  isSubmitting: boolean;
  currentStep: number;
  connected: boolean;
  identityLabel: string | null;
  walletAddress: string | null;
  walletLabel: string | null;
  requiresPrivySetup: boolean;
  onEmailLogin: () => void;
  onWalletConnect: () => void;
  prefillPersona: PersonaKey | null;
}

// Six RWA-relevant fields. Index alignment with the on-chain program is preserved
// (the program treats them as opaque encrypted handles), but the UI surface labels
// them by what they mean for eligibility.
const FIELDS = [
  {
    key: "jurisdiction",
    label: "Jurisdiction",
    sub:   "ISO-2 country code · drives allowlist match",
    type:  "select" as const,
    options: [
      { v: "DE", l: "DE — Germany" },
      { v: "FR", l: "FR — France" },
      { v: "NL", l: "NL — Netherlands" },
      { v: "SG", l: "SG — Singapore" },
      { v: "CH", l: "CH — Switzerland" },
      { v: "GB", l: "GB — United Kingdom" },
      { v: "US", l: "US — United States" },
      { v: "RU", l: "RU — Russia" },
    ],
    index: 0,
  },
  {
    key: "accredited",
    label: "Accredited investor",
    sub:   "Self-attested + verified by issuer",
    type:  "select" as const,
    options: [
      { v: "true",  l: "Yes — accredited" },
      { v: "false", l: "No — retail" },
    ],
    index: 1,
  },
  {
    key: "netWorthBand",
    label: "Net worth band",
    sub:   "Drives tier · A/B/C cap assignment",
    type:  "select" as const,
    options: [
      { v: "<100k",    l: "Under $100k" },
      { v: "100k-1M",  l: "$100k – $1M" },
      { v: "1M-10M",   l: "$1M – $10M" },
      { v: "10M+",     l: "$10M+" },
    ],
    index: 2,
  },
  {
    key: "pepStatus",
    label: "PEP status",
    sub:   "Politically exposed person — requires manual review if flagged",
    type:  "select" as const,
    options: [
      { v: "none",          l: "None" },
      { v: "domestic",      l: "Domestic PEP" },
      { v: "foreign",       l: "Foreign PEP" },
      { v: "international", l: "International org PEP" },
    ],
    index: 3,
  },
  {
    key: "sanctions",
    label: "Sanctions check",
    sub:   "OFAC + EU consolidated list",
    type:  "select" as const,
    options: [
      { v: "false", l: "Clear" },
      { v: "true",  l: "Match found" },
    ],
    index: 4,
  },
  {
    key: "investmentCap",
    label: "Investment intent",
    sub:   "USDC · capped by tier policy",
    type:  "number" as const,
    placeholder: "75000",
    index: 5,
  },
] as const;

const DEFAULTS = ["DE", "true", "100k-1M", "none", "false", "75000"];

export default function KYCForm({
  onSubmit, isSubmitting, currentStep,
  connected, identityLabel, walletAddress, requiresPrivySetup, onEmailLogin, onWalletConnect,
  prefillPersona,
}: KYCFormProps) {
  const [values, setValues] = useState<string[]>(DEFAULTS);
  const set    = (i: number, v: string) => setValues(p => { const n = [...p]; n[i] = v; return n; });
  const valid  = values.every(v => String(v).trim() !== "");
  const pct    = isSubmitting && currentStep >= 0 ? Math.round((currentStep / 6) * 100) : 0;

  // Persona pre-fill
  useEffect(() => {
    if (prefillPersona && PERSONAS[prefillPersona]) {
      setValues([...PERSONAS[prefillPersona].values]);
    }
  }, [prefillPersona]);

  return (
    <div className="space-y-5">
      {/* Auth gate */}
      {!connected && (
        <div className="panel p-4 space-y-3">
          <p className="text-[13px]" style={{ color: "var(--ink-2)" }}>
            {requiresPrivySetup
              ? "Set NEXT_PUBLIC_PRIVY_APP_ID in .env.local to enable onboarding."
              : "Connect with email or wallet. Persona presets above only prefill the dossier."}
          </p>
          {!requiresPrivySetup && (
            <div className="flex flex-wrap gap-2">
              <button onClick={onEmailLogin} className="btn">
                Continue with email <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button onClick={onWalletConnect} className="btn-blue">
                Connect wallet <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Fields */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="lbl">Encrypted dossier</span>
          <div className="flex-1 rule" />
          <span className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
            6 fields · arcium-ready inputs
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {FIELDS.map(f => {
            const i = f.index;
            const enc = isSubmitting && currentStep === i;
            const ok  = isSubmitting && currentStep > i;
            return (
              <div key={f.key}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="lbl">{f.label}</span>
                  {enc && <span className="lbl s-blue">encrypting…</span>}
                  {ok  && <span className="lbl s-ok">✓</span>}
                </div>
                <p className="font-mono text-[10px] mb-1.5" style={{ color: "var(--ink-3)" }}>{f.sub}</p>
                {f.type === "select" ? (
                  <select value={values[i]} onChange={e => set(i, e.target.value)} className="inp">
                    {f.options.map(o => (
                      <option key={o.v} value={o.v}>{o.l}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={values[i]}
                    onChange={e => set(i, e.target.value)}
                    placeholder={f.placeholder}
                    className="inp"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress */}
      {isSubmitting && (
        <div>
          <div className="mb-1 flex justify-between">
            <span className="lbl s-blue">field {Math.min(currentStep + 1, 6)} / 6</span>
            <span className="lbl">{pct}%</span>
          </div>
          <div className="h-px w-full" style={{ background: "var(--b2)" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#2D5BFF", transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      <button
        onClick={() => valid && onSubmit(values)}
        disabled={!connected || isSubmitting || !valid}
        className="btn-blue w-full justify-center py-2.5"
      >
        {isSubmitting
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Encrypting for Arcium…</>
          : <><Lock className="h-3.5 w-3.5" />Encrypt and compute eligibility</>}
      </button>

      <p className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
        Each field is prepared as an encrypted applicant input before any verdict is computed.
        The live backend flow is applicant inputs plus issuer policy into Arcium MPC, then a minimal eligibility outcome back out on devnet.
      </p>
    </div>
  );
}
