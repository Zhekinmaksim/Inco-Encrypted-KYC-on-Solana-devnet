# Claimrail Repository

This repository contains two different codepaths:

- `claimrail/` is the active Arcium-native project and the only submission path we use now.
- the root-level Inco prototype is retained only as archive/reference material from the earlier build.

## Active track

Claimrail is being positioned only for **Arcium RTG**, specifically the **Private Lending & Borrowing** track:

- RTG page: [Private Lending & Borrowing](https://rtg.arcium.com/rtg/dev-lending-borrowing)
- scope: private borrower onboarding, encrypted eligibility checks, and selective reveal for compliance and underwriting

Canonical framing:

- Claimrail is a private eligibility rail for private lending and borrowing on Solana.
- borrowers submit an encrypted dossier
- lenders define policy
- Arcium computes a minimal eligibility outcome
- verifiers reveal only policy-approved claims

## RTG posture

Claimrail should be presented as an applied product build, not as a generic AI-generated submission.

- product framing, privacy model, and architecture decisions are manually directed
- AI tools were used for acceleration, refactoring, and drafting
- all Claimrail-specific workflow, role design, and Arcium fit analysis were manually reviewed and shaped for this use case

## Where to work

Use the dedicated workspace:

```text
claimrail/
```

The active project README is here:

```text
claimrail/README.md
```

## Archive note

The root-level Inco implementation is not the active submission and should not be used as current product documentation.
