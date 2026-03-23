#!/usr/bin/env node
/**
 * Sync IDL from Anchor build output to frontend.
 * Run: node scripts/sync-idl.js
 */
const fs = require("fs");
const path = require("path");

const IDL_SRC = path.resolve(__dirname, "../programs/confidential-kyc/target/idl/confidential_kyc.json");
const IDL_DEST = path.resolve(__dirname, "../frontend/src/idl/confidential_kyc.ts");

if (!fs.existsSync(IDL_SRC)) {
  console.error("IDL not found at", IDL_SRC);
  console.error("Run `anchor build` first.");
  process.exit(1);
}

const idl = JSON.parse(fs.readFileSync(IDL_SRC, "utf-8"));
const content = `// Auto-generated — do not edit manually\nexport const IDL = ${JSON.stringify(idl, null, 2)} as const;\nexport type ConfidentialKyc = typeof IDL;\n`;

fs.writeFileSync(IDL_DEST, content);
console.log("✅ IDL synced to", IDL_DEST);

// Also update program ID in .env.local if available
const KEYS_PATH = path.resolve(__dirname, "../programs/confidential-kyc/target/deploy/confidential_kyc-keypair.json");
if (fs.existsSync(KEYS_PATH)) {
  try {
    const { Keypair } = require("@solana/web3.js");
    const kp = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(KEYS_PATH, "utf-8"))));
    const programId = kp.publicKey.toBase58();
    const envPath = path.resolve(__dirname, "../frontend/.env.local");
    let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
    env = env.replace(/NEXT_PUBLIC_KYC_PROGRAM_ID=.*/, `NEXT_PUBLIC_KYC_PROGRAM_ID=${programId}`);
    fs.writeFileSync(envPath, env);
    console.log("✅ Program ID updated:", programId);
  } catch (e) {
    console.warn("Could not update program ID:", e.message);
  }
}
