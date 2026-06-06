"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#1B3A5C] rounded-md flex items-center justify-center">
              <span className="text-white text-sm font-bold">Z</span>
            </div>
            <span className="text-xl font-bold text-[#1B3A5C]">Zeal Modelling</span>
          </div>
          <p className="text-[#666666] text-sm">Build, Train, and Export Real ML Models</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg border border-[#CCCCCC] shadow-sm p-6">
          <h1 className="text-lg font-semibold text-[#1A1A1A] mb-1">Sign in</h1>
          <p className="text-sm text-[#666666] mb-6">Enter your credentials to continue</p>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-[#FFEBEE] border border-[#C0392B]/20 text-sm text-[#C0392B]">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/auth/reset-password"
                  className="text-xs text-[#2E75B6] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-[#666666] mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-[#2E75B6] hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
