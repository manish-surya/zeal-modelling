"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2, Copy, Pencil, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Project, ProjectStatus } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

const STEP_LABELS = ["Data Input", "Feature Eng.", "Modelling", "Evaluation", "Export"];

function StatusBadge({ status }: { status: ProjectStatus }) {
  const variantMap: Record<ProjectStatus, "draft" | "in_progress" | "completed" | "exported"> = {
    draft: "draft",
    in_progress: "in_progress",
    completed: "completed",
    exported: "exported",
  };
  const labelMap: Record<ProjectStatus, string> = {
    draft: "Draft",
    in_progress: "In Progress",
    completed: "Completed",
    exported: "Exported",
  };
  return <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>;
}

export default function ProjectCard({
  project,
  onDeleted,
}: {
  project: Project;
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(project.name);
  const [saving, setSaving] = useState(false);

  const navigateToProject = () => {
    router.push(`/project/${project.id}/step${project.current_step}`);
  };

  const handleRename = async () => {
    if (!name.trim() || name === project.name) {
      setRenaming(false);
      setName(project.name);
      return;
    }
    setSaving(true);
    const supabase = createClient();
    await supabase.from("projects").update({ name: name.trim() }).eq("id", project.id);
    setSaving(false);
    setRenaming(false);
    project.name = name.trim();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    const supabase = createClient();
    await supabase.from("projects").delete().eq("id", project.id);
    onDeleted(project.id);
  };

  const dataset = project.datasets?.[0];

  return (
    <div
      className="bg-white rounded-lg border border-[#CCCCCC] shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
      onClick={navigateToProject}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          {renaming ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") { setRenaming(false); setName(project.name); }
              }}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-[#1A1A1A] text-sm border-b border-[#2E75B6] outline-none bg-transparent flex-1"
              disabled={saving}
            />
          ) : (
            <h3 className="font-semibold text-[#1A1A1A] text-sm truncate flex-1">
              {project.name}
            </h3>
          )}

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded hover:bg-[#F8F9FA] text-[#666666] hover:text-[#1A1A1A]"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-10 bg-white border border-[#CCCCCC] rounded-lg shadow-md py-1 min-w-[140px]">
                <button
                  onClick={() => { setRenaming(true); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#1A1A1A] hover:bg-[#F8F9FA]"
                >
                  <Pencil className="w-3.5 h-3.5" /> Rename
                </button>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#1A1A1A] hover:bg-[#F8F9FA]"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
                {project.status === "exported" && (
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#1A1A1A] hover:bg-[#F8F9FA]"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                )}
                <hr className="my-1 border-[#EEEEEE]" />
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#C0392B] hover:bg-[#FFEBEE]"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 mb-4">
          <StatusBadge status={project.status} />
          <span className="text-xs text-[#666666]">
            {project.model_type === "ml_supervised" ? "ML Supervised" : "Deep Learning"}
          </span>
        </div>

        {/* Dataset */}
        {dataset && (
          <p className="text-xs text-[#666666] mb-4 truncate">
            📁 {dataset.file_name}
          </p>
        )}

        {/* Step progress dots */}
        <div className="flex items-center gap-2">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < project.current_step;
            const isActive = stepNum === project.current_step;
            return (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold
                    ${isCompleted ? "bg-[#4CAF50] text-white" :
                      isActive ? "bg-[#2E75B6] text-white" :
                      "bg-[#EEEEEE] text-[#666666]"}`}
                  title={label}
                >
                  {isCompleted ? "✓" : stepNum}
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`flex-1 h-0.5 w-3 ${isCompleted ? "bg-[#4CAF50]" : "bg-[#EEEEEE]"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#EEEEEE]">
        <p className="text-xs text-[#666666]">
          Updated {formatRelativeTime(project.updated_at)}
        </p>
      </div>
    </div>
  );
}
