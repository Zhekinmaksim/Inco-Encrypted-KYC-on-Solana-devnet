"use client";

export type ProgressStep = "connect" | "init" | "submit" | "policy" | "done";

const STEPS: { key: ProgressStep; label: string }[] = [
  { key: "connect", label: "Connect"       },
  { key: "init",    label: "Init vault"    },
  { key: "submit",  label: "Encrypt"       },
  { key: "policy",  label: "Grant policy"  },
  { key: "done",    label: "Done"          },
];

function idx(s: ProgressStep) { return STEPS.findIndex(x => x.key === s); }

export default function OnboardingProgress({ currentStep }: { currentStep: ProgressStep }) {
  const cur = idx(currentStep);
  return (
    <div className="flex items-center overflow-x-auto py-1">
      {STEPS.map((step, i) => {
        const done   = i < cur;
        const active = i === cur;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex items-center gap-2">
              {/* Step box — matches the logo grid aesthetic */}
              <div
                style={{
                  width: 20, height: 20,
                  border: "1px solid var(--b2)",
                  background: done ? "var(--ink)" : active ? "#2D5BFF" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
                  color: (done || active) ? "#fff" : "var(--ink-3)",
                  flexShrink: 0,
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className="hidden whitespace-nowrap sm:block"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: done ? "var(--ink)" : active ? "#2D5BFF" : "var(--ink-3)",
                }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 24, height: 1, margin: "0 10px", flexShrink: 0,
                  background: done ? "var(--ink)" : "var(--b2)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
