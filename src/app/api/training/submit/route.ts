import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { job_id, project_id, config } = body;

    const ML_SERVICE_URL = process.env.ML_SERVICE_URL;
    const ML_SERVICE_API_KEY = process.env.ML_SERVICE_API_KEY;

    if (!ML_SERVICE_URL || ML_SERVICE_URL === "placeholder_for_now") {
      // ML service not configured — simulate a short delay and mark as failed with informative message
      const supabase = await createAdminClient();
      await supabase.from("training_jobs").update({
        status: "failed",
        error_message: "ML service not configured. Set ML_SERVICE_URL in environment variables to enable real training.",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }).eq("id", job_id);

      return NextResponse.json({ ok: false, message: "ML service not configured" }, { status: 200 });
    }

    // Forward to FastAPI ML service
    const response = await fetch(`${ML_SERVICE_URL}/train`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": ML_SERVICE_API_KEY ?? "",
      },
      body: JSON.stringify({ job_id, project_id, config }),
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
