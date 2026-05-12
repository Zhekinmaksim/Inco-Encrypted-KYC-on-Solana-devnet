import { useCallback, useState } from "react";
import { Buffer } from "buffer";
import * as anchor from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  RescueCipher,
  awaitComputationFinalization,
  deserializeLE,
  getArciumProgramId,
  getClockAccAddress,
  getClusterAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getComputationAccAddress,
  getExecutingPoolAccAddress,
  getFeePoolAccAddress,
  getMXEAccAddress,
  getMXEPublicKey,
  getMempoolAccAddress,
  serializeLE,
  x25519,
} from "@arcium-hq/client";
import claimrailIdl from "../../../target/idl/claimrail.json";
import { useWalletSession } from "@/contexts/WalletProvider";
import {
  CLAIMRAIL_PROGRAM_ID,
  DEFAULT_POLICY_ISSUER,
  KYC_FIELDS,
  type KYCFieldIndex,
  type KycDossier,
  type EligibilityOutput,
  type VerifierPermission,
  deriveDossierPda,
  deriveEligibilityPda,
  deriveEligibilityOutput,
  derivePermissionPda,
  derivePolicyPda,
} from "@/lib/claimrailView";

const STORAGE_PREFIX = "claimrail::live-session::";
const VISIBLE_FIELD_COUNT = 6;
const DEFAULT_CLUSTER_OFFSET = Number(process.env.NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET || 456);
const COMP_DEF_OFFSET = Buffer.from(getCompDefAccOffset("compute_eligibility_clean")).readUInt32LE(0);
const DEFAULT_POLICY_ACCOUNT = derivePolicyPda(DEFAULT_POLICY_ISSUER);
const DEVNET_AIRDROP_ENDPOINT = "https://api.devnet.solana.com";
const MIN_INIT_BALANCE_LAMPORTS = Math.floor(0.02 * LAMPORTS_PER_SOL);
const AIRDROP_LAMPORTS = Math.floor(0.1 * LAMPORTS_PER_SOL);

export { KYC_FIELDS };
export type { KycDossier };

export interface SubmitResult {
  fieldIndex: number;
  handle: string;
  txSignature: string;
  computeTxSignature?: string;
  finalizeTxSignature?: string;
}

type StoredField = {
  handle: string;
  plaintext: string;
};

type StoredEligibility = {
  cipherKeyHex: string;
  computedAt: number | null;
  decryptedOutcome?: {
    eligible: boolean;
    riskTier: number;
    maxAllocation: number;
    manualReview: boolean;
    requiredRevealMask: number;
  };
};

type StoredSession = {
  owner: string;
  policyPda: string;
  kycPda: string;
  submittedAt: number | null;
  fields: StoredField[];
  eligibility?: StoredEligibility;
};

type AnchorWalletLike = {
  publicKey: PublicKey;
  signTransaction: <T>(tx: T) => Promise<T>;
  signAllTransactions: <T>(txs: T[]) => Promise<T[]>;
};

const READONLY_WALLET: AnchorWalletLike = {
  publicKey: PublicKey.default,
  signTransaction: async () => {
    throw new Error("Read-only provider cannot sign transactions");
  },
  signAllTransactions: async () => {
    throw new Error("Read-only provider cannot sign transactions");
  },
};

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getStorageKey(owner: string) {
  return `${STORAGE_PREFIX}${owner}`;
}

function bytesToHex(bytes: Uint8Array | number[]) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string) {
  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function isZeroChunk(chunk: number[] | Uint8Array) {
  return Array.from(chunk).every((byte) => byte === 0);
}

function safeNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value?.toString?.() ?? value);
  return Number.isFinite(parsed) ? parsed : null;
}

function loadStoredSession(owner: string): StoredSession | null {
  if (!hasStorage()) return null;
  const raw = window.localStorage.getItem(getStorageKey(owner));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredSession;
    return {
      owner,
      policyPda: parsed.policyPda,
      kycPda: parsed.kycPda,
      submittedAt: parsed.submittedAt ?? null,
      fields: Array.from({ length: VISIBLE_FIELD_COUNT }, (_, index) => ({
        handle: parsed.fields?.[index]?.handle || "",
        plaintext: parsed.fields?.[index]?.plaintext || "",
      })),
      eligibility: parsed.eligibility,
    };
  } catch {
    return null;
  }
}

function saveStoredSession(owner: string, session: StoredSession) {
  if (!hasStorage()) return;
  window.localStorage.setItem(getStorageKey(owner), JSON.stringify(session));
}

function buildStoredFields(
  values: string[],
  encryptedInputs: Array<number[] | Uint8Array>
): StoredField[] {
  return Array.from({ length: VISIBLE_FIELD_COUNT }, (_, index) => ({
    handle: bytesToHex(encryptedInputs[index]),
    plaintext: values[index] || "",
  }));
}

function netWorthBandToTier(value: string) {
  switch (value) {
    case "10M+":
      return 4n;
    case "1M-10M":
      return 3n;
    case "100k-1M":
      return 2n;
    default:
      return 1n;
  }
}

function createProvider(connection: any, wallet: AnchorWalletLike | null) {
  return new anchor.AnchorProvider(connection, (wallet || READONLY_WALLET) as any, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
}

function createProgram(connection: any, wallet: AnchorWalletLike | null) {
  const provider = createProvider(connection, wallet);
  return {
    provider,
    program: new anchor.Program(claimrailIdl as anchor.Idl, provider),
  };
}

function formatSolAmount(lamports: number) {
  return `${(lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`;
}

function normalizeClientError(error: any) {
  const message = error?.message || String(error);

  if (message.includes("Attempt to debit an account but found no record of a prior credit")) {
    return "This wallet has no SOL on devnet yet. Use Request devnet SOL, then retry Initialize vault.";
  }

  if (
    message.includes("reached your airdrop limit today") ||
    message.includes("airdrop faucet has run dry") ||
    message.includes("code: 429") ||
    message.includes('"code": 429')
  ) {
    return "Devnet faucet is rate-limited or temporarily dry. Open faucet.solana.com or send test SOL from another devnet wallet, then retry Initialize vault.";
  }

  if (message.includes("Internal error")) {
    return "Devnet faucet returned an internal error. Retry once, then use faucet.solana.com or send test SOL from another devnet wallet.";
  }

  return message;
}

function normalizeDossierFromAccount(owner: PublicKey, publicKey: PublicKey, account: any): KycDossier {
  const fields = Array.from({ length: VISIBLE_FIELD_COUNT }, (_, index) => {
    const handleChunk = account.encryptedInputs?.[index] || new Uint8Array(32);
    const submitted = !isZeroChunk(handleChunk);
    return {
      index: index as KYCFieldIndex,
      label: KYC_FIELDS[index],
      handle: submitted ? bytesToHex(handleChunk) : "",
      submitted,
    };
  });

  return {
    owner: owner.toBase58(),
    kycPda: publicKey.toBase58(),
    policyPda: account.policy.toBase58(),
    fieldCount: fields.filter((field) => field.submitted).length,
    submittedAt: safeNumber(account.submittedAt),
    fields,
  };
}

function deriveEligibilityFromCache(account: any, stored: StoredEligibility): EligibilityOutput {
  let values = stored.decryptedOutcome;

  if (!values) {
    const cipher = new RescueCipher(hexToBytes(stored.cipherKeyHex));
    const decrypted = cipher.decrypt(
      account.encryptedOutcome.map((chunk: Uint8Array) => Array.from(chunk)),
      serializeLE(BigInt(account.outcomeNonce.toString()), 16)
    );
    values = {
      eligible: decrypted[0] === 1n,
      riskTier: Number(decrypted[1]),
      maxAllocation: Number(decrypted[2]),
      manualReview: decrypted[3] === 1n,
      requiredRevealMask: Number(decrypted[4]),
    };
  }

  return deriveEligibilityOutput(
    values,
    safeNumber(account.computedAt),
    true
  );
}

async function fetchApplicantDossier(program: anchor.Program, owner: PublicKey) {
  const matches = await program.account.applicantDossier.all([
    {
      memcmp: {
        offset: 8,
        bytes: owner.toBase58(),
      },
    },
  ]);

  if (matches.length === 0) return null;

  const defaultMatch =
    matches.find((entry: any) => entry.account.policy.toBase58() === DEFAULT_POLICY_ACCOUNT.toBase58()) ||
    matches[0];

  return normalizeDossierFromAccount(owner, defaultMatch.publicKey, defaultMatch.account);
}

export function useConfidentialKyc() {
  const { publicKey, connection, anchorWallet } = useWalletSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKycRecord = useCallback(
    async (ownerInput: string | PublicKey): Promise<KycDossier | null> => {
      const owner = typeof ownerInput === "string" ? new PublicKey(ownerInput) : ownerInput;
      const { program } = createProgram(connection, anchorWallet);
      return fetchApplicantDossier(program, owner);
    },
    [anchorWallet, connection]
  );

  const loadEligibility = useCallback(
    async (ownerInput: string | PublicKey): Promise<EligibilityOutput | null> => {
      const owner = typeof ownerInput === "string" ? new PublicKey(ownerInput) : ownerInput;
      const { program } = createProgram(connection, anchorWallet);
      const dossier = await fetchApplicantDossier(program, owner);
      if (!dossier) return null;

      const eligibilityAccount = deriveEligibilityPda(new PublicKey(dossier.kycPda));
      const account = await program.account.eligibilityResultAccount.fetchNullable(eligibilityAccount);
      if (!account) return null;

      const stored = loadStoredSession(owner.toBase58());
      if (stored?.eligibility) {
        return deriveEligibilityFromCache(account, stored.eligibility);
      }

      return {
        availableOnChain: true,
        eligible: false,
        riskTier: "REJECT",
        maxAllocation: 0,
        manualReview: false,
        rejectionReason: "Eligibility result is encrypted to the compute session.",
        requiredRevealFields: [],
        requiredRevealMask: 0,
        computedAt: safeNumber(account.computedAt),
        decryptable: false,
      };
    },
    [anchorWallet, connection]
  );

  const loadVerifierPermissions = useCallback(
    async (ownerInput: string | PublicKey): Promise<VerifierPermission[]> => {
      const owner = typeof ownerInput === "string" ? new PublicKey(ownerInput) : ownerInput;
      const { program } = createProgram(connection, anchorWallet);
      const entries = await program.account.revealPermissionAccount.all([
        {
          memcmp: {
            offset: 8,
            bytes: owner.toBase58(),
          },
        },
      ]);

      return entries.map((entry: any) => ({
        wallet: entry.account.verifier.toBase58(),
        fieldIndexes: Array.from({ length: VISIBLE_FIELD_COUNT }, (_, index) => index).filter(
          (index) => (Number(entry.account.allowedMask) & (1 << index)) !== 0
        ),
        updatedAt: safeNumber(entry.account.updatedAt) || Date.now(),
      }));
    },
    [anchorWallet, connection]
  );

  const initializeKyc = useCallback(async (): Promise<string> => {
    if (!publicKey || !anchorWallet) throw new Error("Wallet not connected");
    setLoading(true);
    setError(null);

    try {
      const balanceLamports = await connection.getBalance(publicKey, "confirmed");
      if (balanceLamports === 0) {
        throw new Error("This wallet has 0 SOL on devnet. Use Request devnet SOL, then retry Initialize vault.");
      }
      if (balanceLamports < MIN_INIT_BALANCE_LAMPORTS) {
        throw new Error(
          `This wallet only has ${formatSolAmount(balanceLamports)}. Claimrail needs roughly 0.02 SOL on devnet to initialize the applicant dossier.`
        );
      }

      const { program } = createProgram(connection, anchorWallet);
      const policyAccount = await program.account.policyAccount.fetchNullable(DEFAULT_POLICY_ACCOUNT);
      if (!policyAccount) {
        throw new Error("Default Atlas issuer policy is not initialized on devnet yet.");
      }

      const dossierAccount = deriveDossierPda(publicKey, DEFAULT_POLICY_ACCOUNT);
      const existing = await program.account.applicantDossier.fetchNullable(dossierAccount);
      if (existing) {
        const stored = loadStoredSession(publicKey.toBase58());
        if (!stored) {
          saveStoredSession(publicKey.toBase58(), {
            owner: publicKey.toBase58(),
            policyPda: DEFAULT_POLICY_ACCOUNT.toBase58(),
            kycPda: dossierAccount.toBase58(),
            submittedAt: safeNumber(existing.submittedAt),
            fields: Array.from({ length: VISIBLE_FIELD_COUNT }, () => ({ handle: "", plaintext: "" })),
          });
        }
        return "already_initialized";
      }

      const signature = await program.methods
        .initializeDossier()
        .accountsPartial({
          applicant: publicKey,
          policyAccount: DEFAULT_POLICY_ACCOUNT,
          dossierAccount,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });

      saveStoredSession(publicKey.toBase58(), {
        owner: publicKey.toBase58(),
        policyPda: DEFAULT_POLICY_ACCOUNT.toBase58(),
        kycPda: dossierAccount.toBase58(),
        submittedAt: null,
        fields: Array.from({ length: VISIBLE_FIELD_COUNT }, () => ({ handle: "", plaintext: "" })),
      });

      return signature;
    } catch (err: any) {
      const normalizedMessage = normalizeClientError(err);
      setError(normalizedMessage);
      throw new Error(normalizedMessage);
    } finally {
      setLoading(false);
    }
  }, [anchorWallet, connection, publicKey]);

  const getWalletBalance = useCallback(async (): Promise<number | null> => {
    if (!publicKey) return null;
    return connection.getBalance(publicKey, "confirmed");
  }, [connection, publicKey]);

  const requestDevnetAirdrop = useCallback(async (): Promise<string> => {
    if (!publicKey) throw new Error("Wallet not connected");

    setLoading(true);
    setError(null);

    try {
      const lamports = AIRDROP_LAMPORTS;

      try {
        const signature = await connection.requestAirdrop(publicKey, lamports);
        await connection.confirmTransaction(signature, "confirmed");
        return signature;
      } catch {
        const fallbackConnection = new anchor.web3.Connection(DEVNET_AIRDROP_ENDPOINT, "confirmed");
        const signature = await fallbackConnection.requestAirdrop(publicKey, lamports);
        await fallbackConnection.confirmTransaction(signature, "confirmed");
        return signature;
      }
    } catch (err: any) {
      const normalizedMessage = normalizeClientError(err);
      setError(normalizedMessage);
      throw new Error(normalizedMessage);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  const submitAllFields = useCallback(
    async (values: string[]): Promise<{ results: SubmitResult[]; eligibility: EligibilityOutput | null }> => {
      if (!publicKey || !anchorWallet) throw new Error("Wallet not connected");
      if (values.length !== VISIBLE_FIELD_COUNT) {
        throw new Error("Expected exactly 6 visible applicant fields.");
      }

      setLoading(true);
      setError(null);

      try {
        const { provider, program } = createProgram(connection, anchorWallet);
        const policyAccount = await program.account.policyAccount.fetchNullable(DEFAULT_POLICY_ACCOUNT);
        if (!policyAccount) {
          throw new Error("Default Atlas issuer policy is not initialized on devnet yet.");
        }

        const dossierAccount = deriveDossierPda(publicKey, DEFAULT_POLICY_ACCOUNT);
        const existingDossier = await program.account.applicantDossier.fetchNullable(dossierAccount);
        if (!existingDossier) {
          await program.methods
            .initializeDossier()
            .accountsPartial({
              applicant: publicKey,
              policyAccount: DEFAULT_POLICY_ACCOUNT,
              dossierAccount,
              systemProgram: SystemProgram.programId,
            })
            .rpc({ commitment: "confirmed" });
        }

        const eligibilityAccount = deriveEligibilityPda(dossierAccount);
        const existingEligibility = await program.account.eligibilityResultAccount.fetchNullable(
          eligibilityAccount
        );
        if (existingEligibility?.computedAt && Number(existingEligibility.computedAt) > 0) {
          throw new Error("This applicant already has a finalized eligibility result. Use a fresh wallet for a new live demo run.");
        }

        const mxePublicKey = await getMXEPublicKey(provider, CLAIMRAIL_PROGRAM_ID);
        if (!mxePublicKey) {
          throw new Error("Arcium MXE public key is not available yet.");
        }

        const privateKey = x25519.utils.randomSecretKey();
        const appPubkey = x25519.getPublicKey(privateKey);
        const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
        const cipher = new RescueCipher(sharedSecret);
        const nonceBytes = randomBytes(16);
        const nonce = deserializeLE(nonceBytes);

        const allowedJurisdictions = Array.from(policyAccount.allowedJurisdictions || []);
        const requestedAllocation = Math.max(0, Number.parseInt(values[5], 10) || 0);
        const plaintextProfile = [
          allowedJurisdictions.includes(values[0]) ? 1n : 0n,
          values[1] === "true" ? 1n : 0n,
          netWorthBandToTier(values[2]),
          BigInt(requestedAllocation),
          values[3] === "none" ? 0n : 1n,
          values[4] === "true" ? 1n : 0n,
          1n,
          0n,
        ];

        const encryptedInputs = cipher.encrypt(plaintextProfile, nonceBytes);

        const submitTxSignature = await program.methods
          .submitEncryptedProfile(encryptedInputs)
          .accountsPartial({
            applicant: publicKey,
            dossierAccount,
            policyAccount: DEFAULT_POLICY_ACCOUNT,
          })
          .rpc({ commitment: "confirmed" });

        const computationOffset = new anchor.BN(deserializeLE(randomBytes(8)).toString());
        const mxeAccount = getMXEAccAddress(CLAIMRAIL_PROGRAM_ID);
        const computeTxSignature = await program.methods
          .computeEligibility(
            computationOffset,
            encryptedInputs[0],
            encryptedInputs[1],
            encryptedInputs[2],
            encryptedInputs[4],
            encryptedInputs[5],
            encryptedInputs[3],
            Array.from(appPubkey),
            new anchor.BN(nonce.toString())
          )
          .accountsPartial({
            payer: publicKey,
            mxeAccount,
            mempoolAccount: getMempoolAccAddress(DEFAULT_CLUSTER_OFFSET),
            executingPool: getExecutingPoolAccAddress(DEFAULT_CLUSTER_OFFSET),
            computationAccount: getComputationAccAddress(DEFAULT_CLUSTER_OFFSET, computationOffset),
            compDefAccount: getCompDefAccAddress(CLAIMRAIL_PROGRAM_ID, COMP_DEF_OFFSET),
            clusterAccount: getClusterAccAddress(DEFAULT_CLUSTER_OFFSET),
            poolAccount: getFeePoolAccAddress(),
            clockAccount: getClockAccAddress(),
            dossierAccount,
            eligibilityAccount,
            systemProgram: SystemProgram.programId,
            arciumProgram: getArciumProgramId(),
          })
          .rpc({ commitment: "confirmed" });

        const finalizeTxSignature = await awaitComputationFinalization(
          provider,
          computationOffset,
          CLAIMRAIL_PROGRAM_ID,
          "confirmed",
          300_000
        );

        const eligibilityAccountState = await program.account.eligibilityResultAccount.fetch(eligibilityAccount);
        const decrypted = cipher.decrypt(
          eligibilityAccountState.encryptedOutcome.map((chunk: Uint8Array) => Array.from(chunk)),
          serializeLE(BigInt(eligibilityAccountState.outcomeNonce.toString()), 16)
        );

        const storedSession: StoredSession = {
          owner: publicKey.toBase58(),
          policyPda: DEFAULT_POLICY_ACCOUNT.toBase58(),
          kycPda: dossierAccount.toBase58(),
          submittedAt: Date.now(),
          fields: buildStoredFields(values, encryptedInputs),
          eligibility: {
            cipherKeyHex: bytesToHex(sharedSecret),
            computedAt: safeNumber(eligibilityAccountState.computedAt),
            decryptedOutcome: {
              eligible: decrypted[0] === 1n,
              riskTier: Number(decrypted[1]),
              maxAllocation: Number(decrypted[2]),
              manualReview: decrypted[3] === 1n,
              requiredRevealMask: Number(decrypted[4]),
            },
          },
        };
        saveStoredSession(publicKey.toBase58(), storedSession);

        const eligibility = deriveEligibilityOutput(
          storedSession.eligibility!.decryptedOutcome!,
          storedSession.eligibility!.computedAt,
          true
        );

        return {
          results: storedSession.fields.map((field, index) => ({
            fieldIndex: index,
            handle: field.handle,
            txSignature: submitTxSignature,
            computeTxSignature,
            finalizeTxSignature,
          })),
          eligibility,
        };
      } catch (err: any) {
        const normalizedMessage = normalizeClientError(err);
        setError(normalizedMessage);
        throw new Error(normalizedMessage);
      } finally {
        setLoading(false);
      }
    },
    [anchorWallet, connection, publicKey]
  );

  const decryptField = useCallback(async (handle: string): Promise<string> => {
    if (!hasStorage()) throw new Error("Browser storage is not available");
    const keys = Object.keys(window.localStorage).filter((key) => key.startsWith(STORAGE_PREFIX));

    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as StoredSession;
        const field = parsed.fields.find((entry) => entry.handle === handle);
        if (field) return field.plaintext;
      } catch {
        continue;
      }
    }

    throw new Error("This browser does not have the local reveal material for that claim.");
  }, []);

  const updatePermission = useCallback(
    async (action: "grant" | "revoke", fieldIndex: KYCFieldIndex, verifierPubkey: PublicKey) => {
      if (!publicKey || !anchorWallet) throw new Error("Wallet not connected");
      const { program } = createProgram(connection, anchorWallet);
      const dossier = await fetchApplicantDossier(program, publicKey);
      if (!dossier) {
        throw new Error("Applicant dossier not found.");
      }

      const dossierPubkey = new PublicKey(dossier.kycPda);
      const permissionAccount = derivePermissionPda(dossierPubkey, verifierPubkey);
      const method =
        action === "grant"
          ? program.methods.grantReveal(fieldIndex)
          : program.methods.revokeReveal(fieldIndex);

      return method
        .accountsPartial({
          applicant: publicKey,
          verifier: verifierPubkey,
          dossierAccount: dossierPubkey,
          permissionAccount,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });
    },
    [anchorWallet, connection, publicKey]
  );

  const grantAccess = useCallback(
    async (fieldIndex: KYCFieldIndex, verifierPubkey: PublicKey): Promise<string> => {
      setLoading(true);
      setError(null);
      try {
        return await updatePermission("grant", fieldIndex, verifierPubkey);
      } catch (err: any) {
        const normalizedMessage = normalizeClientError(err);
        setError(normalizedMessage);
        throw new Error(normalizedMessage);
      } finally {
        setLoading(false);
      }
    },
    [updatePermission]
  );

  const revokeAccess = useCallback(
    async (fieldIndex: KYCFieldIndex, verifierPubkey: PublicKey): Promise<string> => {
      setLoading(true);
      setError(null);
      try {
        return await updatePermission("revoke", fieldIndex, verifierPubkey);
      } catch (err: any) {
        const normalizedMessage = normalizeClientError(err);
        setError(normalizedMessage);
        throw new Error(normalizedMessage);
      } finally {
        setLoading(false);
      }
    },
    [updatePermission]
  );

  const kycPda =
    publicKey !== null ? deriveDossierPda(publicKey, DEFAULT_POLICY_ACCOUNT) : null;

  return {
    initializeKyc,
    submitAllFields,
    decryptField,
    grantAccess,
    revokeAccess,
    loadKycRecord,
    loadEligibility,
    loadVerifierPermissions,
    getWalletBalance,
    requestDevnetAirdrop,
    loading,
    error,
    kycPda,
  };
}
