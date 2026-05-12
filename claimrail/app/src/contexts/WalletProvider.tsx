"use client";
import React, { createContext, useCallback, useContext, useMemo } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { PrivyProvider, useConnectWallet, useLogin, usePrivy } from "@privy-io/react-auth";
import {
  toSolanaWalletConnectors,
  useSignMessage,
  useSignTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";

type AnchorWalletLike = {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
};

type WalletSessionValue = {
  connection: Connection;
  ready: boolean;
  connected: boolean;
  authenticated: boolean;
  requiresPrivySetup: boolean;
  publicKey: PublicKey | null;
  walletAddress: string | null;
  identityLabel: string | null;
  walletLabel: string | null;
  anchorWallet: AnchorWalletLike | null;
  loginWithEmail: () => void;
  connectWallet: () => void;
  disconnect: () => Promise<void>;
  logout: () => void;
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | null;
};

const WalletSessionContext = createContext<WalletSessionValue | null>(null);

function deriveWsEndpoint(endpoint: string) {
  if (endpoint.startsWith("https://")) return `wss://${endpoint.slice("https://".length)}`;
  if (endpoint.startsWith("http://")) return `ws://${endpoint.slice("http://".length)}`;
  return endpoint;
}

function deserializeTransaction<T extends Transaction | VersionedTransaction>(
  original: T,
  bytes: Uint8Array
): T {
  if (original instanceof VersionedTransaction) {
    return VersionedTransaction.deserialize(bytes) as T;
  }
  return Transaction.from(bytes) as T;
}

function serializeTransactionForPrivy(transaction: Transaction | VersionedTransaction): Uint8Array {
  if (transaction instanceof VersionedTransaction) {
    return transaction.serialize();
  }

  return transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
}

function getIdentityLabel(user: any, walletAddress: string | null) {
  return (
    user?.email?.address ||
    user?.google?.email ||
    user?.apple?.email ||
    user?.github?.username ||
    user?.twitter?.username ||
    walletAddress
  );
}

function WalletSessionProviderInner({
  children,
  endpoint,
  wsEndpoint,
}: {
  children: React.ReactNode;
  endpoint: string;
  wsEndpoint?: string;
}) {
  const connection = useMemo(
    () =>
      new Connection(
        endpoint,
        wsEndpoint
          ? {
              commitment: "confirmed",
              wsEndpoint,
            }
          : "confirmed"
      ),
    [endpoint, wsEndpoint]
  );
  const { ready, authenticated, logout, user } = usePrivy();
  const { login } = useLogin({
    onError: (error) => {
      console.error("[Privy email login error]", error);
    },
  });
  const { connectWallet } = useConnectWallet({
    onError: (error) => {
      console.error("[Privy wallet connect error]", error);
    },
  });
  const { ready: walletsReady, wallets = [] } = useWallets();
  const { signMessage: privySignMessage } = useSignMessage();
  const { signTransaction: privySignTransaction } = useSignTransaction();

  const primaryWallet = useMemo(() => {
    return (
      wallets.find((wallet: any) => {
        const clientType = String(wallet?.walletClientType || wallet?.connectorType || "");
        return clientType.includes("privy") || clientType.includes("embedded");
      }) ||
      wallets[0] ||
      null
    );
  }, [wallets]);

  const publicKey = useMemo(() => {
    if (!primaryWallet?.address) return null;
    try {
      return new PublicKey(primaryWallet.address);
    } catch {
      return null;
    }
  }, [primaryWallet]);

  const walletAddress = publicKey?.toBase58() || null;
  const connected = walletsReady && !!publicKey;
  const walletLabel = useMemo(() => {
    const type = String(primaryWallet?.walletClientType || primaryWallet?.connectorType || "");
    if (!type) return null;
    if (type.includes("privy") || type.includes("embedded")) return "Privy Embedded Wallet";
    return `Connected ${type.replace(/_/g, " ")}`;
  }, [primaryWallet]);

  const loginWithEmail = useCallback(() => {
    login({ loginMethods: ["email"] });
  }, [login]);

  const connectWalletOnly = useCallback(() => {
    connectWallet();
  }, [connectWallet]);

  const disconnect = useCallback(async () => {
    try {
      await primaryWallet?.disconnect?.();
    } catch (error) {
      console.error("[Privy wallet disconnect error]", error);
    }

    try {
      await logout();
    } catch (error) {
      console.error("[Privy logout error]", error);
    }
  }, [logout, primaryWallet]);

  const signMessage = useCallback(
    async (message: Uint8Array) => {
      if (!primaryWallet) throw new Error("No Solana wallet connected through Privy");

      if (typeof (primaryWallet as any).signMessage === "function") {
        const result = await (primaryWallet as any).signMessage({
          message,
          options: {
            uiOptions: {
              title: "Authorize secure reveal",
            },
          },
        });
        return result.signature;
      }

      const result = await privySignMessage({
        message,
        wallet: primaryWallet as any,
        options: {
          uiOptions: {
            title: "Authorize secure reveal",
          },
        },
      });
      return result.signature;
    },
    [primaryWallet, privySignMessage]
  );

  const signTransaction = useCallback(
    async <T extends Transaction | VersionedTransaction>(transaction: T) => {
      if (!primaryWallet) throw new Error("No Solana wallet connected through Privy");

      const serialized = serializeTransactionForPrivy(transaction);
      let result:
        | {
            signedTransaction: Uint8Array;
          }
        | undefined;

      if (typeof (primaryWallet as any).signTransaction === "function") {
        result = await (primaryWallet as any).signTransaction({
          transaction: serialized,
          chain: "solana:devnet",
          options: {
            uiOptions: {
              title: "Approve Claimrail transaction",
            },
          },
        });
      } else {
        result = await privySignTransaction({
          transaction: serialized,
          wallet: primaryWallet as any,
          options: {
            uiOptions: {
              title: "Approve Claimrail transaction",
            },
          },
        });
      }

      return deserializeTransaction(transaction, result.signedTransaction);
    },
    [primaryWallet, privySignTransaction]
  );

  const signAllTransactions = useCallback(
    async <T extends Transaction | VersionedTransaction>(transactions: T[]) => {
      return Promise.all(transactions.map((transaction) => signTransaction(transaction)));
    },
    [signTransaction]
  );

  const anchorWallet = useMemo<AnchorWalletLike | null>(() => {
    if (!publicKey || !primaryWallet) return null;
    return {
      publicKey,
      signTransaction,
      signAllTransactions,
    };
  }, [primaryWallet, publicKey, signAllTransactions, signTransaction]);

  const value = useMemo<WalletSessionValue>(
    () => ({
      connection,
      ready: ready && walletsReady,
      // Wallet presence is the state the app actually needs for signing and devnet transactions.
      // Privy auth can lag or fail independently after an external wallet connection.
      connected,
      authenticated,
      requiresPrivySetup: false,
      publicKey,
      walletAddress,
      identityLabel: getIdentityLabel(user, walletAddress),
      walletLabel,
      anchorWallet,
      loginWithEmail,
      connectWallet: connectWalletOnly,
      disconnect,
      logout,
      signMessage,
    }),
    [
      anchorWallet,
      authenticated,
      connected,
      connection,
      connectWalletOnly,
      disconnect,
      loginWithEmail,
      logout,
      publicKey,
      ready,
      signMessage,
      user,
      walletAddress,
      walletLabel,
      walletsReady,
    ]
  );

  return <WalletSessionContext.Provider value={value}>{children}</WalletSessionContext.Provider>;
}

function FallbackWalletProvider({
  children,
  endpoint,
  wsEndpoint,
}: {
  children: React.ReactNode;
  endpoint: string;
  wsEndpoint?: string;
}) {
  const connection = useMemo(
    () =>
      new Connection(
        endpoint,
        wsEndpoint
          ? {
              commitment: "confirmed",
              wsEndpoint,
            }
          : "confirmed"
      ),
    [endpoint, wsEndpoint]
  );
  const value = useMemo<WalletSessionValue>(
    () => ({
      connection,
      ready: true,
      connected: false,
      authenticated: false,
      requiresPrivySetup: true,
      publicKey: null,
      walletAddress: null,
      identityLabel: null,
      walletLabel: null,
      anchorWallet: null,
      loginWithEmail: () => undefined,
      connectWallet: () => undefined,
      disconnect: async () => undefined,
      logout: () => undefined,
      signMessage: null,
    }),
    [connection]
  );

  return <WalletSessionContext.Provider value={value}>{children}</WalletSessionContext.Provider>;
}

export function WalletProviders({ children }: { children: React.ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";
  const wsEndpoint = process.env.NEXT_PUBLIC_SOLANA_WS_URL || deriveWsEndpoint(endpoint);
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

  if (!appId) {
    return <FallbackWalletProvider endpoint={endpoint} wsEndpoint={wsEndpoint}>{children}</FallbackWalletProvider>;
  }

  return (
    <PrivyProvider
      appId={appId}
      clientId={clientId || undefined}
      config={{
        solana: {
          rpcs: {
            "solana:devnet": {
              rpc: createSolanaRpc(endpoint),
              rpcSubscriptions: createSolanaRpcSubscriptions(wsEndpoint),
              blockExplorerUrl: "https://explorer.solana.com/?cluster=devnet",
            },
          },
        },
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "light",
          landingHeader: "Claimrail for compliant Solana onboarding",
          walletChainType: "solana-only",
          showWalletLoginFirst: true,
          walletList: ["phantom", "solflare", "backpack", "detected_solana_wallets", "wallet_connect_qr_solana"],
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
        embeddedWallets: {
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <WalletSessionProviderInner endpoint={endpoint} wsEndpoint={wsEndpoint}>{children}</WalletSessionProviderInner>
    </PrivyProvider>
  );
}

export function useWalletSession() {
  const context = useContext(WalletSessionContext);
  if (!context) {
    throw new Error("useWalletSession must be used within WalletProviders");
  }
  return context;
}
