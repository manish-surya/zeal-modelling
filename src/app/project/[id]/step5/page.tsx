import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Step5Client from "@/components/step5/Step5Client";

interface Step5PageProps {
  params: Promise<{ id: string }>;
}

export default async function Step5Page({ params }: Step5PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) redirect("/dashboard");

  const { data: dataset } = await supabase
    .from("datasets").select("*").eq("project_id", id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  const { data: pipeline } = await supabase
    .from("pipelines").select("*").eq("project_id", id).eq("is_active", true)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  const { data: latestJob } = await supabase
    .from("training_jobs").select("*").eq("project_id", id).eq("status", "complete")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  // Mark as exported
  await supabase.from("projects").update({ status: "exported" }).eq("id", id);

  return <Step5Client project={project} dataset={dataset} pipeline={pipeline} job={latestJob} />;
}
