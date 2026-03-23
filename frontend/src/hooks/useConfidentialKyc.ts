import { useCallback, useState } from "react";
import { useWallet, useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { IDL } from "@/idl/confidential_kyc";

const INCO_LIGHTNING_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_INCO_LIGHTNING_PROGRAM_ID ||
    "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj"
);

const KYC_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_KYC_PROGRAM_ID ||
    "2TRoeeuqTXtfv4vP5weiHRB9vyRcGsWPmJT7tiYrvQoT"
);

export const KYC_FIELDS = [
  "Full Name", "Date of Birth", "Nationality",
  "Document Type", "Document Number", "Address",
] as const;

export type KYCFieldIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface SubmitResult {
  fieldIndex: number;
  handle: string;
  txSignature: string;
}

function findKycPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("kyc"), owner.toBuffer()],
    KYC_PROGRAM_ID
  );
}

function stringToBigInt(str: string): bigint {
  let hex = "";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(4, "0");
  }
  return BigInt("0x" + (hex || "0"));
}

export function useConfidentialKyc() {
  const { publicKey, sendTransaction, signMessage } = useWallet();
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProgram = useCallback(() => {
    if (!anchorWallet) throw new Error("Wallet not connected");
    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
    });
    return new Program(IDL as any, provider);
  }, [anchorWallet, connection]);

  const initializeKyc = useCallback(async (): Promise<string> => {
    if (!publicKey) throw new Error("Wallet not connected");
    setLoading(true);
    setError(null);
    try {
      const program = getProgram();
      const [kycPda] = findKycPda(publicKey);

      const sig = await program.methods
        .initializeKyc()
        .accounts({
          kycAccount: kycPda,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await connection.confirmTransaction(sig, "confirmed");
      return sig;
    } catch (e: any) {
      setError(e?.message || String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, getProgram]);

  const submitField = useCallback(
    async (fieldIndex: KYCFieldIndex, plaintext: string): Promise<SubmitResult> => {
      if (!publicKey) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        const program = getProgram();
        const [kycPda] = findKycPda(publicKey);

        let ciphertextBuffer: Buffer;
        try {
          const { encryptValue } = await import("@inco/solana-sdk");
          const bigVal = stringToBigInt(plaintext);
          const encryptedHex: string = await encryptValue(bigVal);
          ciphertextBuffer = Buffer.from(encryptedHex, "hex");
        } catch (encErr) {
          console.warn("Inco encryptValue fallback:", encErr);
          ciphertextBuffer = Buffer.from(new TextEncoder().encode(plaintext));
        }

        const sig = await program.methods
          .submitField(ciphertextBuffer, fieldIndex)
          .accounts({
            kycAccount: kycPda,
            authority: publicKey,
            incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        await connection.confirmTransaction(sig, "confirmed");

        let handle = "0";
        try {
          await new Promise((r) => setTimeout(r, 2000));
          const txDetails = await connection.getTransaction(sig, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          });
          const logs = txDetails?.meta?.logMessages || [];
          for (const log of logs) {
            const match = log.match(/encrypted handle:\s*(\d+)/i);
            if (match) { handle = match[1]; break; }
          }
        } catch {}

        return { fieldIndex, handle, txSignature: sig };
      } catch (e: any) {
        setError(e?.message || String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [publicKey, connection, getProgram]
  );

  const submitAllFields = useCallback(
    async (values: string[]): Promise<SubmitResult[]> => {
      if (values.length !== 6) throw new Error("Must provide exactly 6 field values");
      const results: SubmitResult[] = [];
      for (let i = 0; i < 6; i++) {
        const res = await submitField(i as KYCFieldIndex, values[i]);
        results.push(res);
      }
      return results;
    },
    [submitField]
  );

  const decryptField = useCallback(
    async (handle: string): Promise<string> => {
      if (!publicKey || !signMessage) throw new Error("Wallet not connected");
      try {
        const { decrypt } = await import("@inco/solana-sdk");
        const result = await (decrypt as any)([handle], {
          address: publicKey,
          signMessage,
        });
        return result.plaintexts[0] || "";
      } catch (e: any) {
        console.error("Decrypt failed:", e);
        throw e;
      }
    },
    [publicKey, signMessage]
  );

  const grantAccess = useCallback(
    async (fieldIndex: KYCFieldIndex, verifierPubkey: PublicKey): Promise<string> => {
      if (!publicKey) throw new Error("Wallet not connected");
      setLoading(true);
      setError(null);
      try {
        const program = getProgram();
        const [kycPda] = findKycPda(publicKey);

        const sig = await program.methods
          .grantAccess(fieldIndex)
          .accounts({
            kycAccount: kycPda,
            authority: publicKey,
            incoLightningProgram: INCO_LIGHTNING_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        await connection.confirmTransaction(sig, "confirmed");
        return sig;
      } catch (e: any) {
        setError(e?.message || String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [publicKey, connection, getProgram]
  );

  return {
    initializeKyc,
    submitField,
    submitAllFields,
    decryptField,
    grantAccess,
    loading,
    error,
    kycPda: publicKey ? findKycPda(publicKey)[0] : null,
  };
}
