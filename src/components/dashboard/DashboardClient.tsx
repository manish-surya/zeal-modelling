"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { Plus, LogOut, LayoutGrid, Moon, Sun, Database, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Button } from "@/components/ui/button";
import { Project } from "@/types";
import ProjectCard from "./ProjectCard";
import NewProjectModal from "./NewProjectModal";

const EXAMPLE_DATASETS = [
  {
    name: "Iris Classification",
    description: "Classic 150-sample flower dataset. 4 numeric features, 3 species.",
    rows: 150, cols: 5, type: "Classification",
    color: "from-violet-500/10 to-purple-500/5 border-violet-200 dark:border-violet-800/60",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
  {
    name: "Titanic Survival",
    description: "Passenger survival prediction. Mix of numeric and categorical features.",
    rows: 891, cols: 11, type: "Classification",
    color: "from-blue-500/10 to-sky-500/5 border-blue-200 dark:border-blue-800/60",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  {
    name: "Boston Housing",
    description: "Predict median house prices. 13 features including crime rate and rooms.",
    rows: 506, cols: 14, type: "Regression",
    color: "from-green-500/10 to-emerald-500/5 border-green-200 dark:border-green-800/60",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  {
    name: "Customer Churn",
    description: "Telecom churn prediction. 7K samples, 20 features.",
    rows: 7043, cols: 20, type: "Classification",
    color: "from-orange-500/10 to-amber-500/5 border-orange-200 dark:border-orange-800/60",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  {
    name: "Wine Quality",
    description: "Red/white wine quality. 11 physicochemical features, 6.5K samples.",
    rows: 6497, cols: 12, type: "Regression",
    color: "from-rose-500/10 to-pink-500/5 border-rose-200 dark:border-rose-800/60",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  },
];

export default function DashboardClient({ user, initialProjects }: { user: User; initialProjects: Project[] }) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showNewModal, setShowNewModal] = useState(false);
  const [sort, setSort] = useState<"updated" | "name" | "status">("updated");

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const handleProjectCreated = (project: Project) => {
    setProjects(prev => [project, ...prev]);
    router.push(`/project?id=${project.id}&step=1`);
  };

  const handleProjectDeleted = (id: string) => setProjects(prev => prev.filter(p => p.id !== id));

  const sorted = [...projects].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "status") return a.status.localeCompare(b.status);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return (
    <div className="min-h-screen bg-[var(--z-app)]">
      {/* Top bar */}
      <header className="h-14 bg-[var(--z-header)] flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">Z</span>
          </div>
          <span className="font-bold text-white text-sm">Zeal Modelling</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title={theme === "dark" ? "Light mode" : "Dark mode"}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Button onClick={() => setShowNewModal(true)} size="sm" className="bg-white/15 hover:bg-white/25 text-white border-0">
            <Plus className="w-4 h-4" /> New Project
          </Button>
          <div className="flex items-center gap-2 ml-1">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold">
              {(user.email?.[0] ?? "U").toUpperCase()}
            </div>
            <button onClick={handleLogout} className="text-white/50 hover:text-white transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Example datasets */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[var(--z-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--z-text)]">Example Datasets</h2>
            <span className="text-xs text-[var(--z-text-3)]">· Click to start a new project with sample data</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {EXAMPLE_DATASETS.map(ds => (
              <button key={ds.name} onClick={() => setShowNewModal(true)}
                className={`text-left p-4 rounded-xl border bg-gradient-to-br ${ds.color} hover:scale-[1.02] transition-all duration-150`}>
                <div className="flex items-center justify-between mb-2">
                  <Database className="w-4 h-4 text-[var(--z-text-3)]" />
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ds.badge}`}>{ds.type}</span>
                </div>
                <p className="text-xs font-semibold text-[var(--z-text)] mb-1 leading-tight">{ds.name}</p>
                <p className="text-[10px] text-[var(--z-text-3)] leading-tight mb-2 line-clamp-2">{ds.description}</p>
                <p className="text-[10px] text-[var(--z-text-3)]">{ds.rows.toLocaleString()} rows · {ds.cols} cols</p>
              </button>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold text-[var(--z-text)]">My Projects</h1>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[var(--z-accent-bg)] text-[var(--z-accent)] text-xs font-semibold">
              {projects.length}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[var(--z-text-3)] mr-1">Sort:</span>
            {(["updated","name","status"] as const).map(s => (
              <button key={s} onClick={() => setSort(s)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${sort===s ? "bg-[var(--z-accent)] text-white" : "text-[var(--z-text-2)] hover:bg-[var(--z-surface-2)]"}`}>
                {s === "updated" ? "Last modified" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-[var(--z-surface)] border-2 border-dashed border-[var(--z-border)] rounded-xl flex items-center justify-center mx-auto mb-4">
              <LayoutGrid className="w-8 h-8 text-[var(--z-text-3)]" />
            </div>
            <h3 className="text-base font-semibold text-[var(--z-text)] mb-2">No projects yet</h3>
            <p className="text-sm text-[var(--z-text-2)] mb-6 max-w-xs mx-auto">
              Create a project or try one of the example datasets above.
            </p>
            <Button onClick={() => setShowNewModal(true)} className="bg-[var(--z-accent)] hover:bg-[var(--z-accent-h)] text-white">
              <Plus className="w-4 h-4" /> Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map(p => <ProjectCard key={p.id} project={p} onDeleted={handleProjectDeleted} />)}
          </div>
        )}
      </main>

      {showNewModal && (
        <NewProjectModal userId={user.id} onClose={() => setShowNewModal(false)} onCreated={handleProjectCreated} />
      )}
    </div>
  );
}
