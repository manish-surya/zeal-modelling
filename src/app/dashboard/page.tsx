"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { Project } from "@/types";
import DashboardClient from "@/components/dashboard/DashboardClient";
import AuthGuard from "@/components/AuthGuard";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUser(user);
      const { data } = await supabase
        .from("projects")
        .select("*, datasets(*)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      setProjects(data ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2E75B6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthGuard>
      <DashboardClient user={user!} initialProjects={projects} />
    </AuthGuard>
  );
}
