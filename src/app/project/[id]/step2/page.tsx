"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Project, Dataset, Pipeline } from "@/types";
import Step2Client from "@/components/step2/Step2Client";

export const dynamicParams = false;
export function generateStaticParams() { return []; }

export default function Step2Page() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{ project: Project; dataset: Dataset | null; pipeline: Pipeline | null } | null>(null);

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
      if (project) setData({ project: project as Project, dataset: dataset as Dataset | null, pipeline: pipeline as Pipeline | null });
    });
  }, [params?.id]);

  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-4 border-[#2E75B6] border-t-transparent rounded-full animate-spin" /></div>;
  return <Step2Client project={data.project} dataset={data.dataset} existingPipeline={data.pipeline} />;
}
