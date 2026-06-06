"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { Plus, LogOut, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Project } from "@/types";
import ProjectCard from "./ProjectCard";
import NewProjectModal from "./NewProjectModal";

interface DashboardClientProps {
  user: User;
  initialProjects: Project[];
}

export default function DashboardClient({
  user,
  initialProjects,
}: DashboardClientProps) {
  const router = useRouter();
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
    setProjects((prev) => [project, ...prev]);
    router.push(`/project?id=${project.id}&step=1`);
  };

  const handleProjectDeleted = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "status") return a.status.localeCompare(b.status);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Top bar */}
      <header className="h-14 bg-white border-b border-[#CCCCCC] flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1B3A5C] rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">Z</span>
          </div>
          <span className="font-bold text-[#1B3A5C] text-base">Zeal Modelling</span>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowNewModal(true)} size="sm">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#1B3A5C] flex items-center justify-center text-white text-xs font-semibold">
              {(user.email?.[0] ?? "U").toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="text-[#666666] hover:text-[#1A1A1A] transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#1A1A1A]">My Projects</h1>
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#D6E4F0] text-[#2E75B6] text-xs font-semibold">
              {projects.length}
            </span>
          </div>
          {/* Sort controls */}
          <div className="flex items-center gap-1 text-sm text-[#666666]">
            <span className="mr-2">Sort:</span>
            {(["updated", "name", "status"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  sort === s
                    ? "bg-[#1B3A5C] text-white"
                    : "hover:bg-[#EEEEEE] text-[#666666]"
                }`}
              >
                {s === "updated" ? "Last modified" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {projects.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-[#F8F9FA] border-2 border-dashed border-[#CCCCCC] rounded-xl flex items-center justify-center mx-auto mb-4">
              <LayoutGrid className="w-8 h-8 text-[#CCCCCC]" />
            </div>
            <h3 className="text-base font-semibold text-[#1A1A1A] mb-2">No projects yet</h3>
            <p className="text-sm text-[#666666] mb-6 max-w-xs mx-auto">
              Create your first project to start building ML pipelines visually.
            </p>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="w-4 h-4" />
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDeleted={handleProjectDeleted}
              />
            ))}
          </div>
        )}
      </main>

      {showNewModal && (
        <NewProjectModal
          userId={user.id}
          onClose={() => setShowNewModal(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  );
}
