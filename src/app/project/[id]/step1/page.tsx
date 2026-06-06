"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Project, Dataset } from "@/types";
import Step1Client from "@/components/step1/Step1Client";

export function generateStaticParams() { return []; }

export default function Step1Page() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{ project: Project; dataset: Dataset | null; userId: string } | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: project } = await supabase.from("projects").select("*").eq("id", params.id).single();
      const { data: dataset } = await supabase.from("datasets").select("*").eq("project_id", params.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (project) setData({ project: project as Project, dataset: dataset as Dataset | null, userId: user.id });
    });
  }, [params?.id]);

  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-4 border-[#2E75B6] border-t-transparent rounded-full animate-spin" /></div>;
  return <Step1Client project={data.project} existingDataset={data.dataset} userId={data.userId} />;
}
