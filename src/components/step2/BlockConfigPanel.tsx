"use client";

import { PipelineBlock, ColumnMeta } from "@/types";
import { BLOCK_DEFINITIONS } from "./blockDefinitions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "lucide-react";

interface BlockConfigPanelProps {
  block: PipelineBlock;
  columns: ColumnMeta[];
  onUpdate: (updates: Partial<PipelineBlock>) => void;
}

export default function BlockConfigPanel({ block, columns, onUpdate }: BlockConfigPanelProps) {
  const def = BLOCK_DEFINITIONS[block.block_type];

  const updateParam = (key: string, value: unknown) => {
    onUpdate({ params: { ...block.params, [key]: value } });
  };

  const toggleColumn = (colName: string) => {
    const current = block.column_targets;
    const next = current.includes(colName)
      ? current.filter((c) => c !== colName)
      : [...current, colName];
    onUpdate({ column_targets: next });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#EEEEEE]">
        <h3 className="font-semibold text-sm text-[#1A1A1A]">{def.label}</h3>
        <p className="text-xs text-[#666666] mt-0.5">{def.description}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Column targets */}
        <div>
          <Label className="text-xs font-semibold text-[#666666] uppercase mb-2 block">
            Target Columns
          </Label>
          <div className="space-y-1 max-h-48 overflow-y-auto border border-[#EEEEEE] rounded-md p-2">
            {columns.filter((c) => !c.is_target).map((col) => (
              <label
                key={col.name}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#F8F9FA] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={block.column_targets.includes(col.name)}
                  onChange={() => toggleColumn(col.name)}
                  className="rounded border-[#CCCCCC] text-[#2E75B6]"
                />
                <span className="text-sm text-[#1A1A1A]">{col.name}</span>
                <span className="ml-auto text-[10px] text-[#666666]">{col.type}</span>
              </label>
            ))}
            {columns.filter((c) => !c.is_target).length === 0 && (
              <p className="text-xs text-[#666666] py-2 text-center">No columns available</p>
            )}
          </div>
          <button
            onClick={() => onUpdate({ column_targets: columns.filter((c) => !c.is_target).map((c) => c.name) })}
            className="mt-1 text-xs text-[#2E75B6] hover:underline"
          >
            Select all
          </button>
          {" · "}
          <button
            onClick={() => onUpdate({ column_targets: [] })}
            className="text-xs text-[#666666] hover:underline"
          >
            Clear
          </button>
        </div>

        {/* Parameters */}
        {def.paramSchema.length > 0 && (
          <div>
            <Label className="text-xs font-semibold text-[#666666] uppercase mb-2 block">
              Parameters
            </Label>
            <div className="space-y-4">
              {def.paramSchema.map((param) => (
                <div key={param.key} className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <Label className="text-sm">{param.label}</Label>
                    {param.help && (
                      <div className="group relative">
                        <Info className="w-3.5 h-3.5 text-[#666666]" />
                        <div className="absolute left-4 top-0 z-10 hidden group-hover:block bg-[#1A1A1A] text-white text-xs rounded px-2 py-1 w-48 shadow-lg">
                          {param.help}
                        </div>
                      </div>
                    )}
                  </div>

                  {param.type === "select" && (
                    <Select
                      value={String(block.params[param.key] ?? "")}
                      onValueChange={(v) => updateParam(param.key, v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {param.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {param.type === "number" && (
                    <Input
                      type="number"
                      value={String(block.params[param.key] ?? param.min ?? 0)}
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      onChange={(e) => updateParam(param.key, Number(e.target.value))}
                    />
                  )}

                  {param.type === "boolean" && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={Boolean(block.params[param.key])}
                        onCheckedChange={(checked) => updateParam(param.key, checked)}
                      />
                      <span className="text-sm text-[#666666]">
                        {Boolean(block.params[param.key]) ? "On" : "Off"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
