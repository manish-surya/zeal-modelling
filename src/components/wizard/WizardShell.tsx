"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, ArrowLeft, Moon, Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Project, TrainingJob } from "@/types";
import WizardProgressBar from "./WizardProgressBar";

interface WizardShellProps {
  project: Project;
  trainingJob: TrainingJob | null;
  children: React.ReactNode;
}

export default function WizardShell({ project, trainingJob, children }: WizardShellProps) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [projectName, setProjectName] = useState(project.name);
  const [editing, setEditing] = useState(false);

  // Compute highest unlocked step
  const getCompletedUpTo = (): number => {
    const hasDataset = project.current_step >= 2;
    const hasPipeline = project.current_step >= 3;
    const hasCompletedJob = trainingJob?.status === "complete";
    const hasViewedEval = project.current_step >= 5;

    if (hasViewedEval) return 5;
    if (hasCompletedJob) return 4;
    if (hasPipeline) return 3;
    if (hasDataset) return 2;
    return 1;
  };

  const completedUpTo = getCompletedUpTo();

  const handleNameSave = async () => {
    if (!projectName.trim()) { setProjectName(project.name); setEditing(false); return; }
    const supabase = createClient();
    await supabase.from("projects").update({ name: projectName.trim() }).eq("id", project.id);
    setEditing(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-[var(--z-app)] flex flex-col">
      {/* App Header */}
      <header className="h-14 bg-[#1B3A5C] flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Projects</span>
          </Link>
          <div className="w-px h-5 bg-white/20" />
          {/* Editable project name */}
          {editing ? (
            <input
              autoFocus
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSave();
                if (e.key === "Escape") { setProjectName(project.name); setEditing(false); }
              }}
              className="bg-transparent text-white font-semibold text-sm border-b border-white/50 outline-none min-w-[200px]"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-white font-semibold text-sm hover:opacity-80 transition-opacity"
              title="Click to rename"
            >
              {projectName}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs hidden sm:inline">
            {project.problem_type ? project.problem_type.charAt(0).toUpperCase() + project.problem_type.slice(1) : "ML"}
          </span>
          <button onClick={toggle} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all" title={theme === "dark" ? "Light mode" : "Dark mode"}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={handleLogout} className="text-white/60 hover:text-white transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Wizard Progress Bar */}
      <WizardProgressBar
        projectId={project.id}
        currentStep={project.current_step}
        completedUpTo={completedUpTo}
      />

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
