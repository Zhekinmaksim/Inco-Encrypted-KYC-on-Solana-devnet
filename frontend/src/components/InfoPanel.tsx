"use client";
import { Lock, Shield, Eye, Server, KeyRound, Zap } from "lucide-react";

const features = [
  { icon: Lock, title: "Inco encryptValue()", desc: "Each KYC field → BigInt → encrypted via Inco SDK client-side." },
  { icon: Shield, title: "Anchor Program CPI", desc: "Ciphertext is sent to your program which calls new_euint128 on Inco Lightning." },
  { icon: Server, title: "On-Chain Handle", desc: "Inco returns an encrypted u128 handle stored in your KYC PDA." },
  { icon: KeyRound, title: "allow() Access", desc: "The program calls allow() to grant decrypt access to the owner's wallet." },
  { icon: Eye, title: "Attested Reveal", desc: "Only authorized wallets can call decrypt() with their signMessage." },
  { icon: Zap, title: "Solana Devnet", desc: "Sub-second finality. Each field = 1 transaction on devnet." },
];

export default function InfoPanel() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display font-bold text-white text-sm mb-1">How it works</h3>
        <p className="text-[11px] text-inco-muted font-body leading-relaxed">
          Real Inco Lightning encryption on Solana. No simulation.
        </p>
      </div>
      <div className="space-y-2.5">
        {features.map(({ icon: Icon, title, desc }, idx) => (
          <div key={title} className="group flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-inco-dark/50 transition-colors animate-slide-up" style={{ animationDelay: `${idx * 80}ms` }}>
            <div className="w-7 h-7 rounded-lg bg-inco-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-inco-accent/20 transition-colors">
              <Icon className="w-3.5 h-3.5 text-inco-accent" />
            </div>
            <div>
              <p className="text-[11px] font-body font-semibold text-inco-text">{title}</p>
              <p className="text-[10px] font-body text-inco-muted leading-relaxed mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Data flow diagram */}
      <div className="p-3 rounded-xl bg-inco-dark border border-inco-border">
        <p className="text-[9px] font-body text-inco-muted uppercase tracking-wider mb-2">On-Chain Flow</p>
        <div className="flex items-center justify-between text-[9px] font-display text-inco-muted">
          <div className="text-center"><div className="w-9 h-9 rounded-lg bg-inco-accent/10 flex items-center justify-center mx-auto mb-0.5 text-inco-accent text-[10px]">SDK</div>encrypt</div>
          <div className="flex-1 border-t border-dashed border-inco-border mx-1.5 relative"><span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-inco-dark px-1 text-inco-accent text-[8px]">ciphertext</span></div>
          <div className="text-center"><div className="w-9 h-9 rounded-lg bg-inco-accent2/10 flex items-center justify-center mx-auto mb-0.5 text-inco-accent2 text-[10px]">CPI</div>program</div>
          <div className="flex-1 border-t border-dashed border-inco-border mx-1.5 relative"><span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-inco-dark px-1 text-inco-accent2 text-[8px]">handle</span></div>
          <div className="text-center"><div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center mx-auto mb-0.5 text-violet-400 text-[9px]">PDA</div>Solana</div>
        </div>
      </div>
    </div>
  );
}
