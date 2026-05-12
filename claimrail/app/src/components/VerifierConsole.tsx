"use client";
import { ArrowRight, Loader2, Search } from "lucide-react";
import type { KycDossier } from "@/hooks/useConfidentialKyc";
import type { VerificationStatus, VerifierPermission } from "@/lib/claimrailView";
import { getVerificationStatusMeta } from "@/lib/claimrailView";

type RevealState = { status: "idle"|"loading"|"success"|"error"; value?: string };

interface Props {
  connected: boolean; requiresPrivySetup: boolean; walletAddress: string | null;
  applicantAddress: string; onApplicantAddressChange: (v: string) => void;
  onEmailLogin: () => void; onWalletConnect: () => void; onLookup: () => Promise<void>;
  lookupLoading: boolean; lookupError: string | null;
  dossier: KycDossier | null; verificationStatus: VerificationStatus | null;
  verifierPermissions: VerifierPermission[];
  reveals: Record<number, RevealState>; onReveal: (i: number, h: string) => Promise<void>;
}

function statusColor(s: string) {
  if (s === "approved")                                return "var(--green)";
  if (s === "rejected")                                return "var(--red)";
  if (s === "manual_review" || s === "pending_review") return "var(--amber)";
  return "var(--ink-3)";
}

export default function VerifierConsole({
  connected, requiresPrivySetup, walletAddress,
  applicantAddress, onApplicantAddressChange, onEmailLogin, onWalletConnect, onLookup,
  lookupLoading, lookupError, dossier, verificationStatus, verifierPermissions,
  reveals, onReveal,
}: Props) {
  const meta     = getVerificationStatusMeta(verificationStatus?.status || "not_submitted");
  const myPerms  = verifierPermissions.find(p => p.wallet === walletAddress)?.fieldIndexes || [];
  const approved = verificationStatus?.status === "approved";

  if (!connected) return (
    <div className="space-y-3">
      <p className="text-[13px]" style={{ color: "var(--ink-2)" }}>
        {requiresPrivySetup
          ? "Set NEXT_PUBLIC_PRIVY_APP_ID in .env.local."
          : "Connect with an issuer-side verifier wallet to reveal policy-approved claims."}
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
        <span className="lbl">Verifier wallet</span>
        <p className="font-mono text-[11px]" style={{ color: "var(--ink-2)" }}>{walletAddress || "connected"}</p>
      </div>

      {/* Lookup */}
      <div>
        <span className="lbl mb-1.5">Load applicant dossier</span>
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

      {dossier && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3" style={{ border: "1px solid var(--b2)" }}>
            {[
              { l: "Fields",      v: `${dossier.fieldCount}` },
              { l: "Status",      v: meta.label, color: statusColor(verificationStatus?.status || "") },
              { l: "Permissions", v: myPerms.length > 0 ? `${myPerms.length} fields` : "none" },
            ].map((item, i) => (
              <div key={item.l} className="px-3 py-2.5 bg-bg-2"
                style={{ borderRight: i < 2 ? "1px solid var(--b2)" : "none" }}>
                <span className="lbl">{item.l}</span>
                <p className="mt-1 font-mono text-[11px] font-500"
                  style={{ color: (item as any).color || "var(--ink)" }}>{item.v}</p>
              </div>
            ))}
          </div>

          {/* Field rows */}
          <div>
            <span className="lbl mb-2">Claims</span>
            <div className="mt-2 space-y-px" style={{ marginTop: 8 }}>
              {dossier.fields.map(field => {
                const rev       = reveals[field.index] || { status: "idle" as const };
                const hasPerm   = myPerms.includes(field.index);
                const canReveal = field.submitted && hasPerm && approved;
                return (
                  <div key={field.label}
                    className="panel-1 flex items-start justify-between gap-4 px-3 py-2.5"
                    style={{ borderLeft: `2px solid ${hasPerm ? "#2D5BFF" : "var(--b2)"}` }}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="lbl">{field.label}</span>
                        {hasPerm && <span className="tag-blue">granted</span>}
                      </div>
                      <p className="mt-0.5 font-mono text-[10px] truncate" style={{ color: "var(--ink-3)" }}>
                        {field.submitted ? `${field.handle?.slice(0, 20)}…` : "no handle"}
                      </p>
                      {rev.status === "success" && (
                        <p className="mt-1 font-mono text-[11px] s-ok">revealed: {rev.value}</p>
                      )}
                      {rev.status === "error" && (
                        <p className="mt-1 font-mono text-[11px] s-err">policy denied</p>
                      )}
                      {!approved && field.submitted && (
                        <p className="mt-0.5 font-mono text-[10px] s-warn">awaiting issuer approval</p>
                      )}
                      {approved && !hasPerm && field.submitted && (
                        <p className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
                          not in applicant policy
                        </p>
                      )}
                    </div>
                    <button
                      disabled={!canReveal || rev.status === "loading"}
                      onClick={() => onReveal(field.index, field.handle)}
                      className="btn flex-shrink-0 text-[11px] !py-1 !px-2.5">
                      {rev.status === "loading" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reveal"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
