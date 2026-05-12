import type { Metadata } from "next";
import "./globals.css";
import dynamic from "next/dynamic";

const WalletProviders = dynamic(
  () => import("@/contexts/WalletProvider").then((m) => m.WalletProviders),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Claimrail · Private Compliance Identity for Solana",
  description: "Claimrail is a private eligibility rail for private lending and borrowing on Solana, powered by Arcium and Privy.",
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
