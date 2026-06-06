"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Project, Dataset, Pipeline, TrainingJob } from "@/types";
import Step5Client from "@/components/step5/Step5Client";

export const dynamicParams = false;
export function generateStaticParams() { return []; }

export default function Step5Page() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{
    project: Project; dataset: Dataset | null; pipeline: Pipeline | null; job: TrainingJob | null;
  } | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: project } = await supabase.from("projects").select("*").eq("id", params.id).single();
      const { data: dataset } = await supabase.from("datasets").select("*").eq("project_id", params.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: pipeline } = await supabase.from("pipelines").select("*").eq("project_id", params.id)
        .eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: job } = await supabase.from("training_jobs").select("*").eq("project_id", params.id)
        .eq("status", "complete").order("created_at", { ascending: false }).limit(1).maybeSingle();
      // Mark as exported
      if (project) await supabase.from("projects").update({ status: "exported" }).eq("id", params.id);
      if (project) setData({
        project: project as Project, dataset: dataset as Dataset | null,
        pipeline: pipeline as Pipeline | null, job: job as TrainingJob | null,
      });
    });
  }, [params?.id]);

  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-4 border-[#2E75B6] border-t-transparent rounded-full animate-spin" /></div>;
  return <Step5Client project={data.project} dataset={data.dataset} pipeline={data.pipeline} job={data.job} />;
}
