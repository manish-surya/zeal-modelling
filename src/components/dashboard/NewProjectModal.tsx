"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Project, ModelType } from "@/types";
import { X, Brain, Network } from "lucide-react";

interface NewProjectModalProps {
  userId: string;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export default function NewProjectModal({
  userId,
  onClose,
  onCreated,
}: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [modelType, setModelType] = useState<ModelType>("ml_supervised");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Project name is required."); return; }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        name: name.trim(),
        model_type: modelType,
        current_step: 1,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onCreated(data as Project);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg border border-[#CCCCCC] shadow-xl p-6 w-full max-w-md mx-4">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#666666] hover:text-[#1A1A1A]"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1">New Project</h2>
        <p className="text-sm text-[#666666] mb-6">
          Name your project and choose your modelling approach.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-[#FFEBEE] text-sm text-[#C0392B]">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="projectName">Project name</Label>
            <Input
              id="projectName"
              placeholder="e.g. Iris Classification Experiment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Model category</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModelType("ml_supervised")}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  modelType === "ml_supervised"
                    ? "border-[#2E75B6] bg-[#D6E4F0]"
                    : "border-[#CCCCCC] hover:border-[#2E75B6]/50"
                }`}
              >
                <Brain className="w-5 h-5 mb-2 text-[#1B3A5C]" />
                <div className="font-medium text-sm text-[#1A1A1A]">ML Supervised</div>
                <div className="text-xs text-[#666666] mt-0.5">
                  scikit-learn models: Random Forest, SVM, etc.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setModelType("deep_learning")}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  modelType === "deep_learning"
                    ? "border-[#2E75B6] bg-[#D6E4F0]"
                    : "border-[#CCCCCC] hover:border-[#2E75B6]/50"
                }`}
              >
                <Network className="w-5 h-5 mb-2 text-[#1B3A5C]" />
                <div className="font-medium text-sm text-[#1A1A1A]">Deep Learning</div>
                <div className="text-xs text-[#666666] mt-0.5">
                  Neural networks with PyTorch
                </div>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
