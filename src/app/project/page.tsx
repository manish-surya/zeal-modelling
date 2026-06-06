"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Project, Dataset, Pipeline, TrainingJob } from "@/types";
import WizardShell from "@/components/wizard/WizardShell";
import Step1Client from "@/components/step1/Step1Client";
import Step2Client from "@/components/step2/Step2Client";
import Step3Client from "@/components/step3/Step3Client";
import Step4Client from "@/components/step4/Step4Client";
import Step5Client from "@/components/step5/Step5Client";

const Spinner = () => (
  <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-[#2E75B6] border-t-transparent rounded-full animate-spin" />
  </div>
);

interface PageData {
  project: Project;
  dataset: Dataset | null;
  pipeline: Pipeline | null;
  latestJob: TrainingJob | null;
  userId: string;
}

function ProjectPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  const step = Math.max(1, Math.min(5, parseInt(searchParams.get("step") || "1", 10))) as 1 | 2 | 3 | 4 | 5;

  const [pageData, setPageData] = useState<PageData | null>(null);
  const [trainingJob, setTrainingJob] = useState<TrainingJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { router.replace("/dashboard"); return; }
    setLoading(true);
    setPageData(null);

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace("/auth/login"); return; }

      const [
        { data: project },
        { data: dataset },
        { data: pipeline },
        { data: job },
      ] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).eq("user_id", user.id).single(),
        supabase.from("datasets").select("*").eq("project_id", id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("pipelines").select("*").eq("project_id", id)
          .eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("training_jobs").select("*").eq("project_id", id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (!project) { router.replace("/dashboard"); return; }

      // Step-specific DB side-effects
      if (step === 4 && project.current_step < 5 && job?.status === "complete") {
        await supabase.from("projects").update({ current_step: 5 }).eq("id", id);
        project.current_step = 5;
      } else if (step === 5 && project.status !== "exported") {
        await supabase.from("projects").update({ status: "exported" }).eq("id", id);
        project.status = "exported";
      }

      setTrainingJob(job as TrainingJob | null);
      setPageData({
        project: project as Project,
        dataset: dataset as Dataset | null,
        pipeline: pipeline as Pipeline | null,
        latestJob: job as TrainingJob | null,
        userId: user.id,
      });
      setLoading(false);
    });
  }, [id, step, router]);

  if (loading || !pageData) return <Spinner />;

  const { project, dataset, pipeline, latestJob, userId } = pageData;
  const completedJob = latestJob?.status === "complete" ? latestJob : null;

  let content: React.ReactNode = null;
  if (step === 1) content = <Step1Client project={project} existingDataset={dataset} userId={userId} />;
  else if (step === 2) content = <Step2Client project={project} dataset={dataset} existingPipeline={pipeline} />;
  else if (step === 3) content = <Step3Client project={project} pipeline={pipeline} latestJob={latestJob} />;
  else if (step === 4) content = <Step4Client project={project} job={completedJob} />;
  else if (step === 5) content = <Step5Client project={project} dataset={dataset} pipeline={pipeline} job={completedJob} />;

  return (
    <WizardShell project={project} trainingJob={trainingJob}>
      {content}
    </WizardShell>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ProjectPageInner />
    </Suspense>
  );
}
