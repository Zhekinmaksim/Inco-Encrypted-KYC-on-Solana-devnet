"use client";
import { Eye, Fingerprint, Lock, Radar, Shield, Sparkles } from "lucide-react";

const features = [
  {
    icon: Fingerprint,
    title: "Applicant onboarding",
    desc: "Applicants start with email or wallet inside one controlled surface instead of being thrown into raw wallet modals.",
  },
  {
    icon: Lock,
    title: "Lender policy scope",
    desc: "Lenders can request only the claims they actually need and receive policy-approved attestations instead of the full borrower dossier.",
  },
  {
    icon: Shield,
    title: "Attestation storage",
    desc: "The Claimrail program stores encrypted applicant inputs and minimal eligibility outcomes, not full readable records.",
  },
  {
    icon: Eye,
    title: "Verifier reveal path",
    desc: "Decryption still requires an authorized verifier wallet and an attested message signature at reveal time.",
  },
];

export default function InfoPanel() {
  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow">
          <Sparkles className="h-3.5 w-3.5" />
          Product posture
        </div>
        <h3 className="mt-4 font-display text-2xl font-bold text-ink-800">
          Claimrail should read like a private lending eligibility product, not a generic identity demo.
        </h3>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink-500">
          The product posture is borrower intake, lender policy, private eligibility compute, and verifier reveal for lending workflows on Solana.
        </p>
      </div>

      <div className="space-y-3">
        {features.map(({ icon: Icon, title, desc }, idx) => (
          <div
            key={title}
            className="animate-slide-up rounded-3xl border border-black/8 bg-white/80 p-4"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-signal-mint/55 text-signal-sage">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-800">{title}</p>
                <p className="mt-1 text-sm leading-6 text-ink-500">{desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[28px] border border-black/10 bg-ink-800 p-5 text-white">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
          <Radar className="h-3.5 w-3.5" />
          Data path
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold">1. Privy session</p>
            <p className="mt-2 text-sm leading-6 text-white/70">
              The borrower authenticates with email or wallet. An embedded Solana wallet can exist without forcing the whole flow into wallet-first friction.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">2. Attestation inputs</p>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Each borrower claim is prepared for encrypted compute before the program ever sees a verdict.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">3. Policy reveal</p>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Arcium computes the eligibility result privately, then the program reveals only the fields a lender policy explicitly requires.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
