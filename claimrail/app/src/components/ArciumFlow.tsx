"use client";

// Visual proof of the privacy boundary: encrypted inputs go in, only the
// minimal verdict comes out. The middle block is hatched to represent the
// MPC compute zone where plaintext never appears.

export default function ArciumFlow() {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="lbl">Compute boundary</span>
        <div className="flex-1 rule" />
        <span className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
          encrypted in · verdict out
        </span>
      </div>

      <svg viewBox="0 0 680 200" width="100%" style={{ display: "block" }} aria-label="Arcium compute boundary">
        <defs>
          {/* Hatched fill for the MPC zone */}
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#2D5BFF" strokeWidth="1" opacity="0.35"/>
          </pattern>
        </defs>

        {/* Box 1: encrypted inputs */}
        <rect x="20" y="40" width="180" height="120" fill="#fff" stroke="#000" strokeWidth="2"/>
        <text x="32" y="64" fontFamily="JetBrains Mono, monospace" fontSize="10" letterSpacing="1" fill="#999">ENCRYPTED INPUT</text>
        <line x1="32" y1="74" x2="188" y2="74" stroke="#000" strokeOpacity="0.12"/>

        {[
          { y: 92,  k: "jurisdiction",   v: "0x4f2c…" },
          { y: 108, k: "accredited",     v: "0xa830…" },
          { y: 124, k: "net_worth",      v: "0x8e21…" },
          { y: 140, k: "pep_status",     v: "0x0b1a…" },
        ].map(row => (
          <g key={row.k}>
            <text x="32" y={row.y} fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#000">{row.k}</text>
            <text x="188" y={row.y} fontFamily="JetBrains Mono, monospace" fontSize="10" textAnchor="end" fill="#2D5BFF">{row.v}</text>
          </g>
        ))}

        {/* Arrow 1 → 2 */}
        <line x1="200" y1="100" x2="248" y2="100" stroke="#000" strokeWidth="2"/>
        <polygon points="248,95 258,100 248,105" fill="#000"/>

        {/* Box 2: MPC compute (hatched) */}
        <rect x="258" y="40" width="164" height="120" fill="url(#hatch)" stroke="#2D5BFF" strokeWidth="2"/>
        <rect x="258" y="40" width="164" height="120" fill="rgba(255,255,255,0.55)" stroke="none"/>
        <text x="340" y="78" fontFamily="JetBrains Mono, monospace" fontSize="10" letterSpacing="1" fill="#2D5BFF" textAnchor="middle">ARCIUM MPC</text>

        {/* Three nodes inside the MPC */}
        {[300, 340, 380].map(cx => (
          <g key={cx}>
            <circle cx={cx} cy="105" r="8" fill="#2D5BFF"/>
            <line x1={cx} y1="113" x2={cx === 340 ? 340 : cx === 300 ? 340 : 340} y2="135" stroke="#2D5BFF" strokeWidth="1"/>
          </g>
        ))}
        <line x1="300" y1="105" x2="380" y2="105" stroke="#2D5BFF" strokeWidth="1" strokeDasharray="3 3"/>

        <text x="340" y="148" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#2D5BFF" textAnchor="middle" opacity="0.7">
          plaintext never assembled
        </text>

        {/* Arrow 2 → 3 */}
        <line x1="422" y1="100" x2="470" y2="100" stroke="#000" strokeWidth="2"/>
        <polygon points="470,95 480,100 470,105" fill="#000"/>

        {/* Box 3: minimal output */}
        <rect x="480" y="40" width="180" height="120" fill="#2D5BFF" stroke="#000" strokeWidth="2"/>
        <text x="492" y="64" fontFamily="JetBrains Mono, monospace" fontSize="10" letterSpacing="1" fill="rgba(255,255,255,0.7)">VERDICT</text>
        <line x1="492" y1="74" x2="648" y2="74" stroke="#fff" strokeOpacity="0.25"/>

        {[
          { y: 92,  k: "eligible",   v: "true"   },
          { y: 108, k: "tier",       v: "B"      },
          { y: 124, k: "cap",        v: "$75K"  },
          { y: 140, k: "review",     v: "auto"   },
        ].map(row => (
          <g key={row.k}>
            <text x="492" y={row.y} fontFamily="JetBrains Mono, monospace" fontSize="10" fill="rgba(255,255,255,0.85)">{row.k}</text>
            <text x="648" y={row.y} fontFamily="JetBrains Mono, monospace" fontSize="10" textAnchor="end" fill="#fff" fontWeight="500">{row.v}</text>
          </g>
        ))}
      </svg>

      <p className="mt-3 text-[12px]" style={{ color: "var(--ink-2)" }}>
        Issuer never sees raw identity data. Only the minimum required outcome leaves the privacy boundary.
      </p>
    </div>
  );
}
