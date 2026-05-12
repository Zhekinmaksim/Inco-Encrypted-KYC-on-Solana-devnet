"use client";
import { ArrowRight, Loader2, Search } from "lucide-react";
import type { KycDossier } from "@/hooks/useConfidentialKyc";
import type {
  EligibilityOutput,
  VerificationStatus,
  VerifierPermission,
} from "@/lib/claimrailView";
import { getVerificationStatusMeta } from "@/lib/claimrailView";
import PolicyRuleEngine from "@/components/PolicyRuleEngine";

interface Props {
  connected: boolean; requiresPrivySetup: boolean; walletAddress: string | null;
  applicantAddress: string; onApplicantAddressChange: (v: string) => void;
  onEmailLogin: () => void; onWalletConnect: () => void; onLookup: () => Promise<void>;
  lookupLoading: boolean; lookupError: string | null;
  dossier: KycDossier | null; verificationStatus: VerificationStatus | null;
  verifierPermissions: VerifierPermission[];
  eligibility: EligibilityOutput | null;
}

function statusColor(s: string) {
  if (s === "approved")                                return "var(--green)";
  if (s === "rejected")                                return "var(--red)";
  if (s === "manual_review" || s === "pending_review") return "var(--amber)";
  return "var(--ink-3)";
}

export default function IssuerConsole({
  connected, requiresPrivySetup, walletAddress,
  applicantAddress, onApplicantAddressChange, onEmailLogin, onWalletConnect, onLookup,
  lookupLoading, lookupError, dossier, verificationStatus, verifierPermissions,
  eligibility,
}: Props) {
  const meta = getVerificationStatusMeta(verificationStatus?.status || "not_submitted");

  if (!connected) return (
    <div className="space-y-3">
      <p className="text-[13px]" style={{ color: "var(--ink-2)" }}>
        {requiresPrivySetup
          ? "Set NEXT_PUBLIC_PRIVY_APP_ID in .env.local."
          : "Sign in with a second wallet to act as the compliance provider."}
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
  );

  return (
    <div className="space-y-6">
      {/* Wallet */}
      <div className="flex items-center gap-3">
        <span className="lbl">Issuer wallet</span>
        <p className="font-mono text-[11px]" style={{ color: "var(--ink-2)" }}>{walletAddress || "connected"}</p>
      </div>

      {/* Rule engine — appears even without a loaded dossier */}
      <PolicyRuleEngine />

      {/* Lookup */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="lbl">Applicant lookup</span>
          <div className="flex-1 rule" />
        </div>
        <div className="flex gap-2">
          <input value={applicantAddress} onChange={e => onApplicantAddressChange(e.target.value)}
            placeholder="Applicant wallet address" className="inp" />
          <button onClick={onLookup} disabled={lookupLoading || !applicantAddress.trim()} className="btn flex-shrink-0">
            {lookupLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Load
          </button>
        </div>
        {lookupError && <p className="mt-1.5 font-mono text-[11px] s-err">{lookupError}</p>}
      </div>

      {dossier && verificationStatus && (
        <>
          <div className="grid grid-cols-3" style={{ border: "1px solid var(--b2)" }}>
            {[
              { l: "Encrypted fields", v: `${dossier.fieldCount}` },
              { l: "Status",           v: meta.label, color: statusColor(verificationStatus.status) },
              { l: "Verifiers",        v: `${verifierPermissions.length}` },
            ].map((item, i) => (
              <div key={item.l} className="px-3 py-2.5 bg-bg-2"
                style={{ borderRight: i < 2 ? "1px solid var(--b2)" : "none" }}>
                <span className="lbl">{item.l}</span>
                <p className="mt-1 font-mono text-[11px] font-500"
                  style={{ color: (item as any).color || "var(--ink)" }}>{item.v}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="lbl">Private outcome</span>
              <div className="flex-1 rule" />
            </div>
            <div className="panel-1 p-3">
              {!eligibility && (
                <p className="font-mono text-[11px]" style={{ color: "var(--ink-3)" }}>
                  Waiting for eligibility computation. Load the applicant after the submit flow finalizes.
                </p>
              )}
              {eligibility && (
                <pre className="font-mono text-[11px] leading-6" style={{ color: "var(--ink-2)", margin: 0 }}>{`{
  "status":                "${meta.label}",
  "decryptable":           ${String(eligibility.decryptable)},
  "eligible":              ${String(eligibility.eligible)},
  "riskTier":              "${eligibility.riskTier}",
  "maxAllocation":         ${eligibility.maxAllocation},
  "manualReview":          ${String(eligibility.manualReview)},
  "requiredRevealFields":  [${eligibility.requiredRevealFields.map((field) => `"${field}"`).join(", ")}]
}`}</pre>
              )}
            </div>
            <p className="text-[13px]" style={{ color: "var(--ink-2)" }}>
              The issuer desk reads live dossier, permission, and eligibility accounts. No applicant plaintext is stored on-chain.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
