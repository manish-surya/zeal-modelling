export type ModelType = "ml_supervised" | "deep_learning";
export type ProblemType = "classification" | "regression" | null;
export type ProjectStatus = "draft" | "in_progress" | "completed" | "exported";
export type JobStatus = "queued" | "running" | "complete" | "failed";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  model_type: ModelType;
  problem_type: ProblemType;
  current_step: number;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  datasets?: Dataset[];
}

export type ColumnType =
  | "numeric"
  | "categorical"
  | "boolean"
  | "datetime"
  | "text"
  | "id";

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  detected_type: ColumnType;
  override_type: ColumnType | null;
  is_target: boolean;
  sample_values?: string[];
  null_count?: number;
  cardinality?: number;
}

export interface Dataset {
  id: string;
  project_id: string;
  storage_path: string;
  file_name: string;
  file_size_bytes: number;
  row_count: number | null;
  column_count: number | null;
  column_meta: ColumnMeta[] | null;
  target_column: string | null;
  created_at: string;
}

// Pipeline block types
export type BlockType =
  // 🧹 Data Cleaning
  | "imputer" | "categorical_imputer" | "outlier_removal" | "duplicate_removal"
  // 📏 Scaling & Normalization
  | "scaler" | "normalizer" | "maxabs_scaler"
  // 🏷️ Encoding
  | "one_hot_encoder" | "label_encoder" | "ordinal_encoder"
  | "target_encoder" | "frequency_encoder"
  // 🔄 Transformation
  | "log_transform" | "power_transform" | "quantile_transform" | "sqrt_transform"
  // ⚗️ Feature Generation
  | "polynomial_features" | "binning" | "datetime_extractor" | "text_vectoriser"
  // 🎯 Feature Selection
  | "variance_filter" | "correlation_filter" | "select_k_best" | "feature_selection_model"
  // 📉 Dimensionality Reduction
  | "pca" | "truncated_svd" | "kernel_pca"
  // 📁 Column Operations
  | "select_features" | "drop_columns" | "column_splitter" | "column_merger";

export interface ParamTuning {
  type: "range";
  min: number; max: number; step?: number;
} | {
  type: "values";
  values: unknown[];
}

export interface PipelineBlock {
  id: string;
  block_type: BlockType;
  params: Record<string, unknown>;
  column_targets: string[];
  label?: string;
  tuning?: Record<string, ParamTuning>;
}

export type PipelineTemplate =
  | "classification" | "regression" | "time_series" | "nlp"
  | "feature_selection" | "dim_reduction" | "cleaning_only"
  | "categorical_heavy" | "blank";

export interface Pipeline {
  id: string;
  project_id: string;
  version: number;
  config: PipelineBlock[];
  template: PipelineTemplate | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ML models
export type MLModelType =
  | "logistic_regression"
  | "decision_tree"
  | "random_forest"
  | "gradient_boosting"
  | "svm"
  | "knn"
  | "linear_regression"
  | "ridge"
  | "lasso";

// NN Layer types
export type LayerType =
  | "dense"
  | "dropout"
  | "batch_norm"
  | "conv1d"
  | "lstm"
  | "flatten";

export interface NNLayer {
  id: string;
  layer_type: LayerType;
  params: Record<string, unknown>;
}

export interface TrainingConfig {
  // ML
  model_type?: MLModelType;
  hyperparameters?: Record<string, unknown>;
  // Deep learning
  layers?: NNLayer[];
  optimizer?: string;
  learning_rate?: number;
  epochs?: number;
  batch_size?: number;
  early_stopping?: boolean;
  early_stopping_patience?: number;
  loss_function?: string;
  // Common
  train_val_split: number;
  random_seed: number;
  stratified_split: boolean;
  cross_validation?: number | null;
}

export interface TrainingJob {
  id: string;
  project_id: string;
  pipeline_id: string | null;
  model_type: string;
  hyperparameters: Record<string, unknown>;
  train_val_split: number;
  random_seed: number;
  status: JobStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  metrics: Record<string, unknown> | null;
  model_storage_path: string | null;
  created_at: string;
}
