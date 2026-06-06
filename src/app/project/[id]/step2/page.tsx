import ProjectStepWrapper from "@/components/wizard/ProjectStepWrapper";

export const dynamicParams = false;
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function Step2Page() {
  return <ProjectStepWrapper step={2} />;
}
