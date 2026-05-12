"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";

type Rule = {
  id: string;
  field: string;
  op: string;
  value: string;
  outcome: "reject" | "manual_review" | "tier_a" | "tier_b" | "tier_c";
  enabled: boolean;
};

const FIELD_OPTIONS = ["jurisdiction", "accredited", "net_worth_band", "pep_status", "sanctions"];
const OP_OPTIONS    = { jurisdiction: ["in", "not_in"], accredited: ["==", "!="], net_worth_band: ["==", ">="], pep_status: ["==", "!="], sanctions: ["==", "!="] } as Record<string, string[]>;

const OUTCOMES = [
  { v: "reject",        l: "reject",        c: "var(--red)"   },
  { v: "manual_review", l: "manual review", c: "var(--amber)" },
  { v: "tier_a",        l: "tier A",        c: "var(--green)" },
  { v: "tier_b",        l: "tier B",        c: "var(--green)" },
  { v: "tier_c",        l: "tier C",        c: "var(--green)" },
];

const DEFAULTS: Rule[] = [
  { id: "r1", field: "sanctions",      op: "==", value: "true",     outcome: "reject",        enabled: true },
  { id: "r2", field: "jurisdiction",   op: "not_in", value: "DE,FR,NL,SG,CH,GB,IE,LU", outcome: "reject", enabled: true },
  { id: "r3", field: "accredited",     op: "==", value: "false",    outcome: "reject",        enabled: true },
  { id: "r4", field: "pep_status",     op: "==", value: "foreign",  outcome: "manual_review", enabled: true },
  { id: "r5", field: "net_worth_band", op: ">=", value: "1M-10M",   outcome: "tier_a",        enabled: true },
  { id: "r6", field: "net_worth_band", op: "==", value: "100k-1M",  outcome: "tier_b",        enabled: true },
];

export default function PolicyRuleEngine() {
  const [rules, setRules] = useState<Rule[]>(DEFAULTS);

  const update = (id: string, patch: Partial<Rule>) =>
    setRules(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
  const remove = (id: string) =>
    setRules(rs => rs.filter(r => r.id !== id));
  const add = () => {
    const id = `r${Date.now()}`;
    setRules(rs => [...rs, { id, field: "jurisdiction", op: "in", value: "", outcome: "reject", enabled: true }]);
  };

  // Mock impact preview — would be 14/100 of sample applicants in production
  const enabledCount = rules.filter(r => r.enabled).length;
  const sampleSize = 100;
  const rejected   = Math.min(34, enabledCount * 5);
  const review     = Math.min(8,  enabledCount * 1);
  const eligible   = sampleSize - rejected - review;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="lbl s-blue">Rule engine</span>
        <div className="flex-1 rule" />
        <span className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
          first-match wins · evaluated top-down
        </span>
      </div>

      {/* Rule list */}
      <div className="panel-1" style={{ borderTop: "1px solid var(--b2)" }}>
        {/* Header row */}
        <div className="grid gap-2 px-3 py-2"
          style={{ gridTemplateColumns: "20px 1.2fr 0.6fr 1.2fr 1fr 24px", borderBottom: "1px solid var(--b2)" }}>
          <span className="lbl">#</span>
          <span className="lbl">field</span>
          <span className="lbl">op</span>
          <span className="lbl">value</span>
          <span className="lbl">outcome</span>
          <span></span>
        </div>

        {rules.map((r, i) => {
          const outcomeColor = OUTCOMES.find(o => o.v === r.outcome)?.c || "var(--ink)";
          return (
            <div
              key={r.id}
              className="grid gap-2 px-3 py-2 items-center"
              style={{
                gridTemplateColumns: "20px 1.2fr 0.6fr 1.2fr 1fr 24px",
                borderBottom: i < rules.length - 1 ? "1px solid var(--b)" : "none",
                opacity: r.enabled ? 1 : 0.4,
              }}
            >
              <span className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>{i + 1}</span>
              <select value={r.field}
                onChange={e => update(r.id, { field: e.target.value, op: OP_OPTIONS[e.target.value][0] })}
                className="inp" style={{ padding: "4px 6px", fontSize: 11 }}>
                {FIELD_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select value={r.op} onChange={e => update(r.id, { op: e.target.value })}
                className="inp" style={{ padding: "4px 6px", fontSize: 11 }}>
                {(OP_OPTIONS[r.field] || ["=="]).map(op => <option key={op} value={op}>{op}</option>)}
              </select>
              <input value={r.value} onChange={e => update(r.id, { value: e.target.value })}
                className="inp" style={{ padding: "4px 6px", fontSize: 11 }} />
              <select value={r.outcome} onChange={e => update(r.id, { outcome: e.target.value as Rule["outcome"] })}
                className="inp" style={{ padding: "4px 6px", fontSize: 11, color: outcomeColor }}>
                {OUTCOMES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
              <button onClick={() => remove(r.id)} title="Remove"
                className="flex items-center justify-center"
                style={{ width: 20, height: 20, border: "1px solid var(--b2)", background: "var(--bg-2)", cursor: "pointer" }}>
                <X className="h-3 w-3" style={{ color: "var(--ink-3)" }} />
              </button>
            </div>
          );
        })}
      </div>

      <button onClick={add} className="btn">
        <Plus className="h-3.5 w-3.5" />Add rule
      </button>

      {/* Impact preview */}
      <div className="mt-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="lbl">Impact preview</span>
          <div className="flex-1 rule" />
          <span className="font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
            simulated against 100 sample applicants
          </span>
        </div>
        <div className="grid grid-cols-3" style={{ border: "1px solid var(--b2)" }}>
          {[
            { l: "Eligible",      v: eligible, c: "var(--green)" },
            { l: "Manual review", v: review,   c: "var(--amber)" },
            { l: "Rejected",      v: rejected, c: "var(--red)"   },
          ].map((s, i) => (
            <div key={s.l} className="px-3 py-3 bg-bg-2"
              style={{ borderRight: i < 2 ? "1px solid var(--b2)" : "none" }}>
              <span className="lbl">{s.l}</span>
              <p className="mt-1 font-mono text-[18px] font-500" style={{ color: s.c }}>
                {s.v}
                <span className="font-mono text-[11px]" style={{ color: "var(--ink-3)" }}> / 100</span>
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--ink-3)" }}>
          Rules are evaluated inside Arcium MPC — issuer never sees individual applicant fields, only the aggregate outcome distribution.
        </p>
      </div>
    </div>
  );
}
