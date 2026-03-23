import type { Metadata } from "next";
import "./globals.css";
import dynamic from "next/dynamic";

const WalletProviders = dynamic(
  () => import("@/contexts/WalletProvider").then((m) => m.WalletProviders),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Inco Encrypted KYC · Solana Devnet",
  description: "Privacy-preserving KYC powered by Inco Lightning on Solana",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <WalletProviders>{children}</WalletProviders>
      </body>
    </html>
  );
}
