"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Claimrail app error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f3f2ee", color: "#121212", fontFamily: "system-ui, sans-serif" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "720px",
              border: "1px solid #d1d0ca",
              background: "#fffefb",
              padding: "32px",
            }}
          >
            <p style={{ margin: 0, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7a7a74" }}>
              Client error
            </p>
            <h1 style={{ margin: "12px 0 0", fontSize: "36px", lineHeight: 1.05 }}>
              Claimrail hit a runtime error.
            </h1>
            <p style={{ margin: "16px 0 0", fontSize: "16px", lineHeight: 1.6, color: "#44443f" }}>
              Retry the current screen first. If the error returns after email login or wallet connect,
              disconnect the current session and reconnect before initializing the dossier.
            </p>
            <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
              <button
                onClick={() => reset()}
                style={{
                  border: "1px solid #2d5bff",
                  background: "#2d5bff",
                  color: "#fff",
                  padding: "12px 18px",
                  cursor: "pointer",
                }}
              >
                Retry screen
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  border: "1px solid #d1d0ca",
                  background: "#fffefb",
                  color: "#121212",
                  padding: "12px 18px",
                  cursor: "pointer",
                }}
              >
                Reload app
              </button>
            </div>
            <p style={{ margin: "18px 0 0", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "12px", color: "#7a7a74" }}>
              {error.message || "Unknown client-side exception"}
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
