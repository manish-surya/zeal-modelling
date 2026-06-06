"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Project } from "@/types";
import { X } from "lucide-react";

interface Props {
  userId: string;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export default function NewProjectModal({ userId, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Project name is required."); return; }
    setLoading(true); setError(null);

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        name: name.trim(),
        model_type: "ml_supervised",   // default; auto-refined after data upload
        current_step: 1,
        status: "draft",
      })
      .select().single();

    if (err) { setError(err.message); setLoading(false); }
    else onCreated(data as Project);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--z-surface)] rounded-2xl border border-[var(--z-border)] shadow-2xl p-6 w-full max-w-md">
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--z-text-3)] hover:text-[var(--z-text)] transition-colors">
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-base font-semibold text-[var(--z-text)] mb-1">New Project</h2>
        <p className="text-sm text-[var(--z-text-2)] mb-5">Name your project and get started — the model type is determined automatically from your data.</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--z-danger-bg)] text-sm text-[var(--z-danger)]">{error}</div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="projectName" className="text-[var(--z-text-2)]">
              Project name <span className="text-[var(--z-danger)]">*</span>
            </Label>
            <Input
              id="projectName"
              placeholder="e.g. Customer Churn Prediction"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus required
              className="bg-[var(--z-surface-2)] border-[var(--z-border)] text-[var(--z-text)] placeholder:text-[var(--z-text-3)]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-[var(--z-text-2)]">
              Description <span className="text-[var(--z-text-3)] font-normal">(optional)</span>
            </Label>
            <textarea
              id="description"
              placeholder="What are you trying to predict? Any context about the dataset..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[var(--z-border)] bg-[var(--z-surface-2)] text-sm text-[var(--z-text)] placeholder:text-[var(--z-text-3)] focus:outline-none focus:ring-1 focus:ring-[var(--z-accent)] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-[var(--z-border)] text-[var(--z-text-2)] hover:bg-[var(--z-surface-2)]">
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1 bg-[var(--z-accent)] hover:bg-[var(--z-accent-h)] text-white border-0">
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
