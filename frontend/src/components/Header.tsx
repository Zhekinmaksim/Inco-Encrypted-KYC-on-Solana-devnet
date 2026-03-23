"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Shield } from "lucide-react";

export default function Header() {
  const { publicKey } = useWallet();
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-inco-dark/80 border-b border-inco-border">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-inco-accent to-inco-accent2 flex items-center justify-center">
            <Shield className="w-5 h-5 text-inco-dark" strokeWidth={2.5} />
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-inco-accent rounded-full animate-pulse-slow" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-white">INCO<span className="text-inco-accent">·</span>KYC</h1>
            <p className="text-[10px] font-body text-inco-muted uppercase tracking-[0.2em]">Encrypted Identity · Devnet</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-inco-panel border border-inco-border text-xs">
            <span className="w-2 h-2 rounded-full bg-inco-accent animate-pulse" />
            <span className="text-inco-muted font-body">Solana Devnet</span>
          </div>
          {publicKey && (
            <div className="hidden md:block px-3 py-1.5 rounded-full bg-inco-panel border border-inco-border text-xs font-display text-inco-muted">
              {publicKey.toBase58().slice(0, 4)}···{publicKey.toBase58().slice(-4)}
            </div>
          )}
          <WalletMultiButton style={{ background:"linear-gradient(135deg,#00e5a0,#00c489)", color:"#080a0f", fontFamily:'"DM Sans",sans-serif', fontWeight:600, fontSize:"13px", borderRadius:"12px", padding:"10px 20px", height:"auto" }} />
        </div>
      </div>
    </header>
  );
}
