"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Project, Pipeline, TrainingJob } from "@/types";
import Step3Client from "@/components/step3/Step3Client";

export function generateStaticParams() { return []; }

export default function Step3Page() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{ project: Project; pipeline: Pipeline | null; latestJob: TrainingJob | null } | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: project } = await supabase.from("projects").select("*").eq("id", params.id).single();
      const { data: pipeline } = await supabase.from("pipelines").select("*").eq("project_id", params.id)
        .eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: job } = await supabase.from("training_jobs").select("*").eq("project_id", params.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (project) setData({ project: project as Project, pipeline: pipeline as Pipeline | null, latestJob: job as TrainingJob | null });
    });
  }, [params?.id]);

  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-4 border-[#2E75B6] border-t-transparent rounded-full animate-spin" /></div>;
  return <Step3Client project={data.project} pipeline={data.pipeline} latestJob={data.latestJob} />;
}
