import ProjectStepWrapper from "@/components/wizard/ProjectStepWrapper";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function Step5Page() {
  return <ProjectStepWrapper step={5} />;
}
