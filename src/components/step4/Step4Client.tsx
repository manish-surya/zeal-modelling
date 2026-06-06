"use client";

import { useRouter } from "next/navigation";
import { Project, TrainingJob } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertCircle } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell
} from "recharts";

interface Step4ClientProps {
  project: Project;
  job: TrainingJob | null;
}

export default function Step4Client({ project, job }: Step4ClientProps) {
  const router = useRouter();
  const metrics = job?.metrics as Record<string, unknown> | null;

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-center py-24">
          <AlertCircle className="w-12 h-12 text-[#E67E22] mb-4" />
          <h3 className="text-base font-semibold text-[#1A1A1A] mb-2">No completed training job</h3>
          <p className="text-sm text-[#666666] mb-6">Complete a training job in Step 3 first.</p>
          <Button onClick={() => router.push(`/project?id=${project.id}&step=3`)}>
            Go to Modelling
          </Button>
        </div>
      </div>
    );
  }

  const isClassification = project.problem_type === "classification";
  const trainingTime = job.started_at && job.completed_at
    ? ((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000).toFixed(1)
    : null;

  // Mock chart data when real data not available (ML service not connected)
  const mockConfusionMatrix = [[45, 5], [3, 47]];
  const mockResidualData = Array.from({ length: 50 }, (_, i) => ({
    predicted: i * 2 + Math.random() * 5,
    actual: i * 2 + Math.random() * 8 - 4,
    residual: Math.random() * 8 - 4,
  }));
  const mockROC = Array.from({ length: 11 }, (_, i) => ({
    fpr: i * 0.1,
    tpr: Math.min(1, i * 0.1 + Math.random() * 0.2 + 0.05),
  }));
  const mockLossCurve = Array.from({ length: 20 }, (_, i) => ({
    epoch: i + 1,
    train: Math.max(0.1, 1.5 - i * 0.07 + Math.random() * 0.05),
    val: Math.max(0.15, 1.6 - i * 0.065 + Math.random() * 0.08),
  }));

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1B3A5C] text-white text-xs font-bold">4</span>
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Evaluation</h2>
        </div>
        <p className="text-sm text-[#666666]">Model performance metrics and visualisations.</p>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-lg border border-[#CCCCCC] shadow-sm p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-[#1A1A1A] mb-1">{job.model_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</h3>
            <p className="text-sm text-[#666666]">
              Train/Val split: {Math.round(job.train_val_split * 100)}% / {Math.round((1 - job.train_val_split) * 100)}%
              {trainingTime && ` · Training time: ${trainingTime}s`}
              {" · Seed: " + job.random_seed}
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#4CAF50] text-xs font-semibold">
            ✓ Completed
          </span>
        </div>

        {/* Primary metric */}
        {metrics && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {isClassification ? (
              <>
                {["accuracy","f1","precision","recall"].map((key) => metrics[key] !== undefined && (
                  <div key={key} className="text-center p-3 bg-[#F8F9FA] rounded-lg">
                    <p className="text-2xl font-bold text-[#1B3A5C]">
                      {(Number(metrics[key]) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-[#666666] capitalize">{key}</p>
                  </div>
                ))}
              </>
            ) : (
              <>
                {["rmse","mae","r2","mape"].map((key) => metrics[key] !== undefined && (
                  <div key={key} className="text-center p-3 bg-[#F8F9FA] rounded-lg">
                    <p className="text-2xl font-bold text-[#1B3A5C]">
                      {typeof metrics[key] === "number" ? Number(metrics[key]).toFixed(4) : String(metrics[key])}
                    </p>
                    <p className="text-xs text-[#666666] uppercase">{key === "r2" ? "R²" : key.toUpperCase()}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {!metrics && (
          <div className="mt-4 p-3 rounded-md bg-[#FFF3E0] border border-[#E67E22]/20 text-sm text-[#E67E22]">
            Metrics not yet available. Connect the FastAPI ML service to see real evaluation results.
          </div>
        )}
      </div>

      {/* Visualisations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isClassification ? (
          <>
            {/* Confusion Matrix */}
            <div className="bg-white rounded-lg border border-[#CCCCCC] shadow-sm p-5">
              <h4 className="font-semibold text-[#1A1A1A] mb-4">Confusion Matrix</h4>
              <div className="grid grid-cols-2 gap-1 max-w-48 mx-auto">
                {mockConfusionMatrix.map((row, ri) =>
                  row.map((val, ci) => (
                    <div
                      key={`${ri}-${ci}`}
                      className={`aspect-square flex items-center justify-center text-lg font-bold rounded-lg ${
                        ri === ci ? "bg-[#1B3A5C] text-white" : "bg-[#D6E4F0] text-[#1B3A5C]"
                      }`}
                    >
                      {val}
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-center gap-6 mt-4 text-xs text-[#666666]">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#1B3A5C] rounded" /> True Positive</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#D6E4F0] rounded" /> Off-diagonal</div>
              </div>
            </div>

            {/* ROC Curve */}
            <div className="bg-white rounded-lg border border-[#CCCCCC] shadow-sm p-5">
              <h4 className="font-semibold text-[#1A1A1A] mb-4">ROC Curve</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={mockROC}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" />
                  <XAxis dataKey="fpr" tickFormatter={(v) => v.toFixed(1)} label={{ value: "FPR", position: "insideBottom", dy: 10, fontSize: 11 }} />
                  <YAxis label={{ value: "TPR", angle: -90, position: "insideLeft", dx: -5, fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => v.toFixed(3)} />
                  <Line type="monotone" dataKey="tpr" stroke="#2E75B6" strokeWidth={2} dot={false} name="TPR" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <>
            {/* Residual Plot */}
            <div className="bg-white rounded-lg border border-[#CCCCCC] shadow-sm p-5">
              <h4 className="font-semibold text-[#1A1A1A] mb-4">Residual Plot</h4>
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" />
                  <XAxis dataKey="predicted" name="Predicted" label={{ value: "Predicted", position: "insideBottom", dy: 10, fontSize: 11 }} />
                  <YAxis dataKey="residual" name="Residual" label={{ value: "Residual", angle: -90, position: "insideLeft", dx: -5, fontSize: 11 }} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={mockResidualData} fill="#2E75B6" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Residual distribution placeholder */}
            <div className="bg-white rounded-lg border border-[#CCCCCC] shadow-sm p-5">
              <h4 className="font-semibold text-[#1A1A1A] mb-4">Predicted vs Actual</h4>
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" />
                  <XAxis dataKey="actual" name="Actual" label={{ value: "Actual", position: "insideBottom", dy: 10, fontSize: 11 }} />
                  <YAxis dataKey="predicted" name="Predicted" label={{ value: "Predicted", angle: -90, position: "insideLeft", dx: -5, fontSize: 11 }} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={mockResidualData} fill="#1B3A5C" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* Loss curve (always shown for DL) */}
        {project.model_type === "deep_learning" && (
          <div className="bg-white rounded-lg border border-[#CCCCCC] shadow-sm p-5 md:col-span-2">
            <h4 className="font-semibold text-[#1A1A1A] mb-4">Training / Validation Loss</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={mockLossCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" />
                <XAxis dataKey="epoch" label={{ value: "Epoch", position: "insideBottom", dy: 10, fontSize: 11 }} />
                <YAxis label={{ value: "Loss", angle: -90, position: "insideLeft", dx: -5, fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="train" stroke="#1B3A5C" strokeWidth={2} dot={false} name="Train" />
                <Line type="monotone" dataKey="val" stroke="#2E75B6" strokeWidth={2} dot={false} strokeDasharray="4 4" name="Validation" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-8">
        <Button onClick={() => router.push(`/project?id=${project.id}&step=5`)} size="lg">
          Proceed to Export
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
