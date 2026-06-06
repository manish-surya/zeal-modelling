"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Project, Pipeline, TrainingJob, MLModelType, NNLayer, TrainingConfig } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Play, CheckCircle, XCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface Step3ClientProps {
  project: Project;
  pipeline: Pipeline | null;
  latestJob: TrainingJob | null;
}

const ML_MODELS: { value: MLModelType; label: string; problemTypes: string[] }[] = [
  { value: "logistic_regression", label: "Logistic Regression", problemTypes: ["classification"] },
  { value: "decision_tree", label: "Decision Tree", problemTypes: ["classification", "regression"] },
  { value: "random_forest", label: "Random Forest", problemTypes: ["classification", "regression"] },
  { value: "gradient_boosting", label: "Gradient Boosting", problemTypes: ["classification", "regression"] },
  { value: "svm", label: "Support Vector Machine", problemTypes: ["classification", "regression"] },
  { value: "knn", label: "K-Nearest Neighbours", problemTypes: ["classification", "regression"] },
  { value: "linear_regression", label: "Linear Regression", problemTypes: ["regression"] },
  { value: "ridge", label: "Ridge Regression", problemTypes: ["regression"] },
  { value: "lasso", label: "Lasso Regression", problemTypes: ["regression"] },
];

const ML_HYPERPARAMS: Record<MLModelType, { key: string; label: string; type: string; min?: number; max?: number; step?: number; options?: string[]; default: unknown }[]> = {
  logistic_regression: [
    { key: "C", label: "Regularisation (C)", type: "number", min: 0.01, max: 100, step: 0.01, default: 1.0 },
    { key: "max_iter", label: "Max Iterations", type: "number", min: 100, max: 10000, step: 100, default: 1000 },
    { key: "solver", label: "Solver", type: "select", options: ["lbfgs","liblinear","saga","sag"], default: "lbfgs" },
  ],
  decision_tree: [
    { key: "max_depth", label: "Max Depth (0=None)", type: "number", min: 0, max: 50, step: 1, default: 0 },
    { key: "min_samples_split", label: "Min Samples Split", type: "number", min: 2, max: 50, step: 1, default: 2 },
    { key: "criterion", label: "Criterion", type: "select", options: ["gini","entropy","log_loss"], default: "gini" },
  ],
  random_forest: [
    { key: "n_estimators", label: "Number of Trees", type: "number", min: 10, max: 2000, step: 10, default: 100 },
    { key: "max_depth", label: "Max Depth (0=None)", type: "number", min: 0, max: 50, step: 1, default: 0 },
    { key: "max_features", label: "Max Features", type: "select", options: ["sqrt","log2","auto"], default: "sqrt" },
  ],
  gradient_boosting: [
    { key: "n_estimators", label: "Number of Estimators", type: "number", min: 10, max: 2000, step: 10, default: 100 },
    { key: "learning_rate", label: "Learning Rate", type: "number", min: 0.001, max: 1.0, step: 0.001, default: 0.1 },
    { key: "max_depth", label: "Max Depth", type: "number", min: 1, max: 10, step: 1, default: 3 },
  ],
  svm: [
    { key: "C", label: "Regularisation (C)", type: "number", min: 0.01, max: 100, step: 0.01, default: 1.0 },
    { key: "kernel", label: "Kernel", type: "select", options: ["rbf","linear","poly","sigmoid"], default: "rbf" },
    { key: "gamma", label: "Gamma", type: "select", options: ["scale","auto"], default: "scale" },
  ],
  knn: [
    { key: "n_neighbors", label: "Neighbours (k)", type: "number", min: 1, max: 50, step: 1, default: 5 },
    { key: "weights", label: "Weights", type: "select", options: ["uniform","distance"], default: "uniform" },
    { key: "metric", label: "Distance Metric", type: "select", options: ["euclidean","manhattan","minkowski"], default: "euclidean" },
  ],
  linear_regression: [
    { key: "fit_intercept", label: "Fit Intercept", type: "boolean", default: true },
  ],
  ridge: [
    { key: "alpha", label: "Alpha (L2)", type: "number", min: 0.0001, max: 100, step: 0.01, default: 1.0 },
  ],
  lasso: [
    { key: "alpha", label: "Alpha (L1)", type: "number", min: 0.0001, max: 100, step: 0.01, default: 1.0 },
  ],
};

const LAYER_TYPES = ["dense","dropout","batch_norm","conv1d","lstm","flatten"] as const;

export default function Step3Client({ project, pipeline, latestJob }: Step3ClientProps) {
  const router = useRouter();
  const isML = project.model_type === "ml_supervised";

  const [selectedModel, setSelectedModel] = useState<MLModelType>("random_forest");
  const [hyperparams, setHyperparams] = useState<Record<string, unknown>>({});
  const [trainSplit, setTrainSplit] = useState(0.8);
  const [randomSeed, setRandomSeed] = useState(42);
  const [stratified, setStratified] = useState(project.problem_type === "classification");
  const [layers, setLayers] = useState<NNLayer[]>([
    { id: uuidv4(), layer_type: "dense", params: { units: 128, activation: "relu" } },
    { id: uuidv4(), layer_type: "dropout", params: { rate: 0.2 } },
    { id: uuidv4(), layer_type: "dense", params: { units: 64, activation: "relu" } },
  ]);
  const [optimizer, setOptimizer] = useState("adam");
  const [learningRate, setLearningRate] = useState(0.001);
  const [epochs, setEpochs] = useState(50);
  const [batchSize, setBatchSize] = useState(32);
  const [earlyStopping, setEarlyStopping] = useState(true);
  const [patience, setPatience] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<TrainingJob | null>(latestJob);

  // Init hyperparams
  useEffect(() => {
    const params = ML_HYPERPARAMS[selectedModel];
    const defaults: Record<string, unknown> = {};
    params.forEach((p) => { defaults[p.key] = p.default; });
    setHyperparams(defaults);
  }, [selectedModel]);

  // Poll job status
  useEffect(() => {
    if (!job || job.status === "complete" || job.status === "failed") return;
    const interval = setInterval(async () => {
      const supabase = createClient();
      const { data } = await supabase.from("training_jobs").select("*").eq("id", job.id).single();
      if (data) setJob(data as TrainingJob);
    }, 3000);
    return () => clearInterval(interval);
  }, [job]);

  const handleTrain = async () => {
    setSubmitting(true);
    const supabase = createClient();

    const trainingConfig: TrainingConfig = isML
      ? { model_type: selectedModel, hyperparameters: hyperparams, train_val_split: trainSplit, random_seed: randomSeed, stratified_split: stratified }
      : { layers, optimizer, learning_rate: learningRate, epochs, batch_size: batchSize, early_stopping: earlyStopping, early_stopping_patience: patience, train_val_split: trainSplit, random_seed: randomSeed, stratified_split: false };

    const { data: newJob } = await supabase.from("training_jobs").insert({
      project_id: project.id,
      pipeline_id: pipeline?.id ?? null,
      model_type: isML ? selectedModel : "dense_nn",
      hyperparameters: trainingConfig,
      train_val_split: trainSplit,
      random_seed: randomSeed,
      status: "queued",
    }).select().single();

    if (newJob) setJob(newJob as TrainingJob);

    // Try to call ML service
    try {
      await fetch("/api/training/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: newJob?.id, project_id: project.id, config: trainingConfig }),
      });
    } catch {
      // ML service may not be available — job stays in queued state
    }

    setSubmitting(false);
  };

  const addLayer = (type: typeof LAYER_TYPES[number]) => {
    const defaults: Record<string, Record<string, unknown>> = {
      dense: { units: 64, activation: "relu" },
      dropout: { rate: 0.2 },
      batch_norm: { momentum: 0.99, epsilon: 0.001 },
      conv1d: { filters: 32, kernel_size: 3, activation: "relu", padding: "same" },
      lstm: { units: 64, return_sequences: false },
      flatten: {},
    };
    setLayers((prev) => [...prev, { id: uuidv4(), layer_type: type, params: defaults[type] ?? {} }]);
  };

  const removeLayer = (id: string) => setLayers((prev) => prev.filter((l) => l.id !== id));
  const updateLayer = (id: string, params: Record<string, unknown>) =>
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, params } : l));

  const availableModels = ML_MODELS.filter(
    (m) => !project.problem_type || m.problemTypes.includes(project.problem_type)
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1B3A5C] text-white text-xs font-bold">3</span>
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Modelling</h2>
        </div>
        <p className="text-sm text-[#666666]">
          Configure and train your {isML ? "machine learning" : "deep learning"} model.
          {project.problem_type && (
            <span className="ml-1 text-[#2E75B6] font-medium">
              Problem type: {project.problem_type}
            </span>
          )}
        </p>
      </div>

      {/* Job status */}
      {job && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 ${
          job.status === "complete" ? "bg-[#E8F5E9] border-[#4CAF50]" :
          job.status === "failed" ? "bg-[#FFEBEE] border-[#C0392B]" :
          job.status === "running" ? "bg-[#D6E4F0] border-[#2E75B6]" :
          "bg-[#FFF3E0] border-[#E67E22]"
        }`}>
          {job.status === "complete" && <CheckCircle className="w-5 h-5 text-[#4CAF50] flex-shrink-0" />}
          {job.status === "failed" && <XCircle className="w-5 h-5 text-[#C0392B] flex-shrink-0" />}
          {(job.status === "running" || job.status === "queued") && <Loader2 className="w-5 h-5 text-[#2E75B6] animate-spin flex-shrink-0" />}
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#1A1A1A]">
              Training {job.status === "complete" ? "completed" : job.status === "failed" ? "failed" : job.status === "running" ? "in progress..." : "queued"}
            </p>
            {job.status === "failed" && job.error_message && (
              <p className="text-xs text-[#C0392B] mt-0.5">{job.error_message}</p>
            )}
            {job.status === "complete" && job.metrics && (
              <div className="flex gap-4 mt-1">
                {Object.entries(job.metrics).slice(0, 4).map(([k, v]) => (
                  <span key={k} className="text-xs text-[#1A1A1A]">
                    <span className="text-[#666666]">{k}:</span>{" "}
                    <strong>{typeof v === "number" ? v.toFixed(4) : String(v)}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
          {job.status === "complete" && (
            <Button
              size="sm"
              onClick={() => {
                router.push(`/project/${project.id}/step4`);
              }}
            >
              View Results
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model config */}
        {isML ? (
          <div className="bg-white rounded-lg border border-[#CCCCCC] shadow-sm p-5">
            <h3 className="font-semibold text-[#1A1A1A] mb-4">Model Selection</h3>
            <div className="space-y-3 mb-5">
              {availableModels.map((m) => (
                <label
                  key={m.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedModel === m.value ? "border-[#2E75B6] bg-[#D6E4F0]/30" : "border-[#CCCCCC] hover:border-[#2E75B6]/40"
                  }`}
                >
                  <input
                    type="radio"
                    value={m.value}
                    checked={selectedModel === m.value}
                    onChange={() => setSelectedModel(m.value)}
                    className="text-[#2E75B6]"
                  />
                  <span className="text-sm font-medium text-[#1A1A1A]">{m.label}</span>
                </label>
              ))}
            </div>

            {/* Hyperparameters */}
            <h4 className="font-medium text-sm text-[#1A1A1A] mb-3">Hyperparameters</h4>
            <div className="space-y-3">
              {ML_HYPERPARAMS[selectedModel].map((param) => (
                <div key={param.key} className="space-y-1">
                  <Label className="text-xs">{param.label}</Label>
                  {param.type === "select" ? (
                    <Select
                      value={String(hyperparams[param.key] ?? param.default)}
                      onValueChange={(v) => setHyperparams((prev) => ({ ...prev, [param.key]: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {param.options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : param.type === "boolean" ? (
                    <Switch
                      checked={Boolean(hyperparams[param.key] ?? param.default)}
                      onCheckedChange={(v) => setHyperparams((prev) => ({ ...prev, [param.key]: v }))}
                    />
                  ) : (
                    <Input
                      type="number"
                      value={String(hyperparams[param.key] ?? param.default)}
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      onChange={(e) => setHyperparams((prev) => ({ ...prev, [param.key]: Number(e.target.value) }))}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* NN Builder */
          <div className="bg-white rounded-lg border border-[#CCCCCC] shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#1A1A1A]">Neural Network Layers</h3>
              <Select onValueChange={(v) => addLayer(v as typeof LAYER_TYPES[number])}>
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue placeholder="Add layer" />
                </SelectTrigger>
                <SelectContent>
                  {LAYER_TYPES.map((lt) => (
                    <SelectItem key={lt} value={lt} className="text-xs capitalize">{lt.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {layers.map((layer, i) => (
                <div key={layer.id} className="border border-[#CCCCCC] rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#1B3A5C]">
                    <span className="text-xs font-semibold text-white flex-1 capitalize">
                      {i + 1}. {layer.layer_type.replace("_", " ")}
                    </span>
                    <button onClick={() => removeLayer(layer.id)} className="text-white/60 hover:text-white">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="p-3 grid grid-cols-2 gap-2">
                    {Object.entries(layer.params).map(([k, v]) => (
                      <div key={k}>
                        <Label className="text-[10px] text-[#666666]">{k}</Label>
                        {typeof v === "boolean" ? (
                          <Switch checked={v} onCheckedChange={(val) => updateLayer(layer.id, { ...layer.params, [k]: val })} />
                        ) : (
                          <Input
                            type={typeof v === "number" ? "number" : "text"}
                            value={String(v)}
                            className="h-7 text-xs"
                            onChange={(e) => updateLayer(layer.id, { ...layer.params, [k]: typeof v === "number" ? Number(e.target.value) : e.target.value })}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* DL Training config */}
            <div className="mt-4 pt-4 border-t border-[#EEEEEE] space-y-3">
              <h4 className="font-medium text-sm">Training Config</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Optimizer</Label>
                  <Select value={optimizer} onValueChange={setOptimizer}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["adam","sgd","rmsprop","adagrad"].map((o) => <SelectItem key={o} value={o}>{o.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Learning Rate</Label>
                  <Input type="number" value={learningRate} min={0.00001} max={1.0} step={0.0001} onChange={(e) => setLearningRate(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Epochs</Label>
                  <Input type="number" value={epochs} min={1} max={500} step={1} onChange={(e) => setEpochs(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Batch Size</Label>
                  <Select value={String(batchSize)} onValueChange={(v) => setBatchSize(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[16,32,64,128,256].map((b) => <SelectItem key={b} value={String(b)}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={earlyStopping} onCheckedChange={setEarlyStopping} />
                <Label className="text-xs">Early Stopping</Label>
                {earlyStopping && (
                  <>
                    <span className="text-xs text-[#666666] ml-2">Patience:</span>
                    <Input type="number" value={patience} min={1} max={50} className="h-7 w-16 text-xs" onChange={(e) => setPatience(Number(e.target.value))} />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Train/Val Split + Train button */}
        <div className="space-y-5">
          <div className="bg-white rounded-lg border border-[#CCCCCC] shadow-sm p-5">
            <h3 className="font-semibold text-[#1A1A1A] mb-4">Training Configuration</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Train / Validation Split</Label>
                  <span className="text-sm font-mono text-[#2E75B6]">
                    {Math.round(trainSplit * 100)}% / {Math.round((1 - trainSplit) * 100)}%
                  </span>
                </div>
                <Slider
                  value={[trainSplit * 100]}
                  min={50} max={95} step={5}
                  onValueChange={([v]) => setTrainSplit(v / 100)}
                />
                <div className="flex justify-between text-xs text-[#666666] mt-1">
                  <span>50/50</span><span>80/20 (default)</span><span>95/5</span>
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block">Random Seed</Label>
                <Input
                  type="number"
                  value={randomSeed}
                  onChange={(e) => setRandomSeed(Number(e.target.value))}
                  className="w-32"
                />
              </div>

              {project.problem_type === "classification" && (
                <div className="flex items-center gap-2">
                  <Switch checked={stratified} onCheckedChange={setStratified} />
                  <Label>Stratified split</Label>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleTrain}
            loading={submitting}
            size="lg"
            className="w-full"
            disabled={job?.status === "running" || job?.status === "queued"}
          >
            <Play className="w-4 h-4" />
            {job?.status === "running" ? "Training in progress..." :
             job?.status === "queued" ? "Job queued..." :
             "Train Model"}
          </Button>

          {!job && (
            <p className="text-xs text-[#666666] text-center">
              Training requires the FastAPI ML service to be running. The job will be queued.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
