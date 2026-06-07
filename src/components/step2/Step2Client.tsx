"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Project, Dataset, Pipeline, PipelineBlock, PipelineTemplate, BlockType, ParamTuning } from "@/types";
import { ArrowRight, Plus, Trash2, ChevronUp, ChevronDown, GripVertical, LayoutList, GitBranch, X, Settings2, Sliders } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { BLOCK_DEFINITIONS, BLOCK_CATEGORIES, CATEGORY_META, BlockDefinition } from "./blockDefinitions";
import { buildTemplate, TEMPLATE_CATEGORIES } from "./pipelineTemplates";

interface Step2ClientProps {
  project: Project;
  dataset: Dataset | null;
  existingPipeline: Pipeline | null;
}

// ── Arrow components ──────────────────────────────────────────────────────────
function DownArrow() {
  return (
    <div className="flex flex-col items-center py-1 select-none">
      <div className="w-px h-4 bg-[var(--z-accent)] opacity-40" />
      <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid var(--z-accent)", opacity: 0.4 }} />
    </div>
  );
}
function RightArrow() {
  return (
    <div className="flex items-center px-1 select-none">
      <div className="h-px w-8 bg-[var(--z-accent)] opacity-40" />
      <div style={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "8px solid var(--z-accent)", opacity: 0.4 }} />
    </div>
  );
}

// ── Block header colour by category ─────────────────────────────────────────
function blockHeaderClass(def: BlockDefinition) {
  return def.color;
}

// ── Detailed block card ───────────────────────────────────────────────────────
function DetailedCard({
  block, index, total, isSelected,
  onSelect, onRemove, onMoveUp, onMoveDown,
}: {
  block: PipelineBlock; index: number; total: number; isSelected: boolean;
  onSelect: () => void; onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const def = BLOCK_DEFINITIONS[block.block_type];
  const cat = CATEGORY_META[def.category];
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? "border-[var(--z-accent)] shadow-lg ring-2 ring-[var(--z-accent)]/20"
          : "border-[var(--z-border)] hover:border-[var(--z-accent)]/50"
      }`}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2.5 ${blockHeaderClass(def)}`}>
        <span className="text-base">{def.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white leading-tight">{def.label}</p>
          <p className="text-[10px] text-white/60 leading-tight">{cat.label}</p>
        </div>
        {block.column_targets.length > 0 && (
          <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full">{block.column_targets.length} cols</span>
        )}
        {/* Order controls */}
        <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
          <button disabled={index === 0} onClick={onMoveUp}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
            <ChevronUp className="w-3 h-3" />
          </button>
          <button disabled={index === total - 1} onClick={onMoveDown}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
            <ChevronDown className="w-3 h-3" />
          </button>
          <button onClick={() => setCollapsed(c => !c)}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-all">
            {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
          <button onClick={onRemove}
            className="p-1 rounded text-white/60 hover:text-red-300 hover:bg-white/10 transition-all">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 py-3 bg-[var(--z-surface)]">
          <p className="text-xs text-[var(--z-text-2)] mb-2">{def.description}</p>
          {/* Key params */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(block.params).slice(0, 4).map(([k, v]) => (
              <span key={k} className="text-[10px] bg-[var(--z-surface-2)] border border-[var(--z-border)] rounded-md px-2 py-0.5 text-[var(--z-text-2)]">
                <span className="text-[var(--z-text-3)]">{k}:</span> <strong>{String(v)}</strong>
              </span>
            ))}
          </div>
          {/* Tuning indicators */}
          {block.tuning && Object.keys(block.tuning).length > 0 && (
            <div className="mt-2 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-[var(--z-accent)]" />
              <span className="text-[10px] text-[var(--z-accent)]">{Object.keys(block.tuning).length} param(s) set for tuning</span>
            </div>
          )}
          {/* Column targets */}
          {block.column_targets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {block.column_targets.slice(0, 6).map(c => (
                <span key={c} className="text-[10px] font-mono bg-[var(--z-accent-bg)] text-[var(--z-accent)] px-1.5 py-0.5 rounded">{c}</span>
              ))}
              {block.column_targets.length > 6 && (
                <span className="text-[10px] text-[var(--z-text-3)]">+{block.column_targets.length - 6} more</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Compact flow card ─────────────────────────────────────────────────────────
function FlowCard({ block, isSelected, onSelect, onRemove }: {
  block: PipelineBlock; isSelected: boolean; onSelect: () => void; onRemove: () => void;
}) {
  const def = BLOCK_DEFINITIONS[block.block_type];
  const keyParam = def.keyParam ? block.params[def.keyParam] : null;

  return (
    <div onClick={onSelect}
      className={`flex-shrink-0 w-44 rounded-xl border overflow-hidden cursor-pointer transition-all ${
        isSelected ? "border-[var(--z-accent)] shadow-lg ring-2 ring-[var(--z-accent)]/20" : "border-[var(--z-border)] hover:border-[var(--z-accent)]/50"
      }`}
    >
      <div className={`px-3 py-2 ${blockHeaderClass(def)} flex items-center justify-between`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm">{def.icon}</span>
          <span className="text-xs font-bold text-white truncate">{def.label}</span>
        </div>
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          className="text-white/50 hover:text-white ml-1 flex-shrink-0"><X className="w-3 h-3" /></button>
      </div>
      <div className="px-3 py-2 bg-[var(--z-surface)]">
        {keyParam != null && (
          <p className="text-[11px] text-[var(--z-text-2)] truncate">
            <span className="text-[var(--z-text-3)]">{def.keyParam}:</span> <strong>{String(keyParam)}</strong>
          </p>
        )}
        {block.column_targets.length > 0 && (
          <p className="text-[10px] text-[var(--z-text-3)] mt-0.5">{block.column_targets.length} column{block.column_targets.length !== 1 ? "s" : ""}</p>
        )}
        {block.tuning && Object.keys(block.tuning).length > 0 && (
          <p className="text-[10px] text-[var(--z-accent)] mt-0.5 flex items-center gap-0.5">
            <Sliders className="w-2.5 h-2.5" /> tuning
          </p>
        )}
      </div>
    </div>
  );
}

// ── Block Config Panel (right panel) ─────────────────────────────────────────
function BlockConfigPanel({ block, columns, onUpdate, onClose }: {
  block: PipelineBlock;
  columns: { name: string; type: string }[];
  onUpdate: (u: Partial<PipelineBlock>) => void;
  onClose: () => void;
}) {
  const def = BLOCK_DEFINITIONS[block.block_type];
  const [showTuning, setShowTuning] = useState<string | null>(null);

  const setParam = (k: string, v: unknown) =>
    onUpdate({ params: { ...block.params, [k]: v } });

  const setTuning = (k: string, t: ParamTuning | null) => {
    const next = { ...(block.tuning ?? {}) };
    if (t === null) delete next[k]; else next[k] = t;
    onUpdate({ tuning: next });
  };

  const toggleColumnTarget = (col: string) => {
    const targets = block.column_targets.includes(col)
      ? block.column_targets.filter(c => c !== col)
      : [...block.column_targets, col];
    onUpdate({ column_targets: targets });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${blockHeaderClass(def)}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{def.icon}</span>
          <div>
            <p className="text-xs font-bold text-white">{def.label}</p>
            <p className="text-[10px] text-white/60">{CATEGORY_META[def.category].label}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Description */}
        <p className="text-xs text-[var(--z-text-2)]">{def.description}</p>

        {/* Hyperparameters */}
        {def.paramSchema.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-[var(--z-text-3)] uppercase tracking-wider mb-2">Hyperparameters</p>
            <div className="space-y-3">
              {def.paramSchema.filter(p => p.type !== "multiselect_columns").map(param => (
                <div key={param.key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[var(--z-text)]">{param.label}</label>
                    {param.tunable && (
                      <button
                        onClick={() => setShowTuning(showTuning === param.key ? null : param.key)}
                        className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-all ${
                          block.tuning?.[param.key]
                            ? "bg-[var(--z-accent)] text-white"
                            : "border border-[var(--z-border)] text-[var(--z-text-3)] hover:border-[var(--z-accent)] hover:text-[var(--z-accent)]"
                        }`}
                      >
                        <Sliders className="w-2.5 h-2.5" /> Tune
                      </button>
                    )}
                  </div>
                  {param.help && <p className="text-[10px] text-[var(--z-text-3)] mb-1">{param.help}</p>}

                  {param.type === "select" && (
                    <select
                      value={String(block.params[param.key] ?? "")}
                      onChange={e => setParam(param.key, e.target.value)}
                      className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--z-border)] bg-[var(--z-surface-2)] text-[var(--z-text)] focus:outline-none focus:ring-1 focus:ring-[var(--z-accent)]"
                    >
                      {param.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )}
                  {param.type === "number" && (
                    <input type="number"
                      value={String(block.params[param.key] ?? param.min ?? 0)}
                      min={param.min} max={param.max} step={param.step}
                      onChange={e => setParam(param.key, Number(e.target.value))}
                      className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--z-border)] bg-[var(--z-surface-2)] text-[var(--z-text)] focus:outline-none focus:ring-1 focus:ring-[var(--z-accent)]"
                    />
                  )}
                  {param.type === "boolean" && (
                    <button
                      onClick={() => setParam(param.key, !block.params[param.key])}
                      className={`relative w-9 h-5 rounded-full transition-all ${block.params[param.key] ? "bg-[var(--z-accent)]" : "bg-[var(--z-border)]"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${block.params[param.key] ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  )}
                  {param.type === "text" && (
                    <input type="text"
                      value={String(block.params[param.key] ?? "")}
                      onChange={e => setParam(param.key, e.target.value)}
                      className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--z-border)] bg-[var(--z-surface-2)] text-[var(--z-text)] focus:outline-none focus:ring-1 focus:ring-[var(--z-accent)]"
                    />
                  )}

                  {/* Tuning panel */}
                  {param.tunable && showTuning === param.key && (
                    <div className="mt-2 p-3 rounded-lg border border-[var(--z-accent)]/30 bg-[var(--z-accent-bg)] space-y-2">
                      <p className="text-[10px] font-semibold text-[var(--z-accent)]">Hyperparameter Tuning Range</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: "range", label: "Range (min → max)" },
                          { key: "values", label: "Specific Values" },
                        ].map(opt => (
                          <button key={opt.key}
                            onClick={() => setTuning(param.key, opt.key === "range"
                              ? { type: "range", min: Number(param.min ?? 0), max: Number(param.max ?? 10), step: param.step }
                              : { type: "values", values: [block.params[param.key]] }
                            )}
                            className={`text-[10px] py-1 rounded border transition-all ${
                              block.tuning?.[param.key]?.type === opt.key
                                ? "border-[var(--z-accent)] bg-[var(--z-accent)] text-white"
                                : "border-[var(--z-accent)]/40 text-[var(--z-accent)] hover:bg-[var(--z-accent)]/10"
                            }`}
                          >{opt.label}</button>
                        ))}
                      </div>

                      {block.tuning?.[param.key]?.type === "range" && (() => {
                        const t = block.tuning![param.key] as Extract<ParamTuning, {type:"range"}>;
                        return (
                          <div className="grid grid-cols-3 gap-1">
                            {(["min","max","step"] as const).map(k => (
                              <div key={k}>
                                <p className="text-[9px] text-[var(--z-text-3)] mb-0.5 capitalize">{k}</p>
                                <input type="number" value={t[k] ?? ""} step={k === "step" ? 0.01 : 1}
                                  onChange={e => setTuning(param.key, { ...t, [k]: Number(e.target.value) })}
                                  className="w-full h-6 px-1 text-[10px] rounded border border-[var(--z-border)] bg-[var(--z-surface)] text-[var(--z-text)] focus:outline-none" />
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {block.tuning?.[param.key]?.type === "values" && (() => {
                        const t = block.tuning![param.key] as Extract<ParamTuning, {type:"values"}>;
                        return (
                          <div>
                            <p className="text-[9px] text-[var(--z-text-3)] mb-0.5">Values (comma-separated)</p>
                            <input type="text"
                              value={t.values.join(",")}
                              onChange={e => setTuning(param.key, { type: "values", values: e.target.value.split(",").map(v => isNaN(Number(v)) ? v.trim() : Number(v.trim())) })}
                              placeholder="e.g. 1,5,10,20"
                              className="w-full h-7 px-2 text-[10px] rounded border border-[var(--z-border)] bg-[var(--z-surface)] text-[var(--z-text)] focus:outline-none"
                            />
                          </div>
                        );
                      })()}

                      <button onClick={() => { setTuning(param.key, null); setShowTuning(null); }}
                        className="text-[10px] text-[var(--z-text-3)] hover:text-[var(--z-danger)] transition-colors">
                        Remove tuning
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Column targets */}
        {columns.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-[var(--z-text-3)] uppercase tracking-wider mb-2">Apply to Columns</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {columns.map(col => {
                const active = block.column_targets.includes(col.name);
                return (
                  <button key={col.name} onClick={() => toggleColumnTarget(col.name)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                      active
                        ? "bg-[var(--z-accent-bg)] border border-[var(--z-accent)]/40 text-[var(--z-accent)]"
                        : "border border-[var(--z-border)] text-[var(--z-text-2)] hover:border-[var(--z-accent)]/30"
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-sm border flex-shrink-0 ${active ? "bg-[var(--z-accent)] border-[var(--z-accent)]" : "border-[var(--z-border)]"}`}
                      style={{ backgroundImage: active ? "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1.5 5l3 3 4-4' stroke='white' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")" : "none" }} />
                    <span className="font-mono truncate">{col.name}</span>
                    <span className={`ml-auto text-[9px] px-1 py-0.5 rounded ${
                      col.type === "numeric"     ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" :
                      col.type === "categorical" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300" :
                      "bg-gray-100 text-gray-500 dark:bg-gray-700/40 dark:text-gray-300"
                    }`}>{col.type.slice(0,3).toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => onUpdate({ column_targets: columns.map(c => c.name) })}
                className="text-[10px] text-[var(--z-accent)] hover:underline">Select all</button>
              <button onClick={() => onUpdate({ column_targets: [] })}
                className="text-[10px] text-[var(--z-text-3)] hover:text-[var(--z-text)] hover:underline">Clear</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Template Modal ─────────────────────────────────────────────────────────────
function TemplateModal({ onApply, onClose }: {
  onApply: (t: PipelineTemplate) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--z-surface)] rounded-2xl border border-[var(--z-border)] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--z-border)]">
          <h2 className="font-semibold text-[var(--z-text)]">Pipeline Templates</h2>
          <button onClick={onClose} className="text-[var(--z-text-3)] hover:text-[var(--z-text)]"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-6">
          {TEMPLATE_CATEGORIES.map(cat => (
            <div key={cat.name}>
              <p className="text-[10px] font-semibold text-[var(--z-text-3)] uppercase tracking-wider mb-3">{cat.name}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cat.templates.map(t => (
                  <button key={t.id} onClick={() => { onApply(t.id); onClose(); }}
                    className="text-left p-4 rounded-xl border border-[var(--z-border)] hover:border-[var(--z-accent)] hover:bg-[var(--z-accent-bg)] transition-all group">
                    <p className="text-sm font-semibold text-[var(--z-text)] group-hover:text-[var(--z-accent)] mb-1">{t.name}</p>
                    <p className="text-xs text-[var(--z-text-2)]">{t.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.tags.map(tag => (
                        <span key={tag} className="text-[10px] bg-[var(--z-surface-2)] border border-[var(--z-border)] text-[var(--z-text-3)] px-1.5 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Add Block Menu ────────────────────────────────────────────────────────────
function AddBlockMenu({ onAdd, onClose }: {
  onAdd: (bt: BlockType) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();
  const filtered = BLOCK_CATEGORIES.map(cat => ({
    ...cat,
    blocks: cat.blocks.filter(bt =>
      !q || BLOCK_DEFINITIONS[bt].label.toLowerCase().includes(q) ||
      BLOCK_DEFINITIONS[bt].description.toLowerCase().includes(q)
    ),
  })).filter(cat => cat.blocks.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--z-surface)] rounded-2xl border border-[var(--z-border)] shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-4 pt-4 pb-3 border-b border-[var(--z-border)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-[var(--z-text)]">Add Block</h2>
            <button onClick={onClose} className="text-[var(--z-text-3)] hover:text-[var(--z-text)]"><X className="w-4 h-4" /></button>
          </div>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search blocks…"
            className="w-full h-8 px-3 text-xs rounded-lg border border-[var(--z-border)] bg-[var(--z-surface-2)] text-[var(--z-text)] focus:outline-none focus:ring-1 focus:ring-[var(--z-accent)] placeholder:text-[var(--z-text-3)]"
          />
        </div>
        <div className="overflow-y-auto p-3 space-y-4">
          {filtered.map(cat => {
            const meta = CATEGORY_META[cat.category];
            return (
              <div key={cat.category}>
                <p className="text-[10px] font-semibold text-[var(--z-text-3)] uppercase tracking-wider px-2 mb-1">
                  {meta.icon} {meta.label}
                </p>
                <div className="space-y-0.5">
                  {cat.blocks.map(bt => {
                    const def = BLOCK_DEFINITIONS[bt];
                    return (
                      <button key={bt} onClick={() => { onAdd(bt); onClose(); }}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--z-surface-2)] transition-all group text-left">
                        <span className="text-base mt-0.5">{def.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--z-text)] group-hover:text-[var(--z-accent)]">{def.label}</p>
                          <p className="text-[10px] text-[var(--z-text-3)] leading-tight">{def.description.slice(0, 70)}{def.description.length > 70 ? "…" : ""}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-center text-[var(--z-text-3)] py-8">No blocks match "{search}"</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Step2Client ──────────────────────────────────────────────────────────
type ViewMode = "detailed" | "flow";

export default function Step2Client({ project, dataset, existingPipeline }: Step2ClientProps) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<PipelineBlock[]>(existingPipeline?.config ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("detailed");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const columns = (dataset?.column_meta ?? []).filter(c => !c.is_target);
  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null;

  const addBlock = useCallback((bt: BlockType) => {
    const def = BLOCK_DEFINITIONS[bt];
    const nb: PipelineBlock = { id: uuidv4(), block_type: bt, params: { ...def.defaultParams }, column_targets: [], label: def.label };
    setBlocks(prev => [...prev, nb]);
    setSelectedId(nb.id);
  }, []);

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateBlock = (id: string, updates: Partial<PipelineBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const ni = index + dir;
    if (ni < 0 || ni >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[ni]] = [next[ni], next[index]];
    setBlocks(next);
  };

  const applyTemplate = (t: PipelineTemplate) => {
    setBlocks(buildTemplate(t, dataset?.column_meta ?? []));
    setSelectedId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const payload = { project_id: project.id, version: (existingPipeline?.version ?? 0) + 1, config: blocks, template: null, is_active: true };
    if (existingPipeline) await supabase.from("pipelines").update(payload).eq("id", existingPipeline.id);
    else await supabase.from("pipelines").insert(payload);
    await supabase.from("projects").update({ current_step: Math.max(project.current_step, 3), status: "in_progress" }).eq("id", project.id);
    router.push(`/project?id=${project.id}&step=3`);
  };

  return (
    <div className="flex h-[calc(100vh-104px)] bg-[var(--z-app)]">

      {/* ── Left: Columns sidebar ── */}
      <div className="w-56 flex-shrink-0 border-r border-[var(--z-border)] bg-[var(--z-surface)] flex flex-col">
        <div className="px-4 py-3 border-b border-[var(--z-border)]">
          <p className="text-xs font-semibold text-[var(--z-text)]">Dataset Columns</p>
          <p className="text-[10px] text-[var(--z-text-3)] mt-0.5 truncate">{dataset?.file_name ?? "No dataset"}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {(dataset?.column_meta ?? []).map(col => (
            <div key={col.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--z-surface-2)] cursor-default">
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${
                col.type === "numeric"     ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" :
                col.type === "categorical" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300" :
                col.type === "boolean"     ? "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300" :
                col.type === "datetime"    ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300" :
                col.type === "id"          ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300" :
                "bg-gray-100 text-gray-500 dark:bg-gray-700/40 dark:text-gray-300"
              }`}>{col.type.slice(0,3).toUpperCase()}</span>
              <span className="text-xs text-[var(--z-text)] truncate font-mono">{col.name}</span>
              {col.is_target && <span className="ml-auto text-[8px] bg-[var(--z-accent)] text-white px-1 rounded">TGT</span>}
            </div>
          ))}
          {columns.length === 0 && <p className="text-xs text-[var(--z-text-3)] text-center py-8">No columns</p>}
        </div>
      </div>

      {/* ── Centre: Pipeline canvas ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--z-border)] bg-[var(--z-surface)] flex-wrap">
          {/* View toggle */}
          <div className="flex bg-[var(--z-surface-2)] rounded-lg p-0.5 border border-[var(--z-border)]">
            {([["detailed","Detailed",<LayoutList className="w-3.5 h-3.5" />],
               ["flow","Flow",<GitBranch className="w-3.5 h-3.5" />]] as const).map(([mode, label, icon]) => (
              <button key={mode} onClick={() => setViewMode(mode as ViewMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === mode
                    ? "bg-[var(--z-surface)] text-[var(--z-text)] shadow-sm border border-[var(--z-border)]"
                    : "text-[var(--z-text-2)] hover:text-[var(--z-text)]"
                }`}>
                {icon} {label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-[var(--z-border)]" />

          <button onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--z-border)] text-xs text-[var(--z-text-2)] hover:border-[var(--z-accent)] hover:text-[var(--z-accent)] bg-[var(--z-surface)] transition-all">
            <Settings2 className="w-3.5 h-3.5" /> Templates
          </button>

          <button onClick={() => setShowAddMenu(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--z-accent)] text-white text-xs font-medium hover:bg-[var(--z-accent-h)] transition-all">
            <Plus className="w-3.5 h-3.5" /> Add Block
          </button>

          {blocks.length > 0 && (
            <button onClick={() => { setBlocks([]); setSelectedId(null); }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-[var(--z-danger)] hover:bg-[var(--z-danger-bg)] transition-all">
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          )}

          <div className="ml-auto">
            <Button size="sm" onClick={handleSave} loading={saving}
              className="bg-[var(--z-accent)] hover:bg-[var(--z-accent-h)] text-white border-0">
              Proceed to Modelling <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className={`flex-1 overflow-auto p-6 ${viewMode === "flow" ? "overflow-x-auto" : ""}`}>
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 border-2 border-dashed border-[var(--z-border)] rounded-2xl flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-[var(--z-text-3)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--z-text)] mb-1">Pipeline is empty</p>
              <p className="text-xs text-[var(--z-text-2)] mb-4">Start with a template or add blocks manually</p>
              <div className="flex gap-2">
                <button onClick={() => setShowTemplateModal(true)}
                  className="px-4 py-2 rounded-lg border border-[var(--z-border)] text-xs text-[var(--z-text-2)] hover:border-[var(--z-accent)] hover:text-[var(--z-accent)] transition-all">
                  Choose Template
                </button>
                <button onClick={() => setShowAddMenu(true)}
                  className="px-4 py-2 rounded-lg bg-[var(--z-accent)] text-white text-xs font-medium hover:bg-[var(--z-accent-h)] transition-all">
                  Add First Block
                </button>
              </div>
            </div>
          ) : viewMode === "detailed" ? (
            /* ── DETAILED VIEW (top-down) ── */
            <div className="max-w-2xl mx-auto space-y-0">
              {/* Input node */}
              <div className="flex items-center justify-center">
                <div className="px-4 py-2 rounded-full bg-[var(--z-surface)] border-2 border-[var(--z-accent)] text-xs font-semibold text-[var(--z-accent)]">
                  📂 Raw Dataset ({dataset?.row_count?.toLocaleString() ?? "?"} rows)
                </div>
              </div>
              {blocks.map((block, i) => (
                <div key={block.id}>
                  <DownArrow />
                  <DetailedCard
                    block={block} index={i} total={blocks.length}
                    isSelected={selectedId === block.id}
                    onSelect={() => setSelectedId(selectedId === block.id ? null : block.id)}
                    onRemove={() => removeBlock(block.id)}
                    onMoveUp={() => moveBlock(i, -1)}
                    onMoveDown={() => moveBlock(i, 1)}
                  />
                </div>
              ))}
              <DownArrow />
              {/* Output node */}
              <div className="flex items-center justify-center">
                <div className="px-4 py-2 rounded-full bg-[var(--z-success-bg)] border-2 border-[var(--z-success)] text-xs font-semibold text-[var(--z-success)]">
                  ✅ Transformed Dataset → Model Training
                </div>
              </div>
            </div>
          ) : (
            /* ── FLOW VIEW (left-right) ── */
            <div className="flex items-center min-w-max py-8">
              {/* Input node */}
              <div className="flex-shrink-0 px-3 py-2 rounded-xl bg-[var(--z-surface)] border-2 border-[var(--z-accent)] text-center">
                <p className="text-[10px] font-bold text-[var(--z-accent)]">📂 INPUT</p>
                <p className="text-[9px] text-[var(--z-text-3)]">{dataset?.row_count?.toLocaleString() ?? "?"} rows</p>
              </div>
              {blocks.map((block) => (
                <div key={block.id} className="flex items-center">
                  <RightArrow />
                  <FlowCard
                    block={block}
                    isSelected={selectedId === block.id}
                    onSelect={() => setSelectedId(selectedId === block.id ? null : block.id)}
                    onRemove={() => removeBlock(block.id)}
                  />
                </div>
              ))}
              <RightArrow />
              {/* Output node */}
              <div className="flex-shrink-0 px-3 py-2 rounded-xl bg-[var(--z-success-bg)] border-2 border-[var(--z-success)] text-center">
                <p className="text-[10px] font-bold text-[var(--z-success)]">✅ OUTPUT</p>
                <p className="text-[9px] text-[var(--z-text-3)]">Ready for training</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="px-4 py-2.5 border-t border-[var(--z-border)] bg-[var(--z-surface)] flex items-center justify-between">
          <p className="text-xs text-[var(--z-text-2)]">
            {blocks.length} block{blocks.length !== 1 ? "s" : ""} in pipeline
            {blocks.filter(b => b.tuning && Object.keys(b.tuning).length > 0).length > 0 && (
              <span className="ml-2 text-[var(--z-accent)]">· {blocks.filter(b => b.tuning && Object.keys(b.tuning).length > 0).length} with tuning</span>
            )}
          </p>
          <Button size="sm" onClick={handleSave} loading={saving}
            className="bg-[var(--z-accent)] hover:bg-[var(--z-accent-h)] text-white border-0">
            Proceed to Modelling <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Right: Config panel ── */}
      <div className={`border-l border-[var(--z-border)] bg-[var(--z-surface)] overflow-hidden transition-all duration-200 ${selectedBlock ? "w-80 flex-shrink-0" : "w-0"}`}>
        {selectedBlock && (
          <BlockConfigPanel
            block={selectedBlock}
            columns={columns}
            onUpdate={u => updateBlock(selectedBlock.id, u)}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* Modals */}
      {showAddMenu      && <AddBlockMenu onAdd={addBlock} onClose={() => setShowAddMenu(false)} />}
      {showTemplateModal && <TemplateModal onApply={applyTemplate} onClose={() => setShowTemplateModal(false)} />}
    </div>
  );
}
