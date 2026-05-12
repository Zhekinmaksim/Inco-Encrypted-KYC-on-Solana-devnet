"use client";
import React, { useState, useCallback, useEffect } from "react";
import AccessPolicyPanel from "@/components/AccessPolicyPanel";
import IssuerConsole from "@/components/IssuerConsole";
import KYCForm from "@/components/KYCForm";
import Results from "@/components/Results";
import VerifierConsole from "@/components/VerifierConsole";
import OnboardingProgress, { type ProgressStep } from "@/components/OnboardingProgress";
import Header from "@/components/Header";
import IssuerContextBar from "@/components/IssuerContextBar";
import { useConfidentialKyc, type KycDossier, type SubmitResult } from "@/hooks/useConfidentialKyc";
import { PERSONAS, type PersonaKey } from "@/lib/eligibilityEngine";
import type { EligibilityOutput, VerificationStatus, VerifierPermission } from "@/lib/claimrailView";
import { deriveVerificationStatus } from "@/lib/claimrailView";
import { ArrowRight, Loader2 } from "lucide-react";
import { useWalletSession } from "@/contexts/WalletProvider";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const EMPTY = Array(6).fill(false);
type Desk = "applicant" | "issuer" | "verifier";

function deriveStep({ connected, init, hasFields, hasPolicy }: { connected: boolean; init: boolean | null; hasFields: boolean; hasPolicy: boolean }): ProgressStep {
  if (!connected) return "connect";
  if (!init) return "init";
  if (!hasFields) return "submit";
  if (hasPolicy) return "done";
  return "policy";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatSolBalance(lamports: number | null) {
  if (lamports === null) return "loading";
  return `${(lamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`;
}

export default function Home() {
  const {
    connected,
    connectWallet,
    identityLabel,
    loginWithEmail,
    publicKey,
    requiresPrivySetup,
    walletAddress,
    walletLabel,
  } = useWalletSession();
  const {
    initializeKyc,
    submitAllFields,
    decryptField,
    grantAccess,
    revokeAccess,
    loadKycRecord,
    loadEligibility,
    loadVerifierPermissions,
    getWalletBalance,
    error,
    kycPda,
  } = useConfidentialKyc();

  const [desk, setDesk]             = useState<Desk>("applicant");
  const [view, setView]             = useState<"form"|"result">("form");
  const [results, setResults]       = useState<SubmitResult[]>([]);
  const [eligibility, setEligib]    = useState<EligibilityOutput | null>(null);
  const [step, setStep]             = useState(-1);
  const [submitting, setSubmitting] = useState(false);
  const [initDone, setInitDone]     = useState<boolean|null>(null);
  const [initLoading, setInitLoad]  = useState(false);
  const [initErr, setInitErr]       = useState<string|null>(null);
  const [balanceLamports, setBalanceLamports] = useState<number | null>(null);
  const [persona, setPersona]       = useState<PersonaKey | null>(null);

  const [ownerDossier, setOD]  = useState<KycDossier | null>(null);
  const [ownerVS, setOVS]      = useState<VerificationStatus|null>(null);
  const [ownerVP, setOVP]      = useState<VerifierPermission[]>([]);

  const [pFeedback, setPFB]    = useState<{type:"success"|"error"|"info";text:string}|null>(null);
  const [pBusy, setPBusy]      = useState<"grant"|"revoke"|null>(null);
  const [vAddr, setVAddr]      = useState("");
  const [vAddrErr, setVAErr]   = useState<string|null>(null);
  const [sel, setSel]          = useState<boolean[]>(EMPTY);

  const [iAddr, setIAddr]      = useState("");
  const [iLoad, setILoad]      = useState(false);
  const [iErr, setIErr]        = useState<string|null>(null);
  const [iDossier, setID]      = useState<KycDossier | null>(null);
  const [iVS, setIVS]          = useState<VerificationStatus|null>(null);
  const [iVP, setIVP]          = useState<VerifierPermission[]>([]);
  const [iElig, setIElig]      = useState<EligibilityOutput | null>(null);

  const [vfAddr, setVFAddr]    = useState("");
  const [vfLoad, setVFLoad]    = useState(false);
  const [vfErr, setVFErr]      = useState<string|null>(null);
  const [vfDossier, setVFD]    = useState<KycDossier | null>(null);
  const [vfVS, setVFVS]        = useState<VerificationStatus|null>(null);
  const [vfVP, setVFVP]        = useState<VerifierPermission[]>([]);
  const [reveals, setReveals]  = useState<Record<number,{status:"idle"|"loading"|"success"|"error";value?:string}>>({});

  const hasFields = ownerDossier?.fields?.some((f) => f.submitted) ?? false;
  const hasPolicy = ownerVP.length > 0;
  const progress  = deriveStep({ connected, init: initDone, hasFields, hasPolicy });

  const loadApplicantSnapshot = useCallback(async (applicantInput: string | PublicKey) => {
    const dossier = await loadKycRecord(applicantInput);
    if (!dossier) {
      return {
        dossier: null,
        eligibility: null,
        permissions: [] as VerifierPermission[],
        verificationStatus: null as VerificationStatus | null,
      };
    }

    const [eligibilityRecord, permissions] = await Promise.all([
      loadEligibility(applicantInput),
      loadVerifierPermissions(applicantInput),
    ]);

    return {
      dossier,
      eligibility: eligibilityRecord,
      permissions,
      verificationStatus: deriveVerificationStatus(dossier.owner, dossier, eligibilityRecord),
    };
  }, [loadEligibility, loadKycRecord, loadVerifierPermissions]);

  const refreshOwner = useCallback(async () => {
    if (!publicKey) { setOD(null); setOVS(null); setOVP([]); return; }
    try {
      const snapshot = await loadApplicantSnapshot(publicKey);
      setOD(snapshot.dossier);
      setOVS(snapshot.verificationStatus);
      setOVP(snapshot.permissions);
      if (snapshot.eligibility) {
        setEligib(snapshot.eligibility);
      }
    } catch {
      setOD(null); setOVS(null); setOVP([]);
    }
  }, [loadApplicantSnapshot, publicKey]);

  useEffect(() => {
    if (!connected || !publicKey) { setInitDone(null); setOD(null); setOVS(null); setOVP([]); return; }
    (async () => {
      try {
        const snapshot = await loadApplicantSnapshot(publicKey);
        setInitDone(snapshot.dossier !== null);
        setOD(snapshot.dossier);
        setOVS(snapshot.verificationStatus);
        setOVP(snapshot.permissions);
        if (snapshot.eligibility) {
          setEligib(snapshot.eligibility);
        }
      } catch {
        setInitDone(false);
      }
    })();
  }, [connected, loadApplicantSnapshot, publicKey]);

  useEffect(() => {
    if (!connected || !publicKey) {
      setBalanceLamports(null);
      return;
    }

    (async () => {
      try {
        setBalanceLamports(await getWalletBalance());
      } catch {
        setBalanceLamports(null);
      }
    })();
  }, [connected, getWalletBalance, publicKey]);

  const handleInit = useCallback(async () => {
    setInitLoad(true); setInitErr(null);
    try {
      await initializeKyc();
      setInitDone(true);
      setBalanceLamports(await getWalletBalance());
      await refreshOwner();
    }
    catch (e: any) { setInitErr(e?.message || String(e)); }
    finally { setInitLoad(false); }
  }, [getWalletBalance, initializeKyc, refreshOwner]);

  const handleSubmit = useCallback(async (values: string[]) => {
    if (!connected) return;
    setSubmitting(true);
    try {
      for (let i = 0; i < values.length; i += 1) {
        setStep(i);
        await sleep(120);
      }
      const submission = await submitAllFields(values);
      setResults(submission.results);
      setStep(6);
      setEligib(submission.eligibility);
      setView("result");
      await refreshOwner();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); setStep(-1); }
  }, [connected, refreshOwner, submitAllFields]);

  const isB58 = (a: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a.trim());

  const runPolicy = useCallback(async (action: "grant"|"revoke") => {
    const t = vAddr.trim();
    if (!isB58(t)) { setVAErr("Invalid Solana address."); return; }
    setVAErr(null);
    try {
      const vk   = new PublicKey(t);
      const idxs = sel.map((s, i) => s ? i : -1).filter(i => i >= 0) as Array<0|1|2|3|4|5>;
      if (!idxs.length) { setPFB({ type: "info", text: "Select at least one field." }); return; }
      setPBusy(action); setPFB(null);
      for (const i of idxs) action === "grant" ? await grantAccess(i, vk) : await revokeAccess(i, vk);
      await refreshOwner();
      setPFB({ type: "success", text: `${action === "grant" ? "Granted" : "Revoked"} ${idxs.length} field(s).` });
    } catch (e: any) { setPFB({ type: "error", text: e?.message || "Failed." }); }
    finally { setPBusy(null); }
  }, [grantAccess, revokeAccess, vAddr, sel, refreshOwner]);

  const handleIssuerLookup = useCallback(async () => {
    setILoad(true); setIErr(null);
    try {
      const snapshot = await loadApplicantSnapshot(iAddr.trim());
      if (!snapshot.dossier) { setID(null); setIElig(null); setIErr("No dossier found."); return; }
      setID(snapshot.dossier);
      setIElig(snapshot.eligibility);
      setIVS(snapshot.verificationStatus);
      setIVP(snapshot.permissions);
    } catch (e: any) { setID(null); setIErr(e?.message || "Failed."); }
    finally { setILoad(false); }
  }, [iAddr, loadApplicantSnapshot]);

  const handleVerifierLookup = useCallback(async () => {
    setVFLoad(true); setVFErr(null); setReveals({});
    try {
      const snapshot = await loadApplicantSnapshot(vfAddr.trim());
      if (!snapshot.dossier) { setVFD(null); setVFErr("No dossier found."); return; }
      setVFD(snapshot.dossier);
      setVFVS(snapshot.verificationStatus);
      setVFVP(snapshot.permissions);
    } catch (e: any) { setVFD(null); setVFErr(e?.message || "Failed."); }
    finally { setVFLoad(false); }
  }, [loadApplicantSnapshot, vfAddr]);

  const handleReveal = useCallback(async (fieldIndex: number, handle: string) => {
    setReveals(c => ({ ...c, [fieldIndex]: { status: "loading" } }));
    try   { const v = await decryptField(handle); setReveals(c => ({ ...c, [fieldIndex]: { status: "success", value: v } })); }
    catch { setReveals(c => ({ ...c, [fieldIndex]: { status: "error" } })); }
  }, [decryptField]);

  const handleLoadPersona = useCallback((key: PersonaKey) => {
    setPersona(key);
    setView("form");
    setEligib(null);
  }, []);

  const DESKS: { key: Desk; label: string }[] = [
    { key: "applicant", label: "applicant" },
    { key: "issuer",    label: "issuer"    },
    { key: "verifier",  label: "verifier"  },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Header />

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">

        {/* Issuer context — Atlas Treasury Fund */}
        <IssuerContextBar
          walletAddress={walletAddress}
          onLoadPersona={handleLoadPersona}
          activePersona={persona}
        />

        {/* Progress */}
        {desk === "applicant" && (
          <div className="mb-5 pb-5" style={{ borderBottom: "1px solid var(--b)" }}>
            <OnboardingProgress currentStep={progress} />
          </div>
        )}

        {/* Desk tabs */}
        <div className="flex" style={{ borderBottom: "1px solid var(--b2)" }}>
          {DESKS.map(d => (
            <button
              key={d.key}
              onClick={() => setDesk(d.key)}
              className="font-mono text-[11px] px-4 py-2.5 transition-colors"
              style={{
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: -1,
                color: desk === d.key ? "var(--ink)" : "var(--ink-3)",
                background: "none",
                border: "none",
                borderBottom: desk === d.key ? "2px solid #2D5BFF" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Workspace */}
        <div className="panel p-5 sm:p-6" style={{ borderTop: "none" }}>
          {desk === "applicant" && (
            <div className="space-y-6">
              {connected && initDone === false && view === "form" && (
                <div className="space-y-3">
                  <span className="lbl">Initialize on-chain vault</span>
                  <p className="text-[13px]" style={{ color: "var(--ink-2)" }}>
                    Creates the applicant dossier context for the Arcium demo flow and prepares local encrypted inputs for compute.
                  </p>
                  {kycPda && (
                    <p className="font-mono text-[11px]" style={{ color: "var(--ink-3)" }}>
                      PDA: {kycPda.toBase58().slice(0, 14)}…{kycPda.toBase58().slice(-14)}
                    </p>
                  )}
                  <p className="font-mono text-[11px]" style={{ color: "var(--ink-3)" }}>
                    Wallet balance: {formatSolBalance(balanceLamports)}
                  </p>
                  {walletAddress && (
                    <p className="font-mono text-[11px]" style={{ color: "var(--ink-3)", wordBreak: "break-all" }}>
                      Devnet funding address: {walletAddress}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleInit} disabled={initLoading} className="btn-blue">
                      {initLoading
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Creating…</>
                        : <>Initialize vault <ArrowRight className="h-3.5 w-3.5" /></>}
                    </button>
                    <a
                      href="https://faucet.solana.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                    >
                      Open Solana faucet
                    </a>
                  </div>
                  {initErr && <p className="font-mono text-[11px] s-err">{initErr}</p>}
                </div>
              )}

              {(initDone === true || initDone === null || persona !== null) && view === "form" && (
                <KYCForm
                  onSubmit={handleSubmit}
                  isSubmitting={submitting}
                  currentStep={step}
                  connected={connected}
                  identityLabel={identityLabel}
                  walletAddress={walletAddress}
                  walletLabel={walletLabel}
                  requiresPrivySetup={requiresPrivySetup}
                  onEmailLogin={loginWithEmail}
                  onWalletConnect={connectWallet}
                  prefillPersona={persona}
                />
              )}

              {view === "result" && (
                <Results
                  results={results}
                  walletAddress={publicKey?.toBase58() || "(persona demo)"}
                  eligibility={eligibility}
                  onBack={() => { setView("form"); setEligib(null); }}
                  onContinueToPolicy={() => {
                    // Auto-select required reveal fields when user clicks "Grant reveal policy"
                    if (eligibility?.requiredRevealFields) {
                      const fieldNameToIndex: Record<string, number> = {
                        jurisdiction: 0, accredited: 1, net_worth_band: 2, pep_status: 3, sanctions: 4, investment_cap: 5,
                      };
                      const newSel = Array(6).fill(false);
                      eligibility.requiredRevealFields.forEach(f => {
                        const i = fieldNameToIndex[f];
                        if (i !== undefined) newSel[i] = true;
                      });
                      setSel(newSel);
                    }
                    setView("form");
                    document.querySelector("[data-policy-panel]")?.scrollIntoView({ behavior: "smooth" });
                  }}
                />
              )}
              {error && <p className="font-mono text-[11px] s-err">{error}</p>}
            </div>
          )}

          {desk === "issuer" && (
            <IssuerConsole connected={connected} requiresPrivySetup={requiresPrivySetup} walletAddress={walletAddress}
              applicantAddress={iAddr} onApplicantAddressChange={setIAddr}
              onEmailLogin={loginWithEmail} onWalletConnect={connectWallet}
              onLookup={handleIssuerLookup} lookupLoading={iLoad} lookupError={iErr}
              dossier={iDossier} verificationStatus={iVS} verifierPermissions={iVP}
              eligibility={iElig} />
          )}

          {desk === "verifier" && (
            <VerifierConsole connected={connected} requiresPrivySetup={requiresPrivySetup} walletAddress={walletAddress}
              applicantAddress={vfAddr} onApplicantAddressChange={setVFAddr}
              onEmailLogin={loginWithEmail} onWalletConnect={connectWallet}
              onLookup={handleVerifierLookup} lookupLoading={vfLoad} lookupError={vfErr}
              dossier={vfDossier} verificationStatus={vfVS} verifierPermissions={vfVP}
              reveals={reveals} onReveal={handleReveal} />
          )}
        </div>

        {/* Policy panel */}
        {desk === "applicant" && (
          <div data-policy-panel style={{ marginTop: 1 }}>
            <AccessPolicyPanel dossier={ownerDossier} verificationStatus={ownerVS} verifierPermissions={ownerVP}
              verifierAddress={vAddr} verifierAddressError={vAddrErr}
              onVerifierAddressChange={v => { setVAddr(v); if (vAddrErr) setVAErr(null); }}
              selectedFields={sel}
              onToggleField={i => setSel(c => c.map((v, j) => j === i ? !v : v))}
              onSelectSubmitted={() => ownerDossier && setSel(ownerDossier.fields.map((f: any) => f.submitted))}
              onClearSelection={() => setSel(Array(6).fill(false))}
              onGrant={() => runPolicy("grant")} onRevoke={() => runPolicy("revoke")}
              busyAction={pBusy} feedback={pFeedback} />
          </div>
        )}

        {/* Footer */}
        <div className="mt-10" style={{ borderTop: "1px solid var(--b)", paddingTop: 16 }}>
          <p className="font-mono text-[10px]" style={{ color: "var(--ink-3)", letterSpacing: "0.08em" }}>
            program: claimrail mxe scaffold · cluster offset 456 · arcium MPC
          </p>
        </div>
      </main>
    </div>
  );
}
