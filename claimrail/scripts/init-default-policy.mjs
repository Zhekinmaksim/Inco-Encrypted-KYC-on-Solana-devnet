import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey, SystemProgram } = require("@solana/web3.js");

import claimrailIdl from "../target/idl/claimrail.json" with { type: "json" };

function expandHome(path) {
  if (!path?.startsWith("~/")) return path;
  return `${homedir()}/${path.slice(2)}`;
}

const rpcEndpoint =
  process.env.ANCHOR_PROVIDER_URL ||
  "https://solana-devnet.g.alchemy.com/v2/851QKm3bSpBZC244isPIt";
const wsEndpoint =
  process.env.ANCHOR_WS_URL ||
  process.env.ANCHOR_WSS_URL ||
  "wss://devnet.helius-rpc.com/?api-key=ef4357ea-7506-4f1a-8dbd-c04eda37d20e";
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

const program = new anchor.Program(claimrailIdl, provider);
const issuer = wallet.publicKey;
const [policyAccount] = PublicKey.findProgramAddressSync(
  [Buffer.from("policy"), issuer.toBuffer()],
  program.programId
);

const existing = await program.account.policyAccount.fetchNullable(policyAccount);

if (existing) {
  console.log(JSON.stringify({
    status: "exists",
    issuer: issuer.toBase58(),
    policyAccount: policyAccount.toBase58(),
  }, null, 2));
  process.exit(0);
}

const signature = await program.methods
  .initializePolicy({
    allowedJurisdictions: ["DE", "FR", "NL", "SG", "CH", "GB", "IE", "LU"],
    requiresAccreditation: true,
    maxAllocationTierA: new anchor.BN("500000"),
    maxAllocationTierB: new anchor.BN("100000"),
    maxAllocationTierC: new anchor.BN("25000"),
    manualReviewOnPep: true,
    manualReviewOnSanctions: true,
  })
  .accountsPartial({
    policyAccount,
    issuer,
    systemProgram: SystemProgram.programId,
  })
  .rpc({ commitment: "confirmed" });

console.log(JSON.stringify({
  status: "initialized",
  issuer: issuer.toBase58(),
  policyAccount: policyAccount.toBase58(),
  signature,
}, null, 2));
