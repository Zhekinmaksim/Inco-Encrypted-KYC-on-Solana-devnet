import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";

const require = createRequire(new URL("../app/package.json", import.meta.url));

const anchor = require("@coral-xyz/anchor");
const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  AddressLookupTableProgram,
  Transaction,
} = require("@solana/web3.js");
const {
  RescueCipher,
  awaitComputationFinalization,
  deserializeLE,
  getArciumProgramId,
  getClusterAccAddress,
  getClockAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getComputationAccAddress,
  getExecutingPoolAccAddress,
  getFeePoolAccAddress,
  getLookupTableAddress,
  getMXEAccAddress,
  getMXEPublicKey,
  getMempoolAccAddress,
  serializeLE,
  uploadCircuit,
  x25519,
} = require("@arcium-hq/client");

const idl = JSON.parse(await readFile(new URL("../target/idl/claimrail.json", import.meta.url), "utf8"));
const CIRCUIT_NAME = "compute_eligibility_clean";

function expandHome(path) {
  if (!path?.startsWith("~/")) {
    return path;
  }

  return `${homedir()}/${path.slice(2)}`;
}

function deriveWsEndpoint(rpcEndpoint) {
  if (!rpcEndpoint) {
    return "ws://127.0.0.1:8900";
  }

  if (rpcEndpoint.startsWith("https://")) {
    return `wss://${rpcEndpoint.slice("https://".length)}`;
  }

  if (rpcEndpoint.startsWith("http://")) {
    return `ws://${rpcEndpoint.slice("http://".length)}`;
  }

  return rpcEndpoint;
}

const rpcEndpoint = process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8899";
const wsEndpoint = process.env.ANCHOR_WS_URL || process.env.ANCHOR_WSS_URL || deriveWsEndpoint(rpcEndpoint);
const walletPath = expandHome(process.env.ANCHOR_WALLET || "~/.config/solana/id.json");
const walletSecretKey = Uint8Array.from(JSON.parse(await readFile(walletPath, "utf8")));
const wallet = new anchor.Wallet(Keypair.fromSecretKey(walletSecretKey));
const connection = new Connection(rpcEndpoint, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 120_000,
  wsEndpoint,
});
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
  preflightCommitment: "confirmed",
});

anchor.setProvider(provider);

const program = new anchor.Program(idl, provider);
const arciumProgram = new anchor.Program(require("@arcium-hq/client").ARCIUM_IDL, provider);
const programId = new PublicKey(idl.address);
const arciumProgramId = getArciumProgramId();
const mxeAccount = getMXEAccAddress(programId);
const compDefOffsetBytes = getCompDefAccOffset(CIRCUIT_NAME);
const compDefOffset = Buffer.from(compDefOffsetBytes).readUInt32LE(0);
const compDefAccount = getCompDefAccAddress(programId, compDefOffset);

function bn(value) {
  if (value instanceof anchor.BN) {
    return value;
  }

  if (typeof value === "bigint") {
    return new anchor.BN(value.toString());
  }

  if (typeof value === "number") {
    return new anchor.BN(value);
  }

  if (value?.toString) {
    return new anchor.BN(value.toString());
  }

  throw new Error(`Cannot convert value to BN: ${value}`);
}

function toBigInt(value) {
  if (typeof value === "bigint") {
    return value;
  }

  if (value instanceof anchor.BN) {
    return BigInt(value.toString());
  }

  if (typeof value === "number") {
    return BigInt(value);
  }

  if (value?.toString) {
    return BigInt(value.toString());
  }

  throw new Error(`Cannot convert value to bigint: ${value}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLocalRpc() {
  const endpoint = provider.connection.rpcEndpoint || "";
  return endpoint.includes("127.0.0.1") || endpoint.includes("localhost");
}

async function fundAccount(pubkey, sol = 0.5) {
  if (isLocalRpc()) {
    const sig = await provider.connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
    const latest = await provider.connection.getLatestBlockhash("confirmed");
    await provider.connection.confirmTransaction(
      {
        signature: sig,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      },
      "confirmed",
    );
    return;
  }

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: pubkey,
      lamports: Math.floor(sol * LAMPORTS_PER_SOL),
    }),
  );

  const sig = await provider.sendAndConfirm(transaction, [], { commitment: "confirmed" });
  await provider.connection.confirmTransaction(sig, "confirmed");
}

async function airdrop(pubkey, sol = 2) {
  const sig = await provider.connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  const latest = await provider.connection.getLatestBlockhash("confirmed");
  await provider.connection.confirmTransaction(
    {
      signature: sig,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    },
    "confirmed",
  );
}

async function getMxeStateWithRetry(retries = 30) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const mxe = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
      if (mxe.cluster !== null) {
        return mxe;
      }
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
    }

    await sleep(1000);
  }

  throw new Error("MXE account did not expose a cluster assignment in time");
}

async function getMxePublicKeyWithRetry(retries = 30) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const pubkey = await getMXEPublicKey(provider, programId);
    if (pubkey) {
      return pubkey;
    }

    await sleep(1000);
  }

  throw new Error("MXE x25519 public key did not become available in time");
}

function derivePolicyPda(issuer) {
  return PublicKey.findProgramAddressSync([Buffer.from("policy"), issuer.toBuffer()], programId)[0];
}

function deriveDossierPda(applicant, policy) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("dossier"), applicant.toBuffer(), policy.toBuffer()],
    programId,
  )[0];
}

function deriveEligibilityPda(dossier) {
  return PublicKey.findProgramAddressSync([Buffer.from("eligibility"), dossier.toBuffer()], programId)[0];
}

async function ensureCompDefInitialized(lutOffset) {
  const uploadChunkSize = isLocalRpc() ? 32 : 4;
  const existing = await provider.connection.getAccountInfo(compDefAccount, "confirmed");
  if (existing) {
    const rawCircuit = new Uint8Array(await readFile(new URL(`../build/${CIRCUIT_NAME}.arcis`, import.meta.url)));
    await uploadCircuit(provider, CIRCUIT_NAME, programId, rawCircuit, false, uploadChunkSize, { commitment: "confirmed" });
    return;
  }

  const addressLookupTable = getLookupTableAddress(programId, bn(lutOffset));

  const sig = await program.methods
    .initComputeEligibilityCompDef()
    .accountsPartial({
      payer: provider.publicKey,
      mxeAccount,
      compDefAccount,
      addressLookupTable,
      lutProgram: AddressLookupTableProgram.programId,
      arciumProgram: arciumProgramId,
      systemProgram: SystemProgram.programId,
    })
    .rpc({ commitment: "confirmed" });

  await provider.connection.confirmTransaction(sig, "confirmed");

  const rawCircuit = new Uint8Array(await readFile(new URL(`../build/${CIRCUIT_NAME}.arcis`, import.meta.url)));
  await uploadCircuit(provider, CIRCUIT_NAME, programId, rawCircuit, false, uploadChunkSize, { commitment: "confirmed" });
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Assertion failed: ${label}`);
  }
}

function isDefaultPubkey(value) {
  return value?.toBase58?.() === PublicKey.default.toBase58();
}

async function main() {
  const issuer = Keypair.generate();
  const applicant = Keypair.generate();

  await fundAccount(issuer.publicKey, isLocalRpc() ? 5 : 0.05);
  await fundAccount(applicant.publicKey, isLocalRpc() ? 5 : 0.05);

  const policyAccount = derivePolicyPda(issuer.publicKey);
  const dossierAccount = deriveDossierPda(applicant.publicKey, policyAccount);
  const eligibilityAccount = deriveEligibilityPda(dossierAccount);

  const mxe = await getMxeStateWithRetry();
  const clusterOffset = Number(process.env.ARCIUM_CLUSTER_OFFSET || mxe.cluster);

  await ensureCompDefInitialized(mxe.lutOffsetSlot);

  await program.methods
    .initializePolicy({
      allowedJurisdictions: ["DE", "FR", "NL", "SG"],
      requiresAccreditation: true,
      maxAllocationTierA: new anchor.BN("500000"),
      maxAllocationTierB: new anchor.BN("100000"),
      maxAllocationTierC: new anchor.BN("25000"),
      manualReviewOnPep: true,
      manualReviewOnSanctions: true,
    })
    .accountsPartial({
      policyAccount,
      issuer: issuer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([issuer])
    .rpc({ commitment: "confirmed" });

  await program.methods
    .initializeDossier()
    .accountsPartial({
      applicant: applicant.publicKey,
      policyAccount,
      dossierAccount,
      systemProgram: SystemProgram.programId,
    })
    .signers([applicant])
    .rpc({ commitment: "confirmed" });

  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  const mxePublicKey = await getMxePublicKeyWithRetry();
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);

  const nonceBytes = randomBytes(16);
  const nonce = deserializeLE(nonceBytes);
  const plaintextProfile = [1n, 1n, 3n, 25_000n, 0n, 0n, 1n, 0n];
  const ciphertextProfile = cipher.encrypt(plaintextProfile, nonceBytes);

  await program.methods
    .submitEncryptedProfile(ciphertextProfile)
    .accountsPartial({
      applicant: applicant.publicKey,
      dossierAccount,
      policyAccount,
    })
    .signers([applicant])
    .rpc({ commitment: "confirmed" });

  const computationOffset = new anchor.BN(deserializeLE(randomBytes(8)).toString());

  await program.methods
    .computeEligibility(
      computationOffset,
      ciphertextProfile[0],
      ciphertextProfile[1],
      ciphertextProfile[2],
      ciphertextProfile[4],
      ciphertextProfile[5],
      ciphertextProfile[3],
      Array.from(publicKey),
      new anchor.BN(nonce.toString()),
    )
    .accountsPartial({
      payer: issuer.publicKey,
      mxeAccount,
      mempoolAccount: getMempoolAccAddress(clusterOffset),
      executingPool: getExecutingPoolAccAddress(clusterOffset),
      computationAccount: getComputationAccAddress(clusterOffset, computationOffset),
      compDefAccount,
      clusterAccount: getClusterAccAddress(clusterOffset),
      poolAccount: getFeePoolAccAddress(),
      clockAccount: getClockAccAddress(),
      dossierAccount,
      eligibilityAccount,
      systemProgram: SystemProgram.programId,
      arciumProgram: arciumProgramId,
    })
    .signers([issuer])
    .rpc({ commitment: "confirmed" });

  const finalizeSig = await awaitComputationFinalization(
    provider,
    computationOffset,
    programId,
    "confirmed",
    isLocalRpc() ? 180_000 : 300_000,
  );

  const dossier = await program.account.applicantDossier.fetch(dossierAccount);
  const eligibility = await program.account.eligibilityResultAccount.fetch(eligibilityAccount);
  const computationAccount = getComputationAccAddress(clusterOffset, computationOffset);
  const finalizeTx = await provider.connection.getTransaction(finalizeSig, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (isDefaultPubkey(eligibility.applicant) || Number(eligibility.computedAt) === 0) {
    const recentCompSigs = await provider.connection.getSignaturesForAddress(
      computationAccount,
      { limit: 5 },
      "confirmed",
    );
    const recentCompTxs = [];

    for (const sigInfo of recentCompSigs) {
      const tx = await provider.connection.getTransaction(sigInfo.signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      recentCompTxs.push({
        signature: sigInfo.signature,
        err: sigInfo.err,
        logs: tx?.meta?.logMessages || [],
      });
    }

    throw new Error(
      [
        "Eligibility callback did not populate the result account as expected.",
        `computedAt=${eligibility.computedAt.toString()}`,
        `eligibilityApplicant=${eligibility.applicant.toBase58()}`,
        `eligibilityPolicy=${eligibility.policy.toBase58()}`,
        `dossierApplicant=${dossier.applicant.toBase58()}`,
        `dossierPolicy=${dossier.policy.toBase58()}`,
        `finalizeTx=${finalizeSig}`,
        `finalizeLogs=${JSON.stringify(finalizeTx?.meta?.logMessages || [])}`,
        `recentComputationTxs=${JSON.stringify(recentCompTxs)}`,
      ].join("\n"),
    );
  }

  const decryptedOutcome = cipher.decrypt(
    eligibility.encryptedOutcome.map((chunk) => Array.from(chunk)),
    serializeLE(toBigInt(eligibility.outcomeNonce), 16),
  );

  assertEqual(dossier.fieldCount, 8, "dossier.fieldCount");
  assert(Number(eligibility.computedAt) > 0, "eligibility.computedAt > 0");
  assertEqual(eligibility.applicant.toBase58(), applicant.publicKey.toBase58(), "eligibility.applicant");
  assertEqual(eligibility.policy.toBase58(), policyAccount.toBase58(), "eligibility.policy");
  assertEqual(decryptedOutcome[0] === 1n, true, "outcome.eligible");
  assertEqual(Number(decryptedOutcome[1]), 1, "outcome.riskTier");
  assertEqual(Number(decryptedOutcome[2]), 500000, "outcome.maxAllocation");
  assertEqual(decryptedOutcome[3] === 1n, false, "outcome.manualReview");
  assertEqual(Number(decryptedOutcome[4]), 3, "outcome.requiredRevealMask");

  console.log("Claimrail Arcium e2e test passed");
  console.log(`Computation finalized in transaction ${finalizeSig}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
