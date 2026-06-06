"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Project, Dataset, Pipeline, PipelineBlock, PipelineTemplate, BlockType } from "@/types";
import { ArrowRight, Plus, Trash2, Eye, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import BlockConfigPanel from "./BlockConfigPanel";
import { PIPELINE_TEMPLATES } from "./pipelineTemplates";
import { BLOCK_DEFINITIONS } from "./blockDefinitions";

interface Step2ClientProps {
  project: Project;
  dataset: Dataset | null;
  existingPipeline: Pipeline | null;
}

export default function Step2Client({ project, dataset, existingPipeline }: Step2ClientProps) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<PipelineBlock[]>(existingPipeline?.config ?? []);
  const [selectedBlock, setSelectedBlock] = useState<PipelineBlock | null>(null);
  const [template, setTemplate] = useState<PipelineTemplate | null>(existingPipeline?.template ?? null);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const columns = dataset?.column_meta ?? [];

  const applyTemplate = (t: PipelineTemplate) => {
    if (t === "blank") {
      setBlocks([]);
      setTemplate("blank");
      return;
    }
    const templateBlocks = PIPELINE_TEMPLATES[t](columns).map((b) => ({
      ...b,
      id: uuidv4(),
    }));
    setBlocks(templateBlocks);
    setTemplate(t);
    setSelectedBlock(null);
  };

  const addBlock = (blockType: BlockType) => {
    const def = BLOCK_DEFINITIONS[blockType];
    const newBlock: PipelineBlock = {
      id: uuidv4(),
      block_type: blockType,
      params: { ...def.defaultParams },
      column_targets: [],
      label: def.label,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlock(newBlock);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlock?.id === id) setSelectedBlock(null);
  };

  const updateBlock = (id: string, updates: Partial<PipelineBlock>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    if (selectedBlock?.id === id) {
      setSelectedBlock((prev) => prev ? { ...prev, ...updates } : null);
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...blocks];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setBlocks(reordered);
    setDragIndex(index);
  };

  const handleSaveAndProceed = async () => {
    setSaving(true);
    const supabase = createClient();

    const pipelineData = {
      project_id: project.id,
      version: (existingPipeline?.version ?? 0) + 1,
      config: blocks,
      template,
      is_active: true,
    };

    if (existingPipeline) {
      await supabase.from("pipelines").update(pipelineData).eq("id", existingPipeline.id);
    } else {
      await supabase.from("pipelines").insert(pipelineData);
    }

    await supabase.from("projects").update({
      current_step: Math.max(project.current_step, 3),
      status: "in_progress",
    }).eq("id", project.id);

    router.push(`/project?id=${project.id}&step=3`);
  };

  const BLOCK_CATEGORIES = [
    { label: "Numeric", blocks: ["imputer","scaler","polynomial_features","log_transform","binning","outlier_removal"] as BlockType[] },
    { label: "Categorical", blocks: ["one_hot_encoder","label_encoder","ordinal_encoder","frequency_encoder","categorical_imputer"] as BlockType[] },
    { label: "Column", blocks: ["drop_columns","select_features","rename_column","datetime_extractor","text_vectoriser","correlation_filter","variance_filter"] as BlockType[] },
  ];

  const [addMenuOpen, setAddMenuOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-104px)]">
      {/* Left panel: Column list */}
      <div className="w-[280px] flex-shrink-0 border-r border-[#CCCCCC] bg-white overflow-y-auto">
        <div className="p-4 border-b border-[#EEEEEE]">
          <h3 className="font-semibold text-sm text-[#1A1A1A]">Columns</h3>
          <p className="text-xs text-[#666666] mt-0.5">{dataset?.file_name ?? "No dataset"}</p>
        </div>
        <div className="p-3 space-y-1">
          {columns.map((col) => (
            <div
              key={col.name}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[#F8F9FA] cursor-default"
            >
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                col.type === "numeric" ? "bg-[#D6E4F0] text-[#2E75B6]" :
                col.type === "categorical" ? "bg-[#E8F5E9] text-[#4CAF50]" :
                col.type === "boolean" ? "bg-[#FFF3E0] text-[#E67E22]" :
                col.type === "datetime" ? "bg-[#F3E5F5] text-[#9C27B0]" :
                col.type === "id" ? "bg-[#FFEBEE] text-[#C0392B]" :
                "bg-[#EEEEEE] text-[#666666]"
              }`}>
                {col.type.slice(0,3).toUpperCase()}
              </span>
              <span className="text-sm text-[#1A1A1A] truncate">{col.name}</span>
              {col.is_target && (
                <span className="ml-auto text-[9px] bg-[#1B3A5C] text-white px-1 rounded">TARGET</span>
              )}
            </div>
          ))}
          {columns.length === 0 && (
            <p className="text-xs text-[#666666] text-center py-8">No columns detected</p>
          )}
        </div>
      </div>

      {/* Centre: Pipeline canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#CCCCCC] bg-white">
          {/* Template selector */}
          <select
            value={template ?? ""}
            onChange={(e) => applyTemplate(e.target.value as PipelineTemplate)}
            className="h-8 rounded-md border border-[#CCCCCC] bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#2E75B6]"
          >
            <option value="">Select template...</option>
            <option value="classification">Classification (Standard)</option>
            <option value="regression">Regression (Standard)</option>
            <option value="time_series">Time Series</option>
            <option value="nlp">NLP Classification</option>
            <option value="blank">Blank (Custom)</option>
          </select>

          {/* Add block */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddMenuOpen(!addMenuOpen)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Block
            </Button>
            {addMenuOpen && (
              <div className="absolute left-0 top-9 z-20 bg-white border border-[#CCCCCC] rounded-lg shadow-lg p-2 w-56" onMouseLeave={() => setAddMenuOpen(false)}>
                {BLOCK_CATEGORIES.map((cat) => (
                  <div key={cat.label} className="mb-2">
                    <p className="text-[10px] font-semibold text-[#666666] px-2 py-1 uppercase">{cat.label}</p>
                    {cat.blocks.map((bt) => (
                      <button
                        key={bt}
                        className="flex w-full items-center px-2 py-1.5 text-sm text-[#1A1A1A] rounded hover:bg-[#F8F9FA]"
                        onClick={() => { addBlock(bt); setAddMenuOpen(false); }}
                      >
                        {BLOCK_DEFINITIONS[bt].label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {blocks.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setBlocks([]); setSelectedBlock(null); }} className="text-[#C0392B] hover:text-[#C0392B]">
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </Button>
          )}

          <div className="ml-auto">
            <Button size="sm" onClick={handleSaveAndProceed} loading={saving}>
              Save & Proceed to Modelling
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 border-2 border-dashed border-[#CCCCCC] rounded-lg flex items-center justify-center mb-4">
                <Plus className="w-6 h-6 text-[#CCCCCC]" />
              </div>
              <p className="text-sm font-medium text-[#1A1A1A] mb-1">No transformation blocks</p>
              <p className="text-xs text-[#666666]">Select a template or add blocks manually above</p>
            </div>
          ) : (
            blocks.map((block, index) => {
              const def = BLOCK_DEFINITIONS[block.block_type];
              const isSelected = selectedBlock?.id === block.id;
              const isCollapsed = collapsed.has(block.id);

              return (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={() => setDragIndex(null)}
                  onClick={() => setSelectedBlock(block)}
                  className={`rounded-lg border overflow-hidden cursor-pointer transition-all ${
                    isSelected
                      ? "border-[#2E75B6] shadow-md border-l-4 border-l-[#2E75B6]"
                      : "border-[#CCCCCC] hover:border-[#2E75B6]/50"
                  }`}
                >
                  {/* Title bar */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#1B3A5C]">
                    <GripVertical className="w-4 h-4 text-white/40 drag-handle flex-shrink-0" />
                    <span className="text-sm font-semibold text-white flex-1">{def.label}</span>
                    {block.column_targets.length > 0 && (
                      <span className="text-[10px] text-white/60">
                        {block.column_targets.length} col{block.column_targets.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCollapse(block.id); }}
                      className="text-white/60 hover:text-white"
                    >
                      {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                      className="text-white/60 hover:text-[#C0392B]/90 hover:bg-white/10 rounded p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Block body */}
                  {!isCollapsed && (
                    <div className="p-3 bg-white">
                      <p className="text-xs text-[#666666]">{def.description}</p>
                      {Object.keys(block.params).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(block.params).slice(0, 3).map(([k, v]) => (
                            <span key={k} className="text-[10px] bg-[#F8F9FA] border border-[#EEEEEE] rounded px-1.5 py-0.5 text-[#666666]">
                              {k}: <strong>{String(v)}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom bar */}
        <div className="px-4 py-3 border-t border-[#CCCCCC] bg-white flex items-center justify-between">
          <p className="text-sm text-[#666666]">
            {blocks.length} block{blocks.length !== 1 ? "s" : ""} in pipeline
          </p>
          <Button onClick={handleSaveAndProceed} loading={saving}>
            Proceed to Modelling
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Right panel: Config */}
      <div className="w-[320px] flex-shrink-0 border-l border-[#CCCCCC] bg-white overflow-y-auto">
        {selectedBlock ? (
          <BlockConfigPanel
            block={selectedBlock}
            columns={columns}
            onUpdate={(updates) => updateBlock(selectedBlock.id, updates)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Eye className="w-8 h-8 text-[#CCCCCC] mb-3" />
            <p className="text-sm font-medium text-[#1A1A1A] mb-1">No block selected</p>
            <p className="text-xs text-[#666666]">Click a block to configure its parameters</p>
          </div>
        )}
      </div>
    </div>
  );
}
