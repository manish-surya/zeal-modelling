import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Step1Client from "@/components/step1/Step1Client";

interface Step1PageProps {
  params: Promise<{ id: string }>;
}

export default async function Step1Page({ params }: Step1PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) redirect("/dashboard");

  const { data: dataset } = await supabase
    .from("datasets")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return <Step1Client project={project} existingDataset={dataset} userId={user.id} />;
}
