import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Step2Client from "@/components/step2/Step2Client";

interface Step2PageProps {
  params: Promise<{ id: string }>;
}

export default async function Step2Page({ params }: Step2PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project || project.current_step < 2) redirect(`/project/${id}/step1`);

  const { data: dataset } = await supabase
    .from("datasets")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("*")
    .eq("project_id", id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <Step2Client
      project={project}
      dataset={dataset}
      existingPipeline={pipeline}
    />
  );
}
