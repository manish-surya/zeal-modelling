import ProjectStepWrapper from "@/components/wizard/ProjectStepWrapper";

export const dynamicParams = false;
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function Step1Page() {
  return <ProjectStepWrapper step={1} />;
}
