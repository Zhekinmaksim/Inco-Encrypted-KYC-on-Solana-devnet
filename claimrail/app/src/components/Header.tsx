"use client";
import BrandMark from "@/components/BrandMark";
import { useWalletSession } from "@/contexts/WalletProvider";

export default function Header() {
  const { connected, disconnect, walletAddress } = useWalletSession();

  return (
    <header className="sticky top-0 z-50 border-b bg-bg" style={{ borderColor: "var(--b2)" }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <BrandMark className="h-8 w-8" />
          <span
            className="font-body text-[22px] font-600 leading-none"
            style={{ letterSpacing: "-0.03em", color: "var(--ink)" }}
          >
            claimrail
          </span>
        </div>
        <div className="flex items-center gap-3">
          {connected && (
            <>
              <span className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "connected"}
              </span>
              <button
                onClick={() => {
                  void disconnect();
                }}
                className="lbl transition-colors hover:text-ink"
                style={{ color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer" }}
              >
                disconnect
              </button>
            </>
          )}
          <a
            href="https://github.com/Zhekinmaksim"
            target="_blank"
            rel="noopener noreferrer"
            className="lbl transition-colors hover:text-ink"
            style={{ color: "var(--ink-3)" }}
          >
            github ↗
          </a>
        </div>
      </div>
    </header>
  );
}
