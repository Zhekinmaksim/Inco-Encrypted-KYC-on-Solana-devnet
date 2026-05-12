import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { randomBytes } from "crypto";
import {
  awaitComputationFinalization,
  getClusterAccAddress,
  getComputationAccAddress,
  getExecutingPoolAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
} from "@arcium-hq/client";

// This test file is a scaffold for the Arcium-native migration.
// It is expected to be finalized once the real generated program client,
// encrypted-input packers, and computation definition helpers are available.

describe("claimrail", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.Claimrail as Program;
  const clusterOffset = Number(process.env.ARCIUM_CLUSTER_OFFSET || 456);

  it("queues a private eligibility computation", async () => {
    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    // Placeholder encrypted bytes for the first pass of the migration.
    const encrypted = new Uint8Array(32);

    const queueSig = await program.methods
      .computeEligibility(
        computationOffset,
        Array.from(encrypted),
        Array.from(encrypted),
        Array.from(encrypted),
        Array.from(encrypted),
        Array.from(encrypted),
        Array.from(encrypted),
        Array.from(encrypted),
        new anchor.BN(1)
      )
      .accountsPartial({
        computationAccount: getComputationAccAddress(clusterOffset, computationOffset),
        clusterAccount: getClusterAccAddress(clusterOffset),
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(clusterOffset),
        executingPool: getExecutingPoolAccAddress(clusterOffset),
      })
      .rpc();

    const finalizeSig = await awaitComputationFinalization(
      provider,
      computationOffset,
      program.programId,
      "confirmed"
    );

    console.log("queue sig", queueSig);
    console.log("finalize sig", finalizeSig);
  });
});
