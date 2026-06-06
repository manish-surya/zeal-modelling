"use client";

import { create } from "zustand";
import {
  Project,
  Dataset,
  Pipeline,
  PipelineBlock,
  TrainingJob,
  TrainingConfig,
} from "@/types";

interface ProjectStore {
  // Current project
  project: Project | null;
  dataset: Dataset | null;
  pipeline: Pipeline | null;
  trainingJob: TrainingJob | null;
  trainingConfig: TrainingConfig | null;

  // Step completion flags
  step1Complete: boolean;
  step2Complete: boolean;
  step3Complete: boolean;
  step4Complete: boolean;

  // Actions
  setProject: (project: Project | null) => void;
  setDataset: (dataset: Dataset | null) => void;
  setPipeline: (pipeline: Pipeline | null) => void;
  setTrainingJob: (job: TrainingJob | null) => void;
  setTrainingConfig: (config: TrainingConfig | null) => void;

  // Pipeline block operations
  addBlock: (block: PipelineBlock) => void;
  removeBlock: (blockId: string) => void;
  updateBlock: (blockId: string, updates: Partial<PipelineBlock>) => void;
  reorderBlocks: (blocks: PipelineBlock[]) => void;

  // Step completion
  setStepComplete: (step: 1 | 2 | 3 | 4, value: boolean) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  project: null,
  dataset: null,
  pipeline: null,
  trainingJob: null,
  trainingConfig: null,
  step1Complete: false,
  step2Complete: false,
  step3Complete: false,
  step4Complete: false,
};

export const useProjectStore = create<ProjectStore>((set) => ({
  ...initialState,

  setProject: (project) => set({ project }),
  setDataset: (dataset) => set({ dataset }),
  setPipeline: (pipeline) => set({ pipeline }),
  setTrainingJob: (trainingJob) => set({ trainingJob }),
  setTrainingConfig: (trainingConfig) => set({ trainingConfig }),

  addBlock: (block) =>
    set((state) => ({
      pipeline: state.pipeline
        ? {
            ...state.pipeline,
            config: [...state.pipeline.config, block],
          }
        : null,
    })),

  removeBlock: (blockId) =>
    set((state) => ({
      pipeline: state.pipeline
        ? {
            ...state.pipeline,
            config: state.pipeline.config.filter((b) => b.id !== blockId),
          }
        : null,
    })),

  updateBlock: (blockId, updates) =>
    set((state) => ({
      pipeline: state.pipeline
        ? {
            ...state.pipeline,
            config: state.pipeline.config.map((b) =>
              b.id === blockId ? { ...b, ...updates } : b
            ),
          }
        : null,
    })),

  reorderBlocks: (blocks) =>
    set((state) => ({
      pipeline: state.pipeline
        ? { ...state.pipeline, config: blocks }
        : null,
    })),

  setStepComplete: (step, value) => {
    const key = `step${step}Complete` as keyof Pick<
      ProjectStore,
      "step1Complete" | "step2Complete" | "step3Complete" | "step4Complete"
    >;
    set({ [key]: value });
  },

  reset: () => set(initialState),
}));
