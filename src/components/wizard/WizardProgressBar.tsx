"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

const STEPS = [
  { num: 1, label: "Data Input" },
  { num: 2, label: "Feature Eng." },
  { num: 3, label: "Modelling" },
  { num: 4, label: "Evaluation" },
  { num: 5, label: "Export" },
];

interface WizardProgressBarProps {
  projectId: string;
  currentStep: number;
  completedUpTo: number; // highest unlocked step
}

export default function WizardProgressBar({
  projectId,
  currentStep,
  completedUpTo,
}: WizardProgressBarProps) {
  const router = useRouter();

  const navigate = (stepNum: number) => {
    if (stepNum <= completedUpTo) {
      router.push(`/project/${projectId}/step${stepNum}`);
    }
  };

  return (
    <div className="h-12 bg-white border-b border-[#CCCCCC] flex items-center justify-center px-6">
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const isCompleted = step.num < currentStep && step.num < completedUpTo + 1;
          const isActive = step.num === currentStep;
          const isLocked = step.num > completedUpTo;
          const isClickable = step.num <= completedUpTo;

          return (
            <div key={step.num} className="flex items-center">
              {/* Connector line */}
              {i > 0 && (
                <div
                  className={`w-12 h-0.5 step-connector ${
                    step.num <= completedUpTo ? "bg-[#1B3A5C]" : "bg-[#CCCCCC]"
                  }`}
                />
              )}

              {/* Step circle */}
              <button
                onClick={() => navigate(step.num)}
                disabled={isLocked}
                title={isLocked ? `Complete Step ${step.num - 1} first` : step.label}
                className={`flex flex-col items-center gap-0.5 group ${
                  isClickable ? "cursor-pointer" : "cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                    ${isCompleted
                      ? "bg-[#1B3A5C] text-white"
                      : isActive
                      ? "bg-[#2E75B6] text-white step-active-pulse"
                      : "bg-white border-2 border-[#CCCCCC] text-[#666666]"
                    }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.num}
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap transition-colors
                    ${isActive ? "text-[#2E75B6]" :
                      isCompleted ? "text-[#1B3A5C]" :
                      "text-[#666666]"}`}
                >
                  {step.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
