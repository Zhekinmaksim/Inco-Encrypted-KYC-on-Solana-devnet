"use client";

import { ArrowRight, Briefcase, Flag, Presentation, Sparkles } from "lucide-react";

const demoSteps = [
  {
    title: "1. Borrower initializes a private dossier",
    body: "Start with the borrower. Email or wallet works. The borrower opens a dossier without exposing underwriting inputs in public state.",
  },
  {
    title: "2. Borrower submits encrypted inputs",
    body: "Residency, document status, and underwriting inputs are encrypted before submission. The workflow prepares private eligibility, not a readable borrower file.",
  },
  {
    title: "3. Lender applies policy",
    body: "Move to the lender view and show the policy surface. The lender should receive a decision path, not blanket access to the dossier.",
  },
  {
    title: "4. Arcium returns a minimal outcome",
    body: "Show the minimal result: eligible or not, risk tier, borrowing cap, and manual review flag. Keep attention on the outcome, not the raw inputs.",
  },
  {
    title: "5. Verifier reveals only approved claims",
    body: "If follow-up review is needed, reveal only the policy-approved claims. This proves the workflow supports scoped access instead of full document handoff.",
  },
];

export default function DemoNarrative() {
  return (
    <section className="paper rounded-[34px] p-6 sm:p-7">
      <div className="eyebrow">
        <Sparkles className="h-3.5 w-3.5" />
        Demo script
      </div>

      <h3 className="mt-4 font-display text-3xl font-bold text-ink-800">
        Show one lending workflow clearly.
      </h3>
      <p className="mt-3 text-sm leading-6 text-ink-500">
        Run the demo like a private lending review. Keep the story on borrower intake, lender policy, Arcium eligibility, and verifier reveal.
      </p>

      <div className="mt-6 grid gap-3">
        {demoSteps.map((step) => (
          <div key={step.title} className="rounded-[26px] border border-black/10 bg-white/85 p-4">
            <p className="text-sm font-semibold text-ink-800">{step.title}</p>
            <p className="mt-2 text-sm leading-6 text-ink-500">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white/80 p-4">
          <div className="flex items-center gap-2 text-ink-700">
            <Presentation className="h-4 w-4" />
            <p className="text-sm font-semibold">Opening line</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Say: "Claimrail is a private eligibility rail for private lending and borrowing on Solana."
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/80 p-4">
          <div className="flex items-center gap-2 text-ink-700">
            <Briefcase className="h-4 w-4" />
            <p className="text-sm font-semibold">Who buys this</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Private credit desks, lending venues, and credit-focused Solana apps that need borrower review without moving full dossiers across every counterparty.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/80 p-4">
          <div className="flex items-center gap-2 text-ink-700">
            <Flag className="h-4 w-4" />
            <p className="text-sm font-semibold">Close</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Close on the principle: the lender sees a lending decision, not the full borrower dossier.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[26px] border border-signal-sage/20 bg-signal-mint/25 p-4 text-sm leading-6 text-ink-600">
        Closing line:
        <span className="ml-2 font-medium text-ink-800">
          "We give lending apps on Solana a way to underwrite borrowers with encrypted eligibility and policy-scoped reveal instead of full dossier exposure."
        </span>
        <ArrowRight className="ml-2 inline h-4 w-4 text-signal-sage" />
      </div>
    </section>
  );
}
