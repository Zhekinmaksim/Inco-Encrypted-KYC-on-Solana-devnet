# Claimrail RTG Submission Pack

## Project name

Claimrail

## Live links

- live app: [https://claimrail.vercel.app](https://claimrail.vercel.app)
- repo branch: [claimrail-rtg-package](https://github.com/Zhekinmaksim/Inco-Encrypted-KYC-on-Solana-devnet/tree/claimrail-rtg-package)
- RTG track: [Arcium RTG - Private Lending & Borrowing](https://rtg.arcium.com/rtg/dev-lending-borrowing)

## GitHub description

Claimrail is a private eligibility rail for private lending and borrowing on Solana.

## One-line

Claimrail is a private eligibility rail for private lending and borrowing on Solana.

## Short description

Claimrail lets a borrower submit an encrypted dossier, lets a lender define policy, and uses Arcium to compute a minimal eligibility outcome without exposing the full borrower file on-chain.

## Submission description

Claimrail is my applied build for Arcium RTG through one concrete workflow: private lending and borrowing on Solana.

The borrower submits an encrypted dossier. The lender defines underwriting and compliance policy. Arcium computes a minimal eligibility outcome that the lender can use without reading the full borrower file. If more detail is required, a verifier can reveal only policy-approved claims.

The point of the project is not to present privacy infrastructure abstractly. It is to show a specific product surface where confidential computation is the right primitive: borrower eligibility, underwriting gates, and selective reveal for follow-up review.

The core message is simple: the lender sees a lending decision, not the full borrower dossier.

## AI-assisted disclosure

I used AI coding and writing tools to accelerate implementation and documentation, but the product design, architecture decisions, privacy model, and Claimrail-specific lending workflow were manually reviewed and directed by me.

## Demo blurb

Claimrail shows how private lending workflows on Solana can move from full document handoff to encrypted eligibility and policy-scoped reveal.

## Two-minute demo script

### 0:00-0:12

Subtitle:
`Claimrail is a private eligibility rail for private lending and borrowing on Solana.`

Voiceover:
`Claimrail lets a lender evaluate borrower eligibility without exposing the full borrower dossier on-chain.`

On screen:
- show the home screen
- hold on the lender context bar and applicant / issuer / verifier desks

### 0:12-0:28

Subtitle:
`The borrower starts with a private dossier, not a public application record.`

Voiceover:
`The borrower submits encrypted underwriting inputs like jurisdiction, accreditation, sanctions status, and requested borrowing amount.`

On screen:
- go to applicant desk
- show initialize state or already initialized dossier
- highlight the borrower fields

### 0:28-0:46

Subtitle:
`Inputs are encrypted before Arcium computes eligibility.`

Voiceover:
`Claimrail does not expose readable borrower data in public state. It prepares encrypted inputs and routes them into private eligibility compute.`

On screen:
- submit the borrower inputs
- show the loading path into result

### 0:46-1:04

Subtitle:
`The lender sees a decision surface, not the raw dossier.`

Voiceover:
`The lender gets a minimal outcome: eligible or not, risk tier, borrowing cap, and whether manual review is required.`

On screen:
- hold on the result card
- point to eligible, risk tier, borrowing cap, and manual review

### 1:04-1:22

Subtitle:
`Policy decides what can be revealed, and to whom.`

Voiceover:
`If more detail is needed, the borrower can grant scoped verifier permissions only for the claims the lender policy requires.`

On screen:
- move to the access policy panel
- select one or two reveal fields
- grant access to a verifier address

### 1:22-1:40

Subtitle:
`The lender reviews the dossier status without reading borrower plaintext.`

Voiceover:
`On the lender desk, Claimrail loads the live dossier, verification status, verifier permissions, and private eligibility result.`

On screen:
- switch to issuer desk
- load the borrower address
- show verification status and eligibility output

### 1:40-1:55

Subtitle:
`The verifier reveals only policy-approved claims.`

Voiceover:
`The verifier does not get blanket access. Only the approved claims can be revealed, claim by claim.`

On screen:
- switch to verifier desk
- load the same borrower
- reveal one approved field

### 1:55-2:00

Subtitle:
`The lender sees a lending decision, not the full borrower dossier.`

Voiceover:
`Claimrail turns private borrower eligibility into a reusable rail for lending on Solana.`

On screen:
- end on the result screen or clean overview

## Recording checklist

- use [https://claimrail.vercel.app](https://claimrail.vercel.app)
- fund the embedded or connected devnet wallet before recording
- record one clean borrower path first
- then record lender lookup
- then record verifier reveal
- avoid showing faucet or failed wallet prompts in the final cut

## Canonical phrasing

- Claimrail is a private eligibility rail for private lending and borrowing on Solana.
- The borrower submits an encrypted dossier.
- The lender defines policy.
- Arcium computes a minimal eligibility outcome.
- The verifier reveals only policy-approved claims.
- The lender sees a lending decision, not the full borrower dossier.
