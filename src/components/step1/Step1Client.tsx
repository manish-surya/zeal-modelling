"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Project, Dataset, ColumnMeta, ColumnType } from "@/types";
import FileUploader from "./FileUploader";
import ColumnTypeTable from "./ColumnTypeTable";
import { formatBytes, formatNumber } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface Step1ClientProps {
  project: Project;
  existingDataset: Dataset | null;
  userId: string;
}

export default function Step1Client({ project, existingDataset, userId }: Step1ClientProps) {
  const router = useRouter();
  const [dataset, setDataset] = useState<Dataset | null>(existingDataset);
  const [columns, setColumns] = useState<ColumnMeta[]>(existingDataset?.column_meta ?? []);
  const [targetColumn, setTargetColumn] = useState<string | null>(existingDataset?.target_column ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUploaded = useCallback(
    async (file: File, storagePath: string) => {
      setError(null);
      setUploading(true);

      // Parse CSV headers and do basic type detection
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const rows = lines.slice(1, 51).map((l) => l.split(",").map((v) => v.trim().replace(/^"|"$/g, "")));

      const detectedColumns: ColumnMeta[] = headers.map((name, colIdx) => {
        const values = rows.map((r) => r[colIdx]).filter((v) => v !== "" && v !== null && v !== undefined);
        let detectedType: ColumnType = "text";

        const nameL = name.toLowerCase();
        if (nameL.includes("id") || nameL.includes("uuid") || nameL.includes("index")) {
          detectedType = "id";
        } else if (values.every((v) => !isNaN(Number(v)))) {
          detectedType = "numeric";
        } else if (values.every((v) => ["true","false","yes","no","0","1"].includes(v.toLowerCase()))) {
          detectedType = "boolean";
        } else if (new Set(values).size < Math.min(50, values.length * 0.5)) {
          detectedType = "categorical";
        } else {
          const dateTest = values.slice(0, 5).filter((v) => !isNaN(Date.parse(v)));
          if (dateTest.length >= 3) detectedType = "datetime";
          else detectedType = "text";
        }

        // Auto-suggest target
        const isTarget = ["target","label","y","class","output"].includes(nameL);

        return {
          name,
          type: detectedType,
          detected_type: detectedType,
          override_type: null,
          is_target: isTarget,
          cardinality: new Set(values).size,
          null_count: rows.length - values.length,
        };
      });

      // Auto-select target if only one candidate
      const targetCandidates = detectedColumns.filter((c) => c.is_target);
      const autoTarget = targetCandidates.length === 1
        ? targetCandidates[0].name
        : detectedColumns[detectedColumns.length - 1]?.name ?? null;

      const rowCount = lines.length - 1;
      const supabase = createClient();

      // Save dataset record — insert or update existing dataset for this project
      const { data: newDataset, error: dbError } = await supabase
        .from("datasets")
        .upsert({
          project_id: project.id,
          storage_path: storagePath,
          file_name: file.name,
          file_size_bytes: file.size,
          row_count: rowCount,
          column_count: headers.length,
          column_meta: detectedColumns,
          target_column: autoTarget,
        })
        .select()
        .single();

      if (dbError) {
        setError(dbError.message);
      } else {
        setDataset(newDataset as Dataset);
        setColumns(detectedColumns);
        setTargetColumn(autoTarget);
      }
      setUploading(false);
    },
    [project.id]
  );

  const handleColumnTypeChange = (name: string, newType: ColumnType) => {
    setColumns((prev) =>
      prev.map((c) => c.name === name ? { ...c, type: newType, override_type: newType } : c)
    );
  };

  const handleSaveAndProceed = async () => {
    if (!dataset || !targetColumn) return;
    setSaving(true);
    const supabase = createClient();

    // Update column meta with overrides and target
    const updatedMeta = columns.map((c) => ({
      ...c,
      is_target: c.name === targetColumn,
    }));

    await supabase.from("datasets").update({
      column_meta: updatedMeta,
      target_column: targetColumn,
    }).eq("id", dataset.id);

    // Determine problem type
    const targetCol = updatedMeta.find((c) => c.name === targetColumn);
    const problemType = targetCol?.type === "categorical" || targetCol?.type === "boolean"
      ? "classification"
      : "regression";

    await supabase.from("projects").update({
      current_step: Math.max(project.current_step, 2),
      problem_type: problemType,
      status: "in_progress",
    }).eq("id", project.id);

    router.push(`/project?id=${project.id}&step=2`);
  };

  const isComplete =
    !!dataset &&
    columns.length > 0 &&
    !!targetColumn &&
    !columns.some((c) => c.type === "id" && c.is_target);

  const selectableAsTarget = columns.filter(
    (c) => c.type === "numeric" || c.type === "categorical" || c.type === "boolean"
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Step header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1B3A5C] text-white text-xs font-bold">1</span>
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Data Input</h2>
        </div>
        <p className="text-sm text-[#666666]">Upload your dataset, review detected column types, and select your target variable.</p>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg border border-[#CCCCCC] shadow-sm p-6 mb-6">
        <h3 className="font-semibold text-[#1A1A1A] mb-4">Upload Dataset</h3>
        <FileUploader
          projectId={project.id}
          userId={userId}
          onUploaded={handleFileUploaded}
          existingFile={dataset?.file_name ?? null}
          uploading={uploading}
        />
        {error && (
          <div className="mt-3 p-3 rounded-md bg-[#FFEBEE] text-sm text-[#C0392B]">{error}</div>
        )}
      </div>

      {/* Column type table */}
      {dataset && columns.length > 0 && (
        <div className="bg-white rounded-lg border border-[#CCCCCC] shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#1A1A1A]">Detected Columns</h3>
            <span className="text-sm text-[#666666]">
              {formatNumber(dataset.row_count ?? 0)} rows · {dataset.column_count} columns
              {dataset.file_size_bytes ? ` · ${formatBytes(dataset.file_size_bytes)}` : ""}
            </span>
          </div>
          <ColumnTypeTable
            columns={columns}
            onTypeChange={handleColumnTypeChange}
          />
        </div>
      )}

      {/* Target variable selector */}
      {dataset && selectableAsTarget.length > 0 && (
        <div className="bg-white rounded-lg border border-[#CCCCCC] shadow-sm p-6 mb-8">
          <h3 className="font-semibold text-[#1A1A1A] mb-1">Target Variable</h3>
          <p className="text-sm text-[#666666] mb-4">
            Select the column you want to predict. Categorical → Classification. Numeric → Regression.
          </p>
          <div className="max-w-xs">
            <Label htmlFor="targetSelect">Target column</Label>
            <select
              id="targetSelect"
              value={targetColumn ?? ""}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="mt-1.5 flex h-9 w-full rounded-md border border-[#CCCCCC] bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-[#2E75B6]"
            >
              <option value="">Select target column...</option>
              {selectableAsTarget.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>
          {targetColumn && (
            <p className="mt-2 text-sm text-[#2E75B6]">
              Problem type:{" "}
              <strong>
                {columns.find((c) => c.name === targetColumn)?.type === "categorical" ||
                columns.find((c) => c.name === targetColumn)?.type === "boolean"
                  ? "Classification"
                  : "Regression"}
              </strong>
            </p>
          )}
        </div>
      )}

      {/* Proceed button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveAndProceed}
          disabled={!isComplete}
          loading={saving}
          size="lg"
        >
          Proceed to Feature Engineering
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
