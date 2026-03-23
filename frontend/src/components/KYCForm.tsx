"use client";
import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { User, Calendar, Globe, FileText, Hash, MapPin, Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface KYCFormProps {
  onSubmit: (values: string[]) => Promise<void>;
  isSubmitting: boolean;
  currentStep: number; // 0-5 field being submitted, -1 = idle, 6 = done
}

const FIELDS = [
  { key: "fullName", label: "Full Legal Name", icon: User, placeholder: "John Doe", type: "text" },
  { key: "dob", label: "Date of Birth", icon: Calendar, placeholder: "", type: "date" },
  { key: "nationality", label: "Nationality", icon: Globe, placeholder: "Germany", type: "text" },
  { key: "docType", label: "Document Type", icon: FileText, placeholder: "", type: "select" },
  { key: "docNumber", label: "Document Number", icon: Hash, placeholder: "C01234567", type: "text" },
  { key: "address", label: "Residential Address", icon: MapPin, placeholder: "123 Main St, Frankfurt", type: "textarea" },
] as const;

export default function KYCForm({ onSubmit, isSubmitting, currentStep }: KYCFormProps) {
  const { connected, publicKey } = useWallet();
  const [values, setValues] = useState(["", "", "", "passport", "", ""]);

  const set = (i: number, v: string) => setValues((prev) => { const n = [...prev]; n[i] = v; return n; });

  const validate = () => values.every((v, i) => v.trim() !== "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(values);
  };

  const inputCls = "w-full bg-inco-dark border border-inco-border rounded-xl px-4 py-3 pl-11 text-sm font-body text-inco-text placeholder:text-inco-muted/50 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {connected && publicKey ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-inco-accent/5 border border-inco-accent/20">
          <CheckCircle2 className="w-4 h-4 text-inco-accent flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-inco-accent font-semibold font-body">Wallet Connected</p>
            <p className="text-[10px] font-display text-inco-muted truncate">{publicKey.toBase58()}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-inco-warn/5 border border-inco-warn/20">
          <AlertCircle className="w-4 h-4 text-inco-warn flex-shrink-0" />
          <p className="text-[11px] text-inco-warn font-body">Connect your Solana wallet to submit KYC</p>
        </div>
      )}

      {FIELDS.map((f, i) => (
        <div key={f.key} className="relative">
          <label className="block text-[10px] font-body font-semibold text-inco-muted mb-1 uppercase tracking-wider">
            {f.label}
            {isSubmitting && currentStep === i && (
              <span className="ml-2 text-inco-accent animate-pulse">encrypting…</span>
            )}
            {isSubmitting && currentStep > i && (
              <span className="ml-2 text-inco-accent">✓</span>
            )}
          </label>
          <div className="relative">
            <f.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-inco-muted" />
            {f.type === "select" ? (
              <select value={values[i]} onChange={(e) => set(i, e.target.value)} className={inputCls + " appearance-none"}>
                <option value="passport">Passport</option>
                <option value="national_id">National ID</option>
                <option value="drivers_license">Driver&apos;s License</option>
              </select>
            ) : f.type === "textarea" ? (
              <textarea value={values[i]} onChange={(e) => set(i, e.target.value)} placeholder={f.placeholder} rows={2} className={inputCls + " resize-none"} />
            ) : (
              <input type={f.type} value={values[i]} onChange={(e) => set(i, e.target.value)} placeholder={f.placeholder} className={inputCls} />
            )}
          </div>
        </div>
      ))}

      <button
        type="submit"
        disabled={!connected || isSubmitting || !validate()}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-body font-semibold text-sm
          bg-gradient-to-r from-inco-accent to-emerald-400 text-inco-dark
          hover:shadow-[0_0_30px_rgba(0,229,160,0.3)] transition-all duration-300
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Encrypting field {currentStep + 1}/6 via Inco…
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Encrypt &amp; Submit to Solana
          </>
        )}
      </button>
    </form>
  );
}
