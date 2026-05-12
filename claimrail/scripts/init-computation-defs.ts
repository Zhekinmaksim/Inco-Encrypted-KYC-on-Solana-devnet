import * as anchor from "@coral-xyz/anchor";

// This script is intentionally lightweight. Once the Arcium toolchain is
// installed and the Anchor/Arcium client is generated for Claimrail, wire the
// actual helper that initializes:
//   - init_compute_eligibility_comp_def
// and any additional confidential instructions you add later.

async function main() {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = (anchor.workspace as any).Claimrail;

  if (!program) {
    throw new Error("Claimrail program client not found. Run this after generating the Arcium workspace artifacts.");
  }

  console.log("Initializing compute_eligibility computation definition...");
  const sig = await program.methods.initComputeEligibilityCompDef().rpc();
  await provider.connection.confirmTransaction(sig, "confirmed");
  console.log("Initialized with signature:", sig);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
