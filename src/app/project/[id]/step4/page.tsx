"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Project, TrainingJob } from "@/types";
import Step4Client from "@/components/step4/Step4Client";

export function generateStaticParams() { return []; }

export default function Step4Page() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{ project: Project; job: TrainingJob | null } | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: project } = await supabase.from("projects").select("*").eq("id", params.id).single();
      const { data: job } = await supabase.from("training_jobs").select("*").eq("project_id", params.id)
        .eq("status", "complete").order("created_at", { ascending: false }).limit(1).maybeSingle();
      // Mark step 4 visited
      if (project && project.current_step < 5 && job) {
        await supabase.from("projects").update({ current_step: 5 }).eq("id", params.id);
      }
      if (project) setData({ project: project as Project, job: job as TrainingJob | null });
    });
  }, [params?.id]);

  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-4 border-[#2E75B6] border-t-transparent rounded-full animate-spin" /></div>;
  return <Step4Client project={data.project} job={data.job} />;
}
