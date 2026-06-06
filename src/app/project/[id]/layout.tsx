import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WizardShell from "@/components/wizard/WizardShell";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) redirect("/dashboard");

  // Fetch latest training job to determine step unlock state
  const { data: latestJob } = await supabase
    .from("training_jobs")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <WizardShell project={project} trainingJob={latestJob}>
      {children}
    </WizardShell>
  );
}
