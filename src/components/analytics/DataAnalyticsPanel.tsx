"use client";

import { useState } from "react";
import { X, BarChart3, TrendingUp, Table2, Info } from "lucide-react";
import { ColumnMeta } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface Props {
  columnMeta: ColumnMeta[];
  fileName: string;
  rowCount: number;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  numeric: "#3B82F6", categorical: "#8B5CF6", boolean: "#F59E0B",
  datetime: "#10B981", text: "#6B7280", id: "#EF4444",
};

type Tab = "overview" | "distributions" | "nulls" | "info";

function makeHistogramData() {
  return Array.from({ length: 10 }, (_, i) => ({
    bin: i,
    count: Math.round(80 * Math.exp(-Math.pow((i / 9 - 0.5) * 4, 2)) * (0.7 + Math.random() * 0.6)),
  }));
}

function makeFreqData(cardinality: number) {
  const n = Math.min(cardinality, 8);
  return Array.from({ length: n }, (_, i) => ({
    name: `Cat ${i + 1}`,
    count: Math.round(100 / (i + 1) * (0.7 + Math.random() * 0.5)),
  }));
}

export default function DataAnalyticsPanel({ columnMeta, fileName, rowCount, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedCol, setSelectedCol] = useState<string>(columnMeta[0]?.name ?? "");

  const col = columnMeta.find(c => c.name === selectedCol) ?? columnMeta[0];
  const numericCols  = columnMeta.filter(c => c.type === "numeric");
  const catCols      = columnMeta.filter(c => c.type === "categorical" || c.type === "boolean");

  const typeCounts: Record<string, number> = {};
  columnMeta.forEach(c => { typeCounts[c.type] = (typeCounts[c.type] ?? 0) + 1; });
  const typeData = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview",       label: "Overview",      icon: <Info className="w-3.5 h-3.5" /> },
    { id: "distributions",  label: "Distributions", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "nulls",          label: "Null Analysis", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: "info",           label: "Column Info",   icon: <Table2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--z-surface)] border-l border-[var(--z-border)] shadow-2xl w-full max-w-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--z-border)] bg-[var(--z-header)]">
          <div>
            <h2 className="text-sm font-semibold text-white">Data Analytics</h2>
            <p className="text-[10px] text-white/60 mt-0.5 truncate">{fileName} · {rowCount?.toLocaleString() ?? "?"} rows · {columnMeta.length} cols</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--z-border)] px-2 bg-[var(--z-surface-2)]">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                tab === t.id ? "border-[var(--z-accent)] text-[var(--z-accent)]"
                             : "border-transparent text-[var(--z-text-2)] hover:text-[var(--z-text)]"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Rows",    value: rowCount?.toLocaleString() ?? "—", color: "text-[var(--z-accent)]" },
                  { label: "Columns",       value: columnMeta.length,                  color: "text-purple-500 dark:text-purple-400" },
                  { label: "Numeric Cols",  value: numericCols.length,                 color: "text-blue-500" },
                  { label: "Categorical",   value: catCols.length,                     color: "text-purple-500" },
                ].map(c => (
                  <div key={c.label} className="bg-[var(--z-surface-2)] rounded-xl border border-[var(--z-border)] p-4">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--z-text-3)] mb-1">{c.label}</p>
                    <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[var(--z-surface-2)] rounded-xl border border-[var(--z-border)] p-4">
                <p className="text-xs font-semibold text-[var(--z-text-2)] mb-3">Column Type Distribution</p>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={typeData}>
                    <XAxis dataKey="type" tick={{ fontSize: 10, fill: "var(--z-text-2)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--z-text-2)" }} />
                    <Tooltip contentStyle={{ background: "var(--z-surface)", border: "1px solid var(--z-border)", borderRadius: 8, fontSize: 11 }} cursor={{ fill: "var(--z-accent-bg)" }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {typeData.map(d => <Cell key={d.type} fill={TYPE_COLORS[d.type] ?? "#6B7280"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {columnMeta.find(c => c.is_target) && (
                <div className="bg-[var(--z-accent-bg)] rounded-xl border border-[var(--z-accent)]/30 p-4">
                  <p className="text-xs font-semibold text-[var(--z-accent)] mb-1">Target Variable</p>
                  <p className="text-sm font-mono font-bold text-[var(--z-text)]">{columnMeta.find(c => c.is_target)?.name}</p>
                  <p className="text-xs text-[var(--z-text-2)] mt-0.5">
                    Type: {columnMeta.find(c => c.is_target)?.type} · Cardinality: {columnMeta.find(c => c.is_target)?.cardinality ?? "—"}
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── DISTRIBUTIONS ── */}
          {tab === "distributions" && (
            <>
              <div>
                <p className="text-[10px] font-semibold text-[var(--z-text-3)] uppercase tracking-wider mb-2">Select Column</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {columnMeta.filter(c => c.type !== "id" && c.type !== "text").map(c => (
                    <button key={c.name} onClick={() => setSelectedCol(c.name)}
                      className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-all ${
                        selectedCol === c.name
                          ? "bg-[var(--z-accent)] border-[var(--z-accent)] text-white"
                          : "border-[var(--z-border)] text-[var(--z-text-2)] hover:border-[var(--z-accent)]"
                      }`}>{c.name}
                    </button>
                  ))}
                </div>
              </div>

              {col && (
                <div className="bg-[var(--z-surface-2)] rounded-xl border border-[var(--z-border)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-[var(--z-text)] font-mono">{col.name}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${TYPE_COLORS[col.type]}22`, color: TYPE_COLORS[col.type] }}>{col.type}</span>
                  </div>
                  <p className="text-[10px] text-[var(--z-text-3)] mb-2">
                    {col.type === "numeric" ? "Distribution (simulated from column statistics)" : "Frequency (simulated from cardinality)"}
                  </p>
                  <ResponsiveContainer width="100%" height={140}>
                    {col.type === "numeric" ? (
                      <BarChart data={makeHistogramData()}>
                        <XAxis dataKey="bin" tick={{ fontSize: 9, fill: "var(--z-text-3)" }} />
                        <YAxis tick={{ fontSize: 9, fill: "var(--z-text-3)" }} />
                        <Tooltip contentStyle={{ background: "var(--z-surface)", border: "1px solid var(--z-border)", borderRadius: 8, fontSize: 10 }} />
                        <Bar dataKey="count" fill="var(--z-accent)" radius={[2, 2, 0, 0]} opacity={0.8} />
                      </BarChart>
                    ) : (
                      <BarChart data={makeFreqData(col.cardinality ?? 5)} layout="vertical" margin={{ right: 10, left: 50 }}>
                        <XAxis type="number" tick={{ fontSize: 9, fill: "var(--z-text-3)" }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: "var(--z-text-3)" }} width={45} />
                        <Tooltip contentStyle={{ background: "var(--z-surface)", border: "1px solid var(--z-border)", borderRadius: 8, fontSize: 10 }} />
                        <Bar dataKey="count" fill="#8B5CF6" radius={[0, 2, 2, 0]} opacity={0.8} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { label: "Null count",  value: col.null_count ?? "—" },
                      { label: "Cardinality", value: col.cardinality ?? "—" },
                      { label: "Is target",   value: col.is_target ? "Yes" : "No" },
                    ].map(s => (
                      <div key={s.label} className="bg-[var(--z-surface)] rounded-lg p-2 border border-[var(--z-border)]">
                        <p className="text-[9px] text-[var(--z-text-3)]">{s.label}</p>
                        <p className="text-xs font-bold text-[var(--z-text)]">{String(s.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── NULL ANALYSIS ── */}
          {tab === "nulls" && (
            <>
              <div className="bg-[var(--z-surface-2)] rounded-xl border border-[var(--z-border)] p-4">
                <p className="text-xs font-semibold text-[var(--z-text-2)] mb-3">Missing Values per Column</p>
                <div className="space-y-2">
                  {columnMeta.map(c => {
                    const pct = Math.min(1, (c.null_count ?? 0) / Math.max(rowCount, 1));
                    return (
                      <div key={c.name} className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[var(--z-text)] w-28 truncate">{c.name}</span>
                        <div className="flex-1 h-2 bg-[var(--z-border)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${pct * 100}%`,
                            background: pct > 0.2 ? "var(--z-danger)" : pct > 0.05 ? "var(--z-warn)" : "var(--z-success)",
                          }} />
                        </div>
                        <span className="text-[10px] text-[var(--z-text-3)] w-10 text-right">
                          {pct > 0 ? `${(pct * 100).toFixed(1)}%` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-[var(--z-surface-2)] rounded-xl border border-[var(--z-border)] p-4 space-y-1.5">
                <p className="text-xs font-semibold text-[var(--z-text-2)] mb-2">Legend</p>
                {[
                  { c: "var(--z-success)", l: "< 5% — Good" },
                  { c: "var(--z-warn)",    l: "5–20% — Imputation recommended" },
                  { c: "var(--z-danger)",  l: "> 20% — High missingness, review data" },
                ].map(({ c, l }) => (
                  <div key={l} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background: c }} />
                    <span className="text-[10px] text-[var(--z-text-2)]">{l}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── COLUMN INFO ── */}
          {tab === "info" && (
            <div className="rounded-xl border border-[var(--z-border)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--z-surface-2)] border-b border-[var(--z-border)]">
                      {["#","Column","Type","Nulls","Cardinality","Target"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-[var(--z-text-3)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {columnMeta.map((c, i) => (
                      <tr key={c.name} className={`border-b border-[var(--z-border-2)] hover:bg-[var(--z-surface-2)] ${i%2===0?"bg-[var(--z-surface)]":"bg-[var(--z-surface-2)]/50"}`}>
                        <td className="px-3 py-2 text-[var(--z-text-3)]">{i+1}</td>
                        <td className="px-3 py-2 font-mono font-medium text-[var(--z-text)]">{c.name}</td>
                        <td className="px-3 py-2">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${TYPE_COLORS[c.type]}22`, color: TYPE_COLORS[c.type] }}>{c.type}</span>
                        </td>
                        <td className="px-3 py-2 text-[var(--z-text-2)]">{c.null_count ?? "—"}</td>
                        <td className="px-3 py-2 text-[var(--z-text-2)]">{c.cardinality ?? "—"}</td>
                        <td className="px-3 py-2">{c.is_target && <span className="text-[10px] bg-[var(--z-accent)] text-white px-1.5 py-0.5 rounded-full font-semibold">TARGET</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
