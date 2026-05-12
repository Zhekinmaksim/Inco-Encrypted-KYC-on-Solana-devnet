"use client";
import { ArrowRight } from "lucide-react";
import type { EligibilityOutput } from "@/lib/claimrailView";

interface Props {
  result: EligibilityOutput | null;
  onContinue?: () => void;
}

export default function EligibilityResult({ result, onContinue }: Props) {
  if (!result) return null;

  const {
    availableOnChain,
    eligible,
    riskTier,
    maxAllocation,
    manualReview,
    rejectionReason,
    requiredRevealFields,
    decryptable,
  } = result;

  // Top status colors
  const accent = eligible
    ? "var(--green)"
    : manualReview
      ? "var(--amber)"
      : "var(--red)";

  const headline = eligible
    ? "Eligible"
    : manualReview
      ? "Manual review"
      : availableOnChain && !decryptable
        ? "Encrypted result"
        : "Rejected";

  const fmtUSD = (n: number) => "$" + n.toLocaleString("en-US");

  return (
    <div className="panel" style={{ borderLeft: `2px solid ${accent}` }}>
      {/* Hero row */}
      <div className="px-5 py-4 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <span className="lbl" style={{ color: accent }}>Eligibility verdict</span>
          <h3 className="mt-1 font-body text-[24px] font-600 leading-none" style={{ letterSpacing: "-0.02em" }}>
            {headline}
          </h3>
          {availableOnChain && !decryptable && (
            <p className="mt-2 text-[13px]" style={{ color: "var(--ink-2)" }}>
              Computation finalized on-chain. Open the same browser session that submitted the dossier to decrypt the outcome.
            </p>
          )}
          {eligible && (
            <p className="mt-2 text-[13px]" style={{ color: "var(--ink-2)" }}>
              Tier {riskTier} · {fmtUSD(maxAllocation)} cap · {requiredRevealFields.length} field{requiredRevealFields.length !== 1 ? "s" : ""} required for reveal
            </p>
          )}
          {manualReview && (
            <p className="mt-2 text-[13px]" style={{ color: "var(--ink-2)" }}>
              Routed to compliance review queue. PEP flag requires human attestation.
            </p>
          )}
          {!eligible && !manualReview && rejectionReason && (
            <p className="mt-2 text-[13px]" style={{ color: "var(--ink-2)" }}>
              {rejectionReason}
            </p>
          )}
        </div>
        {eligible && decryptable && onContinue && (
          <button onClick={onContinue} className="btn-blue">
            Grant reveal policy <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Output JSON */}
      <div className="px-5 pb-4">
        <div className="panel-1 p-3">
          <pre className="font-mono text-[11px] leading-6" style={{ color: "var(--ink-2)", margin: 0 }}>{`{
  "availableOnChain":     `}<span style={{ color: "#2D5BFF" }}>{String(availableOnChain)}</span>{`,
  "decryptable":          `}<span style={{ color: decryptable ? "var(--green)" : "var(--amber)" }}>{String(decryptable)}</span>{`,
  "eligible":             `}<span style={{ color: eligible ? "var(--green)" : "var(--red)" }}>{String(eligible)}</span>{`,
  "riskTier":             `}<span style={{ color: "var(--amber)" }}>{`"${riskTier}"`}</span>{`,
  "maxAllocation":        `}<span style={{ color: "var(--ink)" }}>{eligible ? fmtUSD(maxAllocation) : "$0"}</span>{`,
  "manualReview":         `}<span style={{ color: manualReview ? "var(--amber)" : "var(--ink-3)" }}>{String(manualReview)}</span>{`,
  "rejectionReason":      `}<span style={{ color: rejectionReason ? "var(--red)" : "var(--ink-3)" }}>{rejectionReason ? `"${rejectionReason}"` : "null"}</span>{`,
  "requiredRevealFields": `}<span style={{ color: "#2D5BFF" }}>{`[${requiredRevealFields.map(f => `"${f}"`).join(", ")}]`}</span>{`
}`}</pre>
        </div>
        <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
          Computed by Arcium MPC over encrypted dossier. Issuer wallet 0x… receives only this verdict — never the underlying claims.
        </p>
      </div>
    </div>
  );
}
