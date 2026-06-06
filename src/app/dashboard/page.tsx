import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("*, datasets(*)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <DashboardClient user={user} initialProjects={projects ?? []} />;
}
