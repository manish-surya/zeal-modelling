import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Step3Client from "@/components/step3/Step3Client";

interface Step3PageProps {
  params: Promise<{ id: string }>;
}

export default async function Step3Page({ params }: Step3PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project || project.current_step < 3) redirect(`/project/${id}/step2`);

  const { data: pipeline } = await supabase
    .from("pipelines").select("*").eq("project_id", id).eq("is_active", true)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  const { data: latestJob } = await supabase
    .from("training_jobs").select("*").eq("project_id", id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  return <Step3Client project={project} pipeline={pipeline} latestJob={latestJob} />;
}
