# Inco Encrypted KYC on Solana Devnet

Privacy-preserving KYC (Know Your Customer) dApp built on **Solana** using **Inco Lightning** for confidential computing. Personal identity data is encrypted client-side and stored as encrypted handles on-chain — no one can read it without the owner's consent.

## Live Demo

🔗 **[Live Demo](https://inco-encrypted-kyc-on-solana-devnet.vercel.app)**

📋 **Program ID:** `2TRoeeuqTXtfv4vP5weiHRB9vyRcGsWPmJT7tiYrvQoT`

🔍 [View on Solana Explorer](https://explorer.solana.com/address/2TRoeeuqTXtfv4vP5weiHRB9vyRcGsWPmJT7tiYrvQoT?cluster=devnet)

## How It Works

```
Browser                    Solana Devnet              Inco Lightning
   │                            │                          │
   ├── encryptValue(bigint) ────┼──────────────────────────► TEE encrypts
   │   (@inco/solana-sdk)       │                          │  returns ciphertext
   │                            │                          │
   ├── program.submitField() ───► Anchor receives          │
   │   (ciphertext, index)      │  ciphertext              │
   │                            ├── CPI: new_euint128() ───► registers → handle
   │                            │  stores handle in PDA    │
   │                            │                          │
   ◄── tx signature ────────────┤                          │
```

1. User fills the KYC form (name, DOB, nationality, document, address)
2. Each field is encrypted in the browser via `encryptValue()` from `@inco/solana-sdk`
3. Encrypted ciphertext is sent to the Anchor program on Solana
4. The program calls `new_euint128()` via CPI to Inco Lightning — gets an encrypted handle (u128)
5. Handle is stored in the user's KYC PDA on-chain
6. Only authorized wallets can decrypt specific fields via Attested Reveal

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Solana Devnet |
| Encryption | Inco Lightning (TEE-based confidential computing) |
| Smart Contract | Anchor 0.31.1 (Rust) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Wallet | Solana Wallet Adapter (Phantom, Solflare, any Solana wallet) |
| Client SDK | @inco/solana-sdk, @coral-xyz/anchor |

## Project Structure

```
inco-kyc-dapp/
├── programs/confidential-kyc/     # Anchor program (Rust)
│   └── src/lib.rs                 # initializeKyc, submitField, grantAccess, revokeAccess
├── frontend/                      # Next.js application
│   ├── src/hooks/useConfidentialKyc.ts   # Core hook: encrypt → CPI → on-chain
│   ├── src/components/            # UI components
│   ├── src/idl/                   # Auto-generated program IDL
│   └── .env.local                 # Program ID, RPC config
├── target/idl/                    # Anchor-generated IDL
└── scripts/sync-idl.js            # IDL sync utility
```

## Program Instructions

| Instruction | Description |
|------------|-------------|
| `initialize_kyc` | Creates PDA `["kyc", wallet]` to store 6 encrypted fields |
| `submit_field(ciphertext, index)` | CPI to `new_euint128` on Inco Lightning, stores handle |
| `grant_access(index)` | Grants a verifier decrypt access to a specific field |
| `revoke_access(index)` | Revokes verifier access |

## Getting Started

### Prerequisites

- Rust (stable)
- Solana CLI 1.18+
- Anchor CLI 0.31+
- Node.js 18+
- Phantom or Solflare wallet (set to Devnet)

### Build & Deploy Program

```bash
git clone https://github.com/Zhekinmaksim/Inco-Encrypted-KYC-on-Solana-devnet.git
cd Inco-Encrypted-KYC-on-Solana-devnet

# Configure Solana for devnet
solana config set --url devnet
solana airdrop 5

# Build and deploy
anchor build
anchor deploy --provider.cluster devnet
```

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000, connect your wallet, and submit encrypted KYC data.

### Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import this repository
3. Set **Root Directory** to `frontend`
4. Add environment variables:
   - `NEXT_PUBLIC_KYC_PROGRAM_ID` = `2TRoeeuqTXtfv4vP5weiHRB9vyRcGsWPmJT7tiYrvQoT`
   - `NEXT_PUBLIC_SOLANA_RPC` = `https://api.devnet.solana.com`
   - `NEXT_PUBLIC_INCO_LIGHTNING_PROGRAM_ID` = `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj`
5. Deploy

## Supported Wallets

Any Solana-compatible wallet works:
- Phantom
- Solflare
- Backpack
- Brave Wallet
- Coinbase Wallet
- Ledger (via Phantom/Solflare)

## References

- [Inco dApp Quickstart](https://docs.inco.org/svm/quickstart/build-a-dapp)
- [Inco JS SDK — Encryption](https://docs.inco.org/svm/js-sdk/encryption)
- [Inco Rust Crate — Operations](https://docs.inco.org/svm/rust-sdk/operations)
- [Anchor Framework](https://www.anchor-lang.com/docs)

## License

MIT
