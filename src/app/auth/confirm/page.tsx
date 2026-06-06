"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push("/dashboard");
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#2E75B6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-[#666666]">Confirming your account...</p>
      </div>
    </div>
  );
}
