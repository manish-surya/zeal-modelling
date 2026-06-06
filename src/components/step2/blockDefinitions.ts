import { BlockType } from "@/types";

export interface BlockDefinition {
  label: string;
  description: string;
  appliesTo: string[];
  defaultParams: Record<string, unknown>;
  paramSchema: ParamSchema[];
}

export interface ParamSchema {
  key: string;
  label: string;
  type: "select" | "number" | "boolean" | "multiselect_columns";
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  help?: string;
}

export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
  // --- Numeric ---
  imputer: {
    label: "Imputer",
    description: "Fill missing numeric values with a chosen strategy.",
    appliesTo: ["numeric"],
    defaultParams: { strategy: "mean" },
    paramSchema: [
      { key: "strategy", label: "Strategy", type: "select", options: [
        { value: "mean", label: "Mean" },
        { value: "median", label: "Median" },
        { value: "most_frequent", label: "Most Frequent" },
        { value: "constant", label: "Constant (0)" },
      ], help: "How to fill missing values" },
    ],
  },
  scaler: {
    label: "Scaler",
    description: "Normalise numeric feature scales.",
    appliesTo: ["numeric"],
    defaultParams: { type: "StandardScaler" },
    paramSchema: [
      { key: "type", label: "Scaler Type", type: "select", options: [
        { value: "StandardScaler", label: "StandardScaler (z-score)" },
        { value: "MinMaxScaler", label: "MinMaxScaler (0–1)" },
        { value: "RobustScaler", label: "RobustScaler (IQR)" },
      ]},
    ],
  },
  polynomial_features: {
    label: "Polynomial Features",
    description: "Generate polynomial and interaction terms.",
    appliesTo: ["numeric"],
    defaultParams: { degree: 2, interaction_only: false },
    paramSchema: [
      { key: "degree", label: "Degree", type: "number", min: 2, max: 4, step: 1 },
      { key: "interaction_only", label: "Interaction Only", type: "boolean" },
    ],
  },
  log_transform: {
    label: "Log Transform",
    description: "Apply log transformation to reduce skewness.",
    appliesTo: ["numeric"],
    defaultParams: { base: "natural" },
    paramSchema: [
      { key: "base", label: "Log Base", type: "select", options: [
        { value: "natural", label: "Natural (ln)" },
        { value: "log10", label: "Log base 10" },
        { value: "log2", label: "Log base 2" },
      ]},
    ],
  },
  binning: {
    label: "Binning",
    description: "Discretise continuous values into bins.",
    appliesTo: ["numeric"],
    defaultParams: { n_bins: 5, strategy: "quantile" },
    paramSchema: [
      { key: "n_bins", label: "Number of Bins", type: "number", min: 2, max: 20, step: 1 },
      { key: "strategy", label: "Strategy", type: "select", options: [
        { value: "uniform", label: "Uniform" },
        { value: "quantile", label: "Quantile" },
        { value: "kmeans", label: "K-Means" },
      ]},
    ],
  },
  outlier_removal: {
    label: "Outlier Removal",
    description: "Clip or remove extreme values.",
    appliesTo: ["numeric"],
    defaultParams: { method: "IQR", action: "clip" },
    paramSchema: [
      { key: "method", label: "Detection Method", type: "select", options: [
        { value: "IQR", label: "IQR (1.5x)" },
        { value: "zscore", label: "Z-Score (3σ)" },
      ]},
      { key: "action", label: "Action", type: "select", options: [
        { value: "clip", label: "Clip to boundary" },
        { value: "remove", label: "Remove rows" },
      ]},
    ],
  },
  // --- Categorical ---
  one_hot_encoder: {
    label: "One-Hot Encoder",
    description: "Create binary indicator columns per category.",
    appliesTo: ["categorical"],
    defaultParams: { drop: "first", handle_unknown: "ignore" },
    paramSchema: [
      { key: "drop", label: "Drop First", type: "select", options: [
        { value: "first", label: "Drop first (avoid collinearity)" },
        { value: "none", label: "Keep all categories" },
      ]},
      { key: "handle_unknown", label: "Handle Unknown", type: "select", options: [
        { value: "ignore", label: "Ignore (encode as zeros)" },
        { value: "error", label: "Raise error" },
      ]},
    ],
  },
  label_encoder: {
    label: "Label Encoder",
    description: "Encode categories as integers (ordinal encoding).",
    appliesTo: ["categorical"],
    defaultParams: {},
    paramSchema: [],
  },
  ordinal_encoder: {
    label: "Ordinal Encoder",
    description: "Encode categories with explicit ordering.",
    appliesTo: ["categorical"],
    defaultParams: {},
    paramSchema: [],
  },
  frequency_encoder: {
    label: "Frequency Encoder",
    description: "Replace categories with their frequency in the dataset.",
    appliesTo: ["categorical"],
    defaultParams: {},
    paramSchema: [],
  },
  categorical_imputer: {
    label: "Categorical Imputer",
    description: "Fill missing categorical values.",
    appliesTo: ["categorical"],
    defaultParams: { fill_value: "missing", strategy: "constant" },
    paramSchema: [
      { key: "strategy", label: "Strategy", type: "select", options: [
        { value: "constant", label: "Fill with 'missing'" },
        { value: "most_frequent", label: "Most Frequent" },
      ]},
    ],
  },
  // --- Column-level ---
  drop_columns: {
    label: "Drop Columns",
    description: "Remove specified columns from the pipeline.",
    appliesTo: ["any"],
    defaultParams: {},
    paramSchema: [
      { key: "columns", label: "Columns to Drop", type: "multiselect_columns" },
    ],
  },
  select_features: {
    label: "Select Features",
    description: "Keep only specified columns.",
    appliesTo: ["any"],
    defaultParams: {},
    paramSchema: [
      { key: "columns", label: "Columns to Keep", type: "multiselect_columns" },
    ],
  },
  rename_column: {
    label: "Rename Column",
    description: "Rename a column.",
    appliesTo: ["any"],
    defaultParams: { old_name: "", new_name: "" },
    paramSchema: [],
  },
  datetime_extractor: {
    label: "DateTime Extractor",
    description: "Extract date components from DateTime columns.",
    appliesTo: ["datetime"],
    defaultParams: { parts: ["year", "month", "day"] },
    paramSchema: [],
  },
  text_vectoriser: {
    label: "Text Vectoriser",
    description: "TF-IDF vectorisation for text columns.",
    appliesTo: ["text"],
    defaultParams: { max_features: 1000, ngram_range: "1,1" },
    paramSchema: [
      { key: "max_features", label: "Max Features", type: "number", min: 100, max: 10000, step: 100 },
      { key: "ngram_range", label: "N-gram Range", type: "select", options: [
        { value: "1,1", label: "Unigrams (1,1)" },
        { value: "1,2", label: "Unigrams + Bigrams (1,2)" },
        { value: "2,2", label: "Bigrams only (2,2)" },
      ]},
    ],
  },
  correlation_filter: {
    label: "Correlation Filter",
    description: "Remove highly correlated features.",
    appliesTo: ["numeric"],
    defaultParams: { threshold: 0.9 },
    paramSchema: [
      { key: "threshold", label: "Correlation Threshold", type: "number", min: 0.8, max: 1.0, step: 0.05 },
    ],
  },
  variance_filter: {
    label: "Variance Filter",
    description: "Remove low-variance features.",
    appliesTo: ["numeric"],
    defaultParams: { threshold: 0.01 },
    paramSchema: [
      { key: "threshold", label: "Variance Threshold", type: "number", min: 0.0, max: 0.1, step: 0.01 },
    ],
  },
};
