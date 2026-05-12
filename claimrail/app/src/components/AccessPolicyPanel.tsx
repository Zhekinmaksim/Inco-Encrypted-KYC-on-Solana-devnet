"use client";
import { Loader2 } from "lucide-react";
import { KYC_FIELDS, type VerificationStatus, type VerifierPermission } from "@/lib/claimrailView";
import { getVerificationStatusMeta } from "@/lib/claimrailView";

const FIELDS = KYC_FIELDS;

function statusColor(s: string) {
  if (s === "approved")                                  return "var(--green)";
  if (s === "rejected")                                  return "var(--red)";
  if (s === "manual_review" || s === "pending_review")   return "var(--amber)";
  return "var(--ink-3)";
}

interface Props {
  dossier: any | null;
  verificationStatus: VerificationStatus | null;
  verifierPermissions: VerifierPermission[];
  verifierAddress: string;
  verifierAddressError: string | null;
  onVerifierAddressChange: (v: string) => void;
  selectedFields: boolean[];
  onToggleField: (i: number) => void;
  onSelectSubmitted: () => void;
  onClearSelection: () => void;
  onGrant: () => void;
  onRevoke: () => void;
  busyAction: "grant" | "revoke" | null;
  feedback: { type: "success" | "error" | "info"; text: string } | null;
}

export default function AccessPolicyPanel({
  dossier, verificationStatus, verifierPermissions,
  verifierAddress, verifierAddressError, onVerifierAddressChange,
  selectedFields, onToggleField, onSelectSubmitted, onClearSelection,
  onGrant, onRevoke, busyAction, feedback,
}: Props) {
  const meta = getVerificationStatusMeta(verificationStatus?.status || "not_submitted");
  const sel  = selectedFields.filter(Boolean).length;

  return (
    <div className="panel p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="lbl">Reveal policy</span>
          <h3 className="mt-1 font-body text-[15px] font-600" style={{ color: "var(--ink)" }}>
            Access control
          </h3>
        </div>
        {verificationStatus && (
          <div className="text-right">
            <span className="lbl">Issuer status</span>
            <p className="mt-1 font-mono text-[11px] font-500" style={{ color: statusColor(verificationStatus.status) }}>
              {meta.label}
            </p>
            {verificationStatus.attestationId && (
              <p className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
                {verificationStatus.attestationId}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rule" />

      {/* Verifier address */}
      <div>
        <span className="lbl mb-1.5">Verifier wallet</span>
        <input
          value={verifierAddress}
          onChange={e => onVerifierAddressChange(e.target.value)}
          placeholder="Solana base58 address"
          className={`inp ${verifierAddressError ? "inp-err" : ""}`}
        />
        {verifierAddressError && (
          <p className="mt-1 font-mono text-[11px] s-err">{verifierAddressError}</p>
        )}
      </div>

      {/* Field selector */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="lbl">Fields</span>
          <div className="flex gap-4">
            <button onClick={onSelectSubmitted} className="lbl transition-colors hover:text-blue" style={{ cursor: "pointer" }}>
              all submitted
            </button>
            <button onClick={onClearSelection} className="lbl transition-colors hover:text-ink-2" style={{ cursor: "pointer" }}>
              clear
            </button>
          </div>
        </div>
        {/* 6-cell grid — same grid logic as the mark */}
        <div className="grid grid-cols-6" style={{ border: "1px solid var(--b2)" }}>
          {FIELDS.map((label, i) => {
            const submitted = dossier?.fields?.[i]?.submitted ?? false;
            const checked   = selectedFields[i];
            return (
              <button
                key={label}
                type="button"
                onClick={() => onToggleField(i)}
                disabled={!submitted}
                style={{
                  padding: "8px 6px",
                  borderRight: i < FIELDS.length - 1 ? "1px solid var(--b2)" : "none",
                  background: checked ? "#2D5BFF" : "var(--bg-2)",
                  color: checked ? "#fff" : submitted ? "var(--ink)" : "var(--ink-3)",
                  fontFamily: "var(--font-mono)", fontSize: 10,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  cursor: submitted ? "pointer" : "not-allowed",
                  opacity: submitted ? 1 : 0.4,
                  transition: "background 0.1s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onGrant} disabled={!!busyAction || sel === 0} className="btn-blue">
          {busyAction === "grant" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Grant {sel > 0 ? `${sel} field${sel !== 1 ? "s" : ""}` : "fields"}
        </button>
        <button onClick={onRevoke} disabled={!!busyAction || sel === 0} className="btn">
          {busyAction === "revoke" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Revoke
        </button>
      </div>

      {feedback && (
        <p className={`font-mono text-[11px] ${feedback.type === "success" ? "s-ok" : feedback.type === "error" ? "s-err" : ""}`}
          style={feedback.type === "info" ? { color: "var(--ink-3)" } : undefined}>
          {feedback.text}
        </p>
      )}

      {verifierPermissions.length > 0 && (
        <div>
          <div className="rule mb-3" />
          <span className="lbl mb-2">Active permissions</span>
          <div className="space-y-px" style={{ marginTop: 8 }}>
            {verifierPermissions.map(perm => (
              <div key={perm.wallet} className="panel-1 px-3 py-2" style={{ borderLeft: "2px solid #2D5BFF" }}>
                <p className="font-mono text-[11px] truncate" style={{ color: "var(--ink-2)" }}>{perm.wallet}</p>
                <p className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
                  {perm.fieldIndexes.map(i => FIELDS[i]).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
