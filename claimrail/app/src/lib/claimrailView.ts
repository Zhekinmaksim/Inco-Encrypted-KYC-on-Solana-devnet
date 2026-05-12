import { Buffer } from "buffer";
import { PublicKey } from "@solana/web3.js";

export const CLAIMRAIL_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_CLAIMRAIL_PROGRAM_ID ||
    "FhJCrC4QMtAjiDkBVG85d9mLfieJdzXtQ7FQLgvAin4j"
);

export const DEFAULT_POLICY_ISSUER = new PublicKey(
  process.env.NEXT_PUBLIC_DEFAULT_POLICY_ISSUER ||
    "2Dq9UoNEXK2Viif5jPNcTVVVJgV4pwct5yygmG12higr"
);

export const KYC_FIELDS = [
  "Jurisdiction",
  "Accreditation Status",
  "Net Worth Band",
  "PEP Status",
  "Sanctions Status",
  "Requested Borrowing Amount",
] as const;

export const REVEAL_FIELD_KEYS = [
  "jurisdiction",
  "accredited",
  "net_worth_band",
  "pep_status",
  "sanctions",
  "investment_cap",
] as const;

export type KYCFieldIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type VerificationDecision =
  | "not_submitted"
  | "pending_review"
  | "manual_review"
  | "approved"
  | "rejected";

export interface VerifierPermission {
  wallet: string;
  fieldIndexes: number[];
  updatedAt: number;
}

export interface EligibilityOutput {
  availableOnChain: boolean;
  eligible: boolean;
  riskTier: "A" | "B" | "C" | "REJECT";
  maxAllocation: number;
  manualReview: boolean;
  rejectionReason: string | null;
  requiredRevealFields: string[];
  requiredRevealMask: number;
  computedAt: number | null;
  decryptable: boolean;
}

export interface VerificationStatus {
  applicant: string;
  status: VerificationDecision;
  issuerName: string;
  providerLabel: string;
  issuerWallet: string | null;
  note: string;
  attestationId: string | null;
  createdAt: number | null;
  reviewedAt: number | null;
}

export interface KycDossierField {
  index: KYCFieldIndex;
  label: string;
  handle: string;
  submitted: boolean;
}

export interface KycDossier {
  owner: string;
  kycPda: string;
  policyPda: string;
  fieldCount: number;
  submittedAt: number | null;
  fields: KycDossierField[];
}

export function derivePolicyPda(issuer: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("policy"), issuer.toBuffer()],
    CLAIMRAIL_PROGRAM_ID
  )[0];
}

export function deriveDossierPda(applicant: PublicKey, policy: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("dossier"), applicant.toBuffer(), policy.toBuffer()],
    CLAIMRAIL_PROGRAM_ID
  )[0];
}

export function deriveEligibilityPda(dossier: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("eligibility"), dossier.toBuffer()],
    CLAIMRAIL_PROGRAM_ID
  )[0];
}

export function derivePermissionPda(dossier: PublicKey, verifier: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("permission"), dossier.toBuffer(), verifier.toBuffer()],
    CLAIMRAIL_PROGRAM_ID
  )[0];
}

export function getVerificationStatusMeta(status: VerificationDecision) {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        tone: "border-signal-sage/20 bg-signal-mint/30 text-ink-700",
      };
    case "manual_review":
      return {
        label: "Manual review",
        tone: "border-[#c48b36]/20 bg-[#fff5df] text-ink-700",
      };
    case "rejected":
      return {
        label: "Rejected",
        tone: "border-signal-rust/20 bg-white text-signal-rust",
      };
    case "pending_review":
      return {
        label: "Pending review",
        tone: "border-black/10 bg-white text-ink-600",
      };
    default:
      return {
        label: "Not submitted",
        tone: "border-black/10 bg-white text-ink-500",
      };
  }
}

export function deriveRequiredRevealFields(mask: number) {
  const fields: string[] = [];
  REVEAL_FIELD_KEYS.forEach((field, index) => {
    if ((mask & (1 << index)) !== 0) {
      fields.push(field);
    }
  });
  return fields;
}

export function decodeRiskTier(value: number): EligibilityOutput["riskTier"] {
  if (value === 1) return "A";
  if (value === 2) return "B";
  if (value === 3) return "C";
  return "REJECT";
}

export function deriveEligibilityOutput(
  values: {
    eligible: boolean;
    riskTier: number;
    maxAllocation: number;
    manualReview: boolean;
    requiredRevealMask: number;
  },
  computedAt: number | null,
  decryptable: boolean
): EligibilityOutput {
  const riskTier = values.eligible ? decodeRiskTier(values.riskTier) : "REJECT";
  const rejectionReason = values.manualReview
    ? null
    : values.eligible
      ? null
      : values.requiredRevealMask === 0
        ? "Policy rejected this borrower."
        : "Lender policy rejected the borrower.";

  return {
    availableOnChain: true,
    eligible: values.eligible,
    riskTier,
    maxAllocation: values.eligible ? values.maxAllocation : 0,
    manualReview: values.manualReview,
    rejectionReason,
    requiredRevealMask: values.requiredRevealMask,
    requiredRevealFields: deriveRequiredRevealFields(values.requiredRevealMask),
    computedAt,
    decryptable,
  };
}

export function deriveVerificationStatus(
  applicant: string,
  dossier: KycDossier | null,
  eligibility: EligibilityOutput | null
): VerificationStatus | null {
  if (!dossier) {
    return {
      applicant,
      status: "not_submitted",
      issuerName: "Northline Credit Desk",
      providerLabel: "Arcium confidential eligibility",
      issuerWallet: DEFAULT_POLICY_ISSUER.toBase58(),
      note: "",
      attestationId: null,
      createdAt: null,
      reviewedAt: null,
    };
  }

  if (!eligibility) {
    return {
      applicant,
      status: dossier.fieldCount > 0 ? "pending_review" : "not_submitted",
      issuerName: "Northline Credit Desk",
      providerLabel: "Arcium confidential eligibility",
      issuerWallet: DEFAULT_POLICY_ISSUER.toBase58(),
      note:
        dossier.fieldCount > 0
          ? "Encrypted dossier submitted on-chain. Eligibility computation not finalized yet."
          : "",
      attestationId: null,
      createdAt: dossier.submittedAt,
      reviewedAt: null,
    };
  }

  if (eligibility.availableOnChain && !eligibility.decryptable) {
    return {
      applicant,
      status: "pending_review",
      issuerName: "Northline Credit Desk",
      providerLabel: "Encrypted Arcium verdict on-chain",
      issuerWallet: DEFAULT_POLICY_ISSUER.toBase58(),
      note: "Eligibility result is finalized on-chain but can only be decrypted in the compute session.",
      attestationId: null,
      createdAt: dossier.submittedAt,
      reviewedAt: eligibility.computedAt,
    };
  }

  const status: VerificationDecision = eligibility.manualReview
    ? "manual_review"
    : eligibility.eligible
      ? "approved"
      : "rejected";
  const attestationId =
    status === "approved" && eligibility.computedAt
      ? `CR-${applicant.slice(0, 4).toUpperCase()}-${eligibility.computedAt
          .toString(36)
          .toUpperCase()}`
      : null;

  return {
    applicant,
    status,
    issuerName: "Northline Credit Desk",
    providerLabel: eligibility.decryptable
      ? "Arcium confidential eligibility"
      : "Encrypted Arcium verdict on-chain",
    issuerWallet: DEFAULT_POLICY_ISSUER.toBase58(),
    note: eligibility.manualReview
      ? "PEP or sanctions-sensitive profile routed to manual review."
      : eligibility.eligible
        ? `Eligible for tier ${eligibility.riskTier} up to $${eligibility.maxAllocation.toLocaleString("en-US")}.`
        : eligibility.rejectionReason || "Policy rejected the borrower.",
    attestationId,
    createdAt: dossier.submittedAt,
    reviewedAt: eligibility.computedAt,
  };
}
