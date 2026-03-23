"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import Header from "@/components/Header";
import KYCForm from "@/components/KYCForm";
import Results from "@/components/Results";
import InfoPanel from "@/components/InfoPanel";
import { useConfidentialKyc, type SubmitResult } from "@/hooks/useConfidentialKyc";
import { Shield, Loader2 } from "lucide-react";

const KYC_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_KYC_PROGRAM_ID || "2TRoeeuqTXtfv4vP5weiHRB9vyRcGsWPmJT7tiYrvQoT"
);

export default function Home() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const {
    initializeKyc,
    submitAllFields,
    decryptField,
    loading,
    error,
    kycPda,
  } = useConfidentialKyc();

  const [view, setView] = useState<"form" | "result">("form");
  const [results, setResults] = useState<SubmitResult[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [kycInitialized, setKycInitialized] = useState<boolean | null>(null);
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Check if KYC PDA exists by checking account info directly
  useEffect(() => {
    if (!connected || !publicKey) {
      setKycInitialized(null);
      return;
    }
    const checkAccount = async () => {
      try {
        const [pda] = PublicKey.findProgramAddressSync(
          [Buffer.from("kyc"), publicKey.toBuffer()],
          KYC_PROGRAM_ID
        );
        const info = await connection.getAccountInfo(pda);
        setKycInitialized(info !== null);
      } catch {
        setKycInitialized(false);
      }
    };
    checkAccount();
  }, [connected, publicKey, connection]);

  const handleInit = useCallback(async () => {
    setInitLoading(true);
    setInitError(null);
    try {
      await initializeKyc();
      setKycInitialized(true);
    } catch (e: any) {
      setInitError(e?.message || String(e));
    } finally {
      setInitLoading(false);
    }
  }, [initializeKyc]);

  const handleSubmit = useCallback(
    async (values: string[]) => {
      setIsSubmitting(true);
      setCurrentStep(0);
      try {
        const allResults = await submitAllFields(values);
        setResults(allResults);
        setCurrentStep(6);
        setView("result");
      } catch (e) {
        console.error("Submit failed:", e);
      } finally {
        setIsSubmitting(false);
        setCurrentStep(-1);
      }
    },
    [submitAllFields]
  );

  return (
    <div className="relative z-10 min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-inco-panel border border-inco-border text-xs font-body text-inco-muted mb-4">
            <Shield className="w-3.5 h-3.5 text-inco-accent" />
            Inco Lightning × Anchor × Solana Devnet
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-white mb-3 tracking-tight">
            Encrypted KYC<br />
            <span className="bg-gradient-to-r from-inco-accent to-inco-accent2 bg-clip-text text-transparent">On-Chain</span>
          </h2>
          <p className="text-sm text-inco-muted font-body max-w-lg mx-auto leading-relaxed">
            Each field is encrypted with Inco&apos;s <code className="text-inco-accent/80 text-xs">encryptValue()</code>,
            sent to an Anchor program that calls <code className="text-inco-accent2/80 text-xs">new_euint128</code> via CPI,
            and stored as an encrypted handle in your Solana PDA.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3">
            <div className="rounded-2xl bg-inco-panel border border-inco-border p-6 sm:p-8">

              {connected && kycInitialized === false && view === "form" && (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-inco-accent/30 mx-auto mb-4" />
                  <h3 className="font-display font-bold text-white text-lg mb-2">Initialize Your KYC Account</h3>
                  <p className="text-xs text-inco-muted font-body mb-6 max-w-sm mx-auto">
                    First, create your on-chain KYC PDA. This is a one-time transaction
                    that allocates storage for your encrypted identity data.
                  </p>
                  {kycPda && (
                    <p className="text-[10px] font-display text-inco-muted mb-4">
                      PDA: {kycPda.toBase58().slice(0, 8)}···{kycPda.toBase58().slice(-8)}
                    </p>
                  )}
                  <button
                    onClick={handleInit}
                    disabled={initLoading}
                    className="px-8 py-3 rounded-xl font-body font-semibold text-sm bg-gradient-to-r from-inco-accent to-emerald-400 text-inco-dark hover:shadow-[0_0_30px_rgba(0,229,160,0.3)] transition-all disabled:opacity-50"
                  >
                    {initLoading ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating PDA…</span>
                    ) : (
                      "Initialize KYC Account"
                    )}
                  </button>
                  {initError && <p className="text-xs text-inco-danger mt-3">{initError}</p>}
                </div>
              )}

              {(kycInitialized === true || kycInitialized === null) && view === "form" && (
                <div>
                  <div className="mb-5">
                    <h3 className="font-display font-bold text-white text-lg mb-0.5">Identity Verification</h3>
                    <p className="text-[11px] text-inco-muted font-body">
                      Each field → <code className="text-inco-accent/70">encryptValue()</code> → Anchor CPI → on-chain handle.
                    </p>
                  </div>
                  <KYCForm onSubmit={handleSubmit} isSubmitting={isSubmitting} currentStep={currentStep} />
                  {error && <p className="text-xs text-inco-danger mt-3">{error}</p>}
                </div>
              )}

              {view === "result" && publicKey && (
                <Results
                  results={results}
                  walletAddress={publicKey.toBase58()}
                  onBack={() => setView("form")}
                  onDecrypt={decryptField}
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-inco-panel border border-inco-border p-5 lg:sticky lg:top-24">
              <InfoPanel />
            </div>
          </div>
        </div>

        <footer className="mt-16 pb-8 text-center">
          <p className="text-[10px] font-body text-inco-muted">
            Built with{" "}
            <a href="https://docs.inco.org/svm/quickstart/build-a-dapp" target="_blank" rel="noopener noreferrer" className="text-inco-accent hover:underline">Inco Solana SDK</a>
            {" · "}Anchor{" · "}Solana Devnet
          </p>
        </footer>
      </main>
    </div>
  );
}
