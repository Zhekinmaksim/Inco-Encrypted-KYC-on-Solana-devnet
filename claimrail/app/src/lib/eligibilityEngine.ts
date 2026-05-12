import type { EligibilityOutput } from "@/lib/claimrailView";

export type { EligibilityOutput } from "@/lib/claimrailView";

export const PERSONAS = {
  eligible_b: {
    label: "Eligible · Tier B",
    description: "Accredited investor, EU resident, $250k net worth",
    values: ["DE", "true", "100k-1M", "none", "false", "75000"],
    expected: "Eligible · Tier B · $75,000 cap",
  },
  rejected_jurisdiction: {
    label: "Rejected · jurisdiction",
    description: "Wrong jurisdiction (US — not allowlisted)",
    values: ["US", "true", "1M-10M", "none", "false", "100000"],
    expected: "Rejected · US not in allowlist",
  },
  manual_review_pep: {
    label: "Manual review · PEP",
    description: "Foreign politically exposed person — escalate to human review",
    values: ["FR", "true", "1M-10M", "foreign", "false", "200000"],
    expected: "Manual review · PEP flag",
  },
} as const;

export type PersonaKey = keyof typeof PERSONAS;

export function emptyEligibility(): EligibilityOutput | null {
  return null;
}
