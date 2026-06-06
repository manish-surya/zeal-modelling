"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Project, TrainingJob } from "@/types";
import WizardShell from "@/components/wizard/WizardShell";

// Read project ID directly from the URL — useParams() can return "placeholder"
// during hydration of a static export, causing false "not found" redirects.
function getProjectIdFromPath(): string | null {
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(/\/project\/([^/]+)/);
  const id = match?.[1];
  return id && id !== "placeholder" ? id : null;
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [trainingJob, setTrainingJob] = useState<TrainingJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = getProjectIdFromPath();
    if (!id) return;

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace("/auth/login"); return; }

      const { data: proj } = await supabase
        .from("projects").select("*").eq("id", id).eq("user_id", user.id).single();

      if (!proj) { router.replace("/dashboard"); return; }

      const { data: job } = await supabase
        .from("training_jobs").select("*").eq("project_id", id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();

      setProject(proj as Project);
      setTrainingJob(job as TrainingJob | null);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2E75B6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <WizardShell project={project} trainingJob={trainingJob}>
      {children}
    </WizardShell>
  );
}
