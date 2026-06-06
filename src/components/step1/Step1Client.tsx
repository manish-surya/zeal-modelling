"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Project, Dataset, ColumnMeta, ColumnType } from "@/types";
import FileUploader from "./FileUploader";
import { ArrowRight, Table2, BarChart3, Eye, LayoutDashboard, ChevronDown } from "lucide-react";

interface Step1ClientProps {
  project: Project;
  existingDataset: Dataset | null;
  userId: string;
}

// ── Stat helpers ──────────────────────────────────────────────────────────────
function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
function fmt(n: number, d = 4) {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1e6) return n.toExponential(2);
  return n.toFixed(d).replace(/\.?0+$/, "");
}
function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

interface ColProfile {
  name: string;
  type: ColumnType;
  detected_type: ColumnType;
  override_type: ColumnType | null;
  is_target: boolean;
  nonNull: number;
  nullCount: number;
  nullPct: number;
  cardinality: number;
  // numeric
  mean?: number; std?: number; min?: number; q25?: number;
  median?: number; q75?: number; max?: number; sum?: number;
  // categorical
  topValues?: Array<{ v: string; n: number }>;
}

interface Profile {
  rowCount: number;
  colCount: number;
  totalNulls: number;
  fileSizeBytes: number;
  fileName: string;
  cols: ColProfile[];
  preview: string[][];   // first 10 rows raw
  headers: string[];
}

function buildProfile(
  fileName: string,
  fileSize: number,
  rawText: string,
  existingTypes?: Record<string, ColumnType>
): Profile {
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  const dataRows = lines.slice(1).map(l => l.split(",").map(v => v.replace(/^"|"$/g, "").trim()));
  const rowCount = dataRows.length;

  const preview = dataRows.slice(0, 10);

  const cols: ColProfile[] = headers.map((name, ci) => {
    const raw = dataRows.map(r => r[ci] ?? "");
    const nonNullVals = raw.filter(v => v !== "" && v !== "null" && v !== "NULL" && v !== "NA" && v !== "N/A");
    const nullCount = raw.length - nonNullVals.length;
    const cardinality = new Set(nonNullVals).size;

    // Detect type
    const nameL = name.toLowerCase();
    let detected: ColumnType = "text";
    if (nameL.includes("id") || nameL.includes("uuid") || nameL.includes("index")) {
      detected = "id";
    } else if (nonNullVals.every(v => !isNaN(Number(v)) && v !== "")) {
      detected = "numeric";
    } else if (nonNullVals.every(v => ["true","false","yes","no","0","1"].includes(v.toLowerCase()))) {
      detected = "boolean";
    } else if (cardinality < Math.min(50, nonNullVals.length * 0.4 + 1)) {
      detected = "categorical";
    } else {
      const dateHits = nonNullVals.slice(0, 10).filter(v => !isNaN(Date.parse(v)));
      detected = dateHits.length >= 5 ? "datetime" : "text";
    }

    const type = existingTypes?.[name] ?? detected;
    const isTarget = ["target","label","y","class","output","price","churn","survived"].includes(nameL);

    const col: ColProfile = {
      name, type, detected_type: detected,
      override_type: existingTypes?.[name] ?? null,
      is_target: isTarget,
      nonNull: nonNullVals.length, nullCount,
      nullPct: raw.length ? nullCount / raw.length : 0,
      cardinality,
    };

    if (type === "numeric") {
      const nums = nonNullVals.map(Number).filter(n => !isNaN(n)).sort((a,b)=>a-b);
      if (nums.length) {
        const mean = nums.reduce((s,v)=>s+v,0)/nums.length;
        const variance = nums.reduce((s,v)=>s+(v-mean)**2,0)/nums.length;
        col.mean = mean; col.std = Math.sqrt(variance);
        col.min = nums[0]; col.max = nums[nums.length-1];
        col.q25 = percentile(nums,25); col.median = percentile(nums,50); col.q75 = percentile(nums,75);
        col.sum = nums.reduce((s,v)=>s+v,0);
      }
    } else if (type === "categorical" || type === "boolean") {
      const freq: Record<string,number> = {};
      nonNullVals.forEach(v => { freq[v] = (freq[v]??0)+1; });
      col.topValues = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([v,n])=>({v,n}));
    }
    return col;
  });

  return {
    rowCount, colCount: headers.length,
    totalNulls: cols.reduce((s,c)=>s+c.nullCount,0),
    fileSizeBytes: fileSize, fileName, cols, preview, headers,
  };
}

// ── Type badge ──────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<ColumnType, string> = {
  numeric:     "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  categorical: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  boolean:     "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  datetime:    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  text:        "bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300",
  id:          "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
};
const TYPE_LABELS: Record<ColumnType,string> = {
  numeric:"Numeric", categorical:"Categorical", boolean:"Boolean",
  datetime:"Datetime", text:"Text", id:"ID",
};
const ALL_TYPES: ColumnType[] = ["numeric","categorical","boolean","datetime","text","id"];

function TypeBadge({ type }: { type: ColumnType }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${TYPE_COLORS[type]}`}>
      {TYPE_LABELS[type]}
    </span>
  );
}

function TypeSelect({ value, onChange }: { value: ColumnType; onChange: (t: ColumnType) => void }) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={e => onChange(e.target.value as ColumnType)}
        className={`appearance-none pr-6 pl-2 py-0.5 rounded text-[11px] font-semibold border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--z-accent)] ${TYPE_COLORS[value]}`}
        style={{ background: "transparent" }}
      >
        {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
      </select>
      <ChevronDown className="absolute right-1 top-1 w-3 h-3 pointer-events-none opacity-60" />
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
type Tab = "overview" | "columns" | "statistics" | "preview";
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview",   label: "Overview",   icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { id: "columns",    label: "Columns",    icon: <Table2 className="w-3.5 h-3.5" /> },
  { id: "statistics", label: "Statistics", icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { id: "preview",    label: "Preview",    icon: <Eye className="w-3.5 h-3.5" /> },
];

function fmtBytes(b: number) {
  if (b < 1024) return b + " B";
  if (b < 1024**2) return (b/1024).toFixed(1) + " KB";
  return (b/1024**2).toFixed(1) + " MB";
}
function fmtN(n: number) { return n.toLocaleString(); }

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ profile }: { profile: Profile }) {
  const typeCounts: Partial<Record<ColumnType,number>> = {};
  profile.cols.forEach(c => { typeCounts[c.type] = (typeCounts[c.type]??0)+1; });

  const cards = [
    { label: "Rows", value: fmtN(profile.rowCount), color: "text-[var(--z-accent)]" },
    { label: "Columns", value: fmtN(profile.colCount), color: "text-purple-500 dark:text-purple-400" },
    { label: "Missing Values", value: fmtN(profile.totalNulls), color: profile.totalNulls > 0 ? "text-amber-500" : "text-green-500" },
    { label: "File Size", value: fmtBytes(profile.fileSizeBytes), color: "text-[var(--z-text-2)]" },
  ];

  const nullPct = profile.rowCount * profile.colCount > 0
    ? profile.totalNulls / (profile.rowCount * profile.colCount) : 0;

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-[var(--z-surface-2)] rounded-xl p-4 border border-[var(--z-border)]">
            <p className="text-[11px] uppercase tracking-wider text-[var(--z-text-3)] font-semibold mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Data completeness */}
      <div className="bg-[var(--z-surface-2)] rounded-xl p-4 border border-[var(--z-border)]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[var(--z-text-2)]">Data Completeness</p>
          <p className="text-xs text-[var(--z-text-2)]">{fmtPct(1 - nullPct)} complete</p>
        </div>
        <div className="h-2 rounded-full bg-[var(--z-border)] overflow-hidden">
          <div className="h-full rounded-full bg-[var(--z-success)] transition-all" style={{ width: fmtPct(1 - nullPct) }} />
        </div>
      </div>

      {/* Column types */}
      <div className="bg-[var(--z-surface-2)] rounded-xl p-4 border border-[var(--z-border)]">
        <p className="text-xs font-semibold text-[var(--z-text-2)] mb-3">Column Types</p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(typeCounts) as [ColumnType, number][]).map(([type, count]) => (
            <div key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${TYPE_COLORS[type]}`}>
              <span>{TYPE_LABELS[type]}</span>
              <span className="opacity-60">·</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-column null summary */}
      {profile.cols.filter(c => c.nullCount > 0).length > 0 && (
        <div className="bg-[var(--z-surface-2)] rounded-xl p-4 border border-[var(--z-border)]">
          <p className="text-xs font-semibold text-[var(--z-text-2)] mb-3">Columns with Missing Values</p>
          <div className="space-y-2">
            {profile.cols.filter(c => c.nullCount > 0).map(c => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="text-xs text-[var(--z-text)] w-32 truncate">{c.name}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[var(--z-border)]">
                  <div className="h-full rounded-full bg-amber-400 dark:bg-amber-500"
                    style={{ width: fmtPct(c.nullPct) }} />
                </div>
                <span className="text-[11px] text-[var(--z-text-3)] w-12 text-right">{fmtPct(c.nullPct)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Columns Tab ───────────────────────────────────────────────────────────────
function ColumnsTab({ profile, onTypeChange }: { profile: Profile; onTypeChange: (name: string, t: ColumnType) => void }) {
  return (
    <div className="rounded-xl border border-[var(--z-border)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--z-surface-2)] border-b border-[var(--z-border)]">
              {["#","Column","Type","Non-Null","Nulls","Null %","Cardinality"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-[var(--z-text-3)] uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profile.cols.map((col, i) => (
              <tr key={col.name} className={`border-b border-[var(--z-border-2)] hover:bg-[var(--z-surface-2)] transition-colors ${i % 2 === 0 ? "bg-[var(--z-surface)]" : "bg-[var(--z-surface-2)]/50"}`}>
                <td className="px-4 py-2.5 text-[var(--z-text-3)]">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium text-[var(--z-text)] font-mono">{col.name}</td>
                <td className="px-4 py-2.5">
                  <TypeSelect value={col.type} onChange={t => onTypeChange(col.name, t)} />
                </td>
                <td className="px-4 py-2.5 text-[var(--z-text)]">{fmtN(col.nonNull)}</td>
                <td className="px-4 py-2.5">
                  <span className={col.nullCount > 0 ? "text-amber-500 dark:text-amber-400 font-medium" : "text-[var(--z-text-3)]"}>
                    {fmtN(col.nullCount)}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {col.nullPct > 0 ? (
                    <span className="text-amber-500 dark:text-amber-400">{fmtPct(col.nullPct)}</span>
                  ) : (
                    <span className="text-[var(--z-success)] dark:text-green-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-[var(--z-text-2)]">{fmtN(col.cardinality)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Statistics Tab (.describe()) ──────────────────────────────────────────────
function StatisticsTab({ profile }: { profile: Profile }) {
  const numCols = profile.cols.filter(c => c.type === "numeric");
  const catCols = profile.cols.filter(c => c.type === "categorical" || c.type === "boolean");

  return (
    <div className="space-y-5">
      {numCols.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--z-text-2)] mb-2 uppercase tracking-wider">Numeric Columns — .describe()</p>
          <div className="rounded-xl border border-[var(--z-border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--z-surface-2)] border-b border-[var(--z-border)]">
                    {["Column","Count","Mean","Std","Min","25%","50%","75%","Max"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-[var(--z-text-3)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {numCols.map((col, i) => (
                    <tr key={col.name} className={`border-b border-[var(--z-border-2)] hover:bg-[var(--z-surface-2)] transition-colors ${i%2===0?"bg-[var(--z-surface)]":"bg-[var(--z-surface-2)]/50"}`}>
                      <td className="px-4 py-2.5 font-mono font-medium text-[var(--z-text)]">{col.name}</td>
                      <td className="px-4 py-2.5 text-[var(--z-text)]">{fmtN(col.nonNull)}</td>
                      <td className="px-4 py-2.5 text-[var(--z-accent)]">{fmt(col.mean??0)}</td>
                      <td className="px-4 py-2.5 text-[var(--z-text-2)]">{fmt(col.std??0)}</td>
                      <td className="px-4 py-2.5 text-[var(--z-text)]">{fmt(col.min??0)}</td>
                      <td className="px-4 py-2.5 text-[var(--z-text-2)]">{fmt(col.q25??0)}</td>
                      <td className="px-4 py-2.5 font-medium text-[var(--z-text)]">{fmt(col.median??0)}</td>
                      <td className="px-4 py-2.5 text-[var(--z-text-2)]">{fmt(col.q75??0)}</td>
                      <td className="px-4 py-2.5 text-[var(--z-text)]">{fmt(col.max??0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {catCols.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[var(--z-text-2)] mb-2 uppercase tracking-wider">Categorical / Boolean — Top Values</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catCols.map(col => (
              <div key={col.name} className="bg-[var(--z-surface-2)] rounded-xl border border-[var(--z-border)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono text-xs font-semibold text-[var(--z-text)]">{col.name}</p>
                  <TypeBadge type={col.type} />
                </div>
                <div className="space-y-1.5">
                  {(col.topValues ?? []).map(({ v, n }) => {
                    const pct = col.nonNull ? n / col.nonNull : 0;
                    return (
                      <div key={v} className="flex items-center gap-2">
                        <span className="text-[11px] text-[var(--z-text)] w-24 truncate">{v || "(empty)"}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--z-border)]">
                          <div className="h-full rounded-full bg-[var(--z-accent)] opacity-70" style={{ width: fmtPct(pct) }} />
                        </div>
                        <span className="text-[11px] text-[var(--z-text-3)] w-8 text-right">{n}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {numCols.length === 0 && catCols.length === 0 && (
        <p className="text-sm text-[var(--z-text-3)] text-center py-12">No numeric or categorical columns detected.</p>
      )}
    </div>
  );
}

// ── Preview Tab ───────────────────────────────────────────────────────────────
function PreviewTab({ profile }: { profile: Profile }) {
  return (
    <div className="rounded-xl border border-[var(--z-border)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--z-surface-2)] border-b border-[var(--z-border)]">
              <th className="px-3 py-3 text-left font-semibold text-[var(--z-text-3)] w-10">#</th>
              {profile.headers.map(h => (
                <th key={h} className="px-3 py-3 text-left font-semibold text-[var(--z-text-3)] font-mono whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profile.preview.map((row, ri) => (
              <tr key={ri} className={`border-b border-[var(--z-border-2)] hover:bg-[var(--z-surface-2)] transition-colors ${ri%2===0?"bg-[var(--z-surface)]":"bg-[var(--z-surface-2)]/50"}`}>
                <td className="px-3 py-2 text-[var(--z-text-3)]">{ri + 1}</td>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-[var(--z-text)] font-mono max-w-[160px] truncate">
                    {cell === "" ? <span className="text-[var(--z-text-3)] italic">null</span> : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-[var(--z-surface-2)] border-t border-[var(--z-border)]">
        <p className="text-[11px] text-[var(--z-text-3)]">Showing first {profile.preview.length} of {fmtN(profile.rowCount)} rows</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Step1Client({ project, existingDataset, userId }: Step1ClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [targetColumn, setTargetColumn] = useState<string | null>(existingDataset?.target_column ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string>("");
  const [rawFile, setRawFile] = useState<File | null>(null);

  const handleFileUploaded = useCallback(async (file: File, path: string) => {
    setError(null);
    setStoragePath(path);
    setRawFile(file);
    const text = await file.text();
    const p = buildProfile(file.name, file.size, text);
    setProfile(p);
    // Auto-select target
    const candidate = p.cols.find(c => c.is_target) ?? p.cols[p.cols.length - 1];
    if (candidate) setTargetColumn(candidate.name);
    setActiveTab("overview");
  }, []);

  const handleTypeChange = (name: string, type: ColumnType) => {
    if (!profile) return;
    setProfile(prev => {
      if (!prev) return prev;
      const cols = prev.cols.map(c => {
        if (c.name !== name) return c;
        const updated = { ...c, type, override_type: type };
        // Recompute stats if type changed to/from numeric
        return updated;
      });
      return { ...prev, cols };
    });
  };

  const handleSave = async () => {
    if (!profile || !targetColumn) return;
    setSaving(true);
    const supabase = createClient();

    const columnMeta: ColumnMeta[] = profile.cols.map(c => ({
      name: c.name,
      type: c.type,
      detected_type: c.detected_type,
      override_type: c.override_type,
      is_target: c.name === targetColumn,
      cardinality: c.cardinality,
      null_count: c.nullCount,
    }));

    const { data: ds, error: dbErr } = await supabase
      .from("datasets")
      .upsert({
        project_id: project.id,
        storage_path: storagePath,
        file_name: profile.fileName,
        file_size_bytes: profile.fileSizeBytes,
        row_count: profile.rowCount,
        column_count: profile.colCount,
        column_meta: columnMeta,
        target_column: targetColumn,
      })
      .select().single();

    if (dbErr) { setError(dbErr.message); setSaving(false); return; }

    const targetCol = profile.cols.find(c => c.name === targetColumn);
    const problemType = targetCol?.type === "categorical" || targetCol?.type === "boolean"
      ? "classification" : "regression";

    await supabase.from("projects").update({
      current_step: Math.max(project.current_step, 2),
      problem_type: problemType,
      status: "in_progress",
    }).eq("id", project.id);

    router.push(`/project?id=${project.id}&step=2`);
  };

  const selectableTargets = profile?.cols.filter(c => c.type !== "id" && c.type !== "text") ?? [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--z-accent)] text-white text-xs font-bold">1</span>
          <h2 className="text-lg font-semibold text-[var(--z-text)]">Data Input</h2>
        </div>
        <p className="text-sm text-[var(--z-text-2)]">Upload your dataset and review the automatically detected schema.</p>
      </div>

      {/* File uploader */}
      <div className="bg-[var(--z-surface)] rounded-xl border border-[var(--z-border)] shadow-sm p-6 mb-6">
        <FileUploader
          projectId={project.id}
          userId={userId}
          onUploaded={handleFileUploaded}
          existingFile={existingDataset?.file_name ?? null}
          uploading={false}
        />
        {error && <p className="mt-3 text-sm text-[var(--z-danger)] bg-[var(--z-danger-bg)] px-3 py-2 rounded-lg">{error}</p>}
      </div>

      {/* Data profiler */}
      {profile && (
        <>
          {/* File info bar */}
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="flex items-center gap-2 text-sm text-[var(--z-text-2)]">
              <span className="font-medium text-[var(--z-text)]">{profile.fileName}</span>
              <span>·</span>
              <span>{fmtN(profile.rowCount)} rows</span>
              <span>·</span>
              <span>{profile.colCount} columns</span>
              <span>·</span>
              <span>{fmtBytes(profile.fileSizeBytes)}</span>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mb-4 bg-[var(--z-surface-2)] rounded-xl p-1 border border-[var(--z-border)] w-fit">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === t.id
                    ? "bg-[var(--z-surface)] text-[var(--z-text)] shadow-sm border border-[var(--z-border)]"
                    : "text-[var(--z-text-2)] hover:text-[var(--z-text)] hover:bg-[var(--z-surface)]"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="mb-6">
            {activeTab === "overview"   && <OverviewTab profile={profile} />}
            {activeTab === "columns"    && <ColumnsTab profile={profile} onTypeChange={handleTypeChange} />}
            {activeTab === "statistics" && <StatisticsTab profile={profile} />}
            {activeTab === "preview"    && <PreviewTab profile={profile} />}
          </div>

          {/* Target variable */}
          <div className="bg-[var(--z-surface)] rounded-xl border border-[var(--z-border)] shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-[var(--z-text)] mb-1">Target Variable</h3>
            <p className="text-sm text-[var(--z-text-2)] mb-4">
              Select the column you want to predict. Categorical / Boolean → Classification &nbsp;·&nbsp; Numeric → Regression.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {selectableTargets.map(col => (
                <button
                  key={col.name}
                  onClick={() => setTargetColumn(col.name)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    targetColumn === col.name
                      ? "border-[var(--z-accent)] bg-[var(--z-accent-bg)]"
                      : "border-[var(--z-border)] hover:border-[var(--z-accent)]/50 bg-[var(--z-surface-2)]"
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium font-mono ${targetColumn===col.name?"text-[var(--z-accent)]":"text-[var(--z-text)]"}`}>
                      {col.name}
                    </p>
                    <p className="text-[11px] text-[var(--z-text-3)] mt-0.5">
                      {fmtN(col.cardinality)} unique · {fmtN(col.nonNull)} non-null
                    </p>
                  </div>
                  <TypeBadge type={col.type} />
                </button>
              ))}
            </div>
            {targetColumn && (
              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--z-success)]" />
                <p className="text-sm text-[var(--z-text-2)]">
                  Target: <strong className="text-[var(--z-text)] font-mono">{targetColumn}</strong>
                  <span className="ml-2 text-[var(--z-accent)]">
                    → {profile.cols.find(c=>c.name===targetColumn)?.type === "categorical" || profile.cols.find(c=>c.name===targetColumn)?.type === "boolean" ? "Classification" : "Regression"}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!targetColumn} loading={saving} size="lg"
              className="bg-[var(--z-accent)] hover:bg-[var(--z-accent-h)] text-white">
              Proceed to Feature Engineering
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
