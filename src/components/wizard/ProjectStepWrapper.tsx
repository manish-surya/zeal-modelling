"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Project, Dataset, Pipeline, TrainingJob } from "@/types";
import Step1Client from "@/components/step1/Step1Client";
import Step2Client from "@/components/step2/Step2Client";
import Step3Client from "@/components/step3/Step3Client";
import Step4Client from "@/components/step4/Step4Client";
import Step5Client from "@/components/step5/Step5Client";

interface Props {
  step: 1 | 2 | 3 | 4 | 5;
}

interface StepData {
  project: Project;
  dataset: Dataset | null;
  pipeline: Pipeline | null;
  latestJob: TrainingJob | null;
  userId: string;
}

const Spinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-6 h-6 border-4 border-[#2E75B6] border-t-transparent rounded-full animate-spin" />
  </div>
);

function getProjectIdFromPath(): string | null {
  if (typeof window === "undefined") return null;
  const match = window.location.pathname.match(/\/project\/([^/]+)/);
  const id = match?.[1];
  return id && id !== "placeholder" ? id : null;
}

export default function ProjectStepWrapper({ step }: Props) {
  const [data, setData] = useState<StepData | null>(null);

  useEffect(() => {
    const id = getProjectIdFromPath();
    if (!id) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const [{ data: project }, { data: dataset }, { data: pipeline }, { data: job }] =
        await Promise.all([
          supabase.from("projects").select("*").eq("id", id).single(),
          supabase.from("datasets").select("*").eq("project_id", id)
            .order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("pipelines").select("*").eq("project_id", id)
            .eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("training_jobs").select("*").eq("project_id", id)
            .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);

      if (!project) return;

      // Handle step-specific database updates (originally in page components)
      if (step === 4 && project.current_step < 5 && job?.status === "complete") {
        await supabase.from("projects").update({ current_step: 5 }).eq("id", id);
        project.current_step = 5;
      } else if (step === 5 && project.status !== "exported") {
        await supabase.from("projects").update({ status: "exported" }).eq("id", id);
        project.status = "exported";
      }

      setData({
        project: project as Project,
        dataset: dataset as Dataset | null,
        pipeline: pipeline as Pipeline | null,
        latestJob: job as TrainingJob | null,
        userId: user.id,
      });
    });
  }, [step]);

  if (!data) return <Spinner />;

  const { project, dataset, pipeline, latestJob, userId } = data;

  if (step === 1) return <Step1Client project={project} existingDataset={dataset} userId={userId} />;
  if (step === 2) return <Step2Client project={project} dataset={dataset} existingPipeline={pipeline} />;
  if (step === 3) return <Step3Client project={project} pipeline={pipeline} latestJob={latestJob} />;
  if (step === 4) {
    const completedJob = latestJob?.status === "complete" ? latestJob : null;
    return <Step4Client project={project} job={completedJob} />;
  }
  if (step === 5) return <Step5Client project={project} dataset={dataset} pipeline={pipeline} job={latestJob?.status === "complete" ? latestJob : null} />;
  return null;
}
