import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Step4Client from "@/components/step4/Step4Client";

interface Step4PageProps {
  params: Promise<{ id: string }>;
}

export default async function Step4Page({ params }: Step4PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) redirect("/dashboard");

  const { data: latestJob } = await supabase
    .from("training_jobs").select("*").eq("project_id", id)
    .eq("status", "complete")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  // Mark step 4 as visited
  if (project.current_step < 5 && latestJob) {
    await supabase.from("projects").update({ current_step: Math.max(project.current_step, 5) }).eq("id", id);
  }

  return <Step4Client project={project} job={latestJob} />;
}
