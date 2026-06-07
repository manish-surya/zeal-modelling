import { BlockType } from "@/types";

export interface ParamSchema {
  key: string; label: string;
  type: "select" | "number" | "boolean" | "multiselect_columns" | "text";
  options?: { value: string; label: string }[];
  min?: number; max?: number; step?: number; help?: string; tunable?: boolean;
}

export interface BlockDefinition {
  label: string; description: string; category: BlockCategory;
  color: string; icon: string; appliesTo: string[];
  defaultParams: Record<string, unknown>;
  paramSchema: ParamSchema[];
  keyParam?: string;
}

export type BlockCategory =
  | "cleaning" | "scaling" | "encoding" | "transformation"
  | "feature_gen" | "feature_selection" | "dim_reduction" | "column_ops";

export const CATEGORY_META: Record<BlockCategory, { label: string; icon: string; color: string; darkColor: string }> = {
  cleaning:          { label: "Data Cleaning",           icon: "🧹", color: "bg-orange-600",  darkColor: "dark:bg-orange-700" },
  scaling:           { label: "Scaling & Normalization",  icon: "📏", color: "bg-blue-600",    darkColor: "dark:bg-blue-700" },
  encoding:          { label: "Encoding",                 icon: "🏷️", color: "bg-purple-600",  darkColor: "dark:bg-purple-700" },
  transformation:    { label: "Transformation",           icon: "🔄", color: "bg-teal-600",    darkColor: "dark:bg-teal-700" },
  feature_gen:       { label: "Feature Generation",       icon: "⚗️", color: "bg-green-600",   darkColor: "dark:bg-green-700" },
  feature_selection: { label: "Feature Selection",        icon: "🎯", color: "bg-red-600",     darkColor: "dark:bg-red-700" },
  dim_reduction:     { label: "Dimensionality Reduction", icon: "📉", color: "bg-indigo-600",  darkColor: "dark:bg-indigo-700" },
  column_ops:        { label: "Column Operations",        icon: "📁", color: "bg-slate-600",   darkColor: "dark:bg-slate-700" },
};

export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
  // ── CLEANING ────────────────────────────────────────────────────────────────
  imputer: {
    label: "Numeric Imputer", category: "cleaning", icon: "🧹", color: "bg-orange-600",
    description: "Fill missing numeric values using mean, median, KNN, or MICE.",
    appliesTo: ["numeric"],
    defaultParams: { strategy: "mean", fill_value: 0, n_neighbors: 5 },
    keyParam: "strategy",
    paramSchema: [
      { key: "strategy", label: "Strategy", type: "select",
        options: [
          { value: "mean",          label: "Mean" },
          { value: "median",        label: "Median" },
          { value: "most_frequent", label: "Most Frequent" },
          { value: "constant",      label: "Constant" },
          { value: "knn",           label: "KNN Imputer" },
          { value: "iterative",     label: "Iterative (MICE)" },
        ], help: "KNN and MICE are more accurate but slower." },
      { key: "fill_value",   label: "Constant Value", type: "number", min: -1e9, max: 1e9, step: 1 },
      { key: "n_neighbors",  label: "K Neighbours (KNN)", type: "number", min: 1, max: 20, step: 1, tunable: true },
    ],
  },
  categorical_imputer: {
    label: "Categorical Imputer", category: "cleaning", icon: "🧹", color: "bg-orange-600",
    description: "Fill missing categorical / boolean values.",
    appliesTo: ["categorical","boolean","text"],
    defaultParams: { strategy: "most_frequent", fill_value: "missing" },
    keyParam: "strategy",
    paramSchema: [
      { key: "strategy",   label: "Strategy", type: "select", options: [
        { value: "most_frequent", label: "Most Frequent" },
        { value: "constant",      label: "Constant String" },
        { value: "new_category",  label: "New category (\"missing\")" },
      ]},
      { key: "fill_value", label: "Constant Value", type: "text" },
    ],
  },
  outlier_removal: {
    label: "Outlier Removal", category: "cleaning", icon: "🧹", color: "bg-orange-600",
    description: "Detect and clip/remove outliers using IQR, Z-score, or Isolation Forest.",
    appliesTo: ["numeric"],
    defaultParams: { method: "iqr", threshold: 1.5, action: "clip" },
    keyParam: "method",
    paramSchema: [
      { key: "method", label: "Detection Method", type: "select", options: [
        { value: "iqr",              label: "IQR (Tukey Fence)" },
        { value: "zscore",           label: "Z-Score" },
        { value: "isolation_forest", label: "Isolation Forest" },
        { value: "lof",              label: "Local Outlier Factor" },
      ]},
      { key: "threshold", label: "Threshold (IQR factor / Z-score)", type: "number", min: 0.5, max: 5, step: 0.1, tunable: true },
      { key: "action",    label: "Action on Outlier", type: "select", options: [
        { value: "clip",   label: "Clip to bound" },
        { value: "remove", label: "Remove row" },
        { value: "flag",   label: "Flag (add indicator column)" },
      ]},
    ],
  },
  duplicate_removal: {
    label: "Remove Duplicates", category: "cleaning", icon: "🧹", color: "bg-orange-600",
    description: "Drop duplicate rows.",
    appliesTo: ["all"],
    defaultParams: { keep: "first" },
    keyParam: "keep",
    paramSchema: [
      { key: "keep", label: "Keep", type: "select", options: [
        { value: "first", label: "First occurrence" },
        { value: "last",  label: "Last occurrence" },
        { value: "none",  label: "Drop all duplicates" },
      ]},
    ],
  },

  // ── SCALING ──────────────────────────────────────────────────────────────────
  scaler: {
    label: "Scaler", category: "scaling", icon: "📏", color: "bg-blue-600",
    description: "Normalize numeric feature magnitudes.",
    appliesTo: ["numeric"],
    defaultParams: { method: "standard", feature_range_min: 0, feature_range_max: 1 },
    keyParam: "method",
    paramSchema: [
      { key: "method", label: "Scaler Type", type: "select", options: [
        { value: "standard", label: "StandardScaler — zero mean, unit variance" },
        { value: "minmax",   label: "MinMaxScaler — scale to [min, max]" },
        { value: "robust",   label: "RobustScaler — median / IQR (outlier-robust)" },
        { value: "maxabs",   label: "MaxAbsScaler — scale to [-1, 1]" },
      ]},
      { key: "feature_range_min", label: "Range Min (MinMax)", type: "number", min: -10, max: 0,   step: 0.1 },
      { key: "feature_range_max", label: "Range Max (MinMax)", type: "number", min: 0.1, max: 10,  step: 0.1 },
    ],
  },
  normalizer: {
    label: "Normalizer", category: "scaling", icon: "📏", color: "bg-blue-600",
    description: "Normalize each sample (row) to unit norm.",
    appliesTo: ["numeric"],
    defaultParams: { norm: "l2" },
    keyParam: "norm",
    paramSchema: [
      { key: "norm", label: "Norm", type: "select", options: [
        { value: "l1",  label: "L1 (Manhattan)" },
        { value: "l2",  label: "L2 (Euclidean)" },
        { value: "max", label: "Max norm" },
      ]},
    ],
  },
  maxabs_scaler: {
    label: "MaxAbs Scaler", category: "scaling", icon: "📏", color: "bg-blue-600",
    description: "Scale to [-1, 1]. Does not center — good for sparse data.",
    appliesTo: ["numeric"],
    defaultParams: {},
    paramSchema: [],
  },

  // ── ENCODING ─────────────────────────────────────────────────────────────────
  one_hot_encoder: {
    label: "One-Hot Encoder", category: "encoding", icon: "🏷️", color: "bg-purple-600",
    description: "Expand categories into binary columns. Best for nominal (unordered) data.",
    appliesTo: ["categorical","boolean"],
    defaultParams: { drop: "first", max_categories: 20, handle_unknown: "ignore" },
    keyParam: "drop",
    paramSchema: [
      { key: "drop", label: "Drop Strategy", type: "select", options: [
        { value: "none",      label: "Keep all" },
        { value: "first",     label: "Drop first (reduce multicollinearity)" },
        { value: "if_binary", label: "Drop if binary" },
      ]},
      { key: "max_categories",   label: "Max Categories (cap)", type: "number", min: 2, max: 500, step: 1, tunable: true },
      { key: "handle_unknown",   label: "Unknown Handling", type: "select", options: [
        { value: "ignore", label: "Ignore (zeros)" },
        { value: "error",  label: "Raise error" },
      ]},
    ],
  },
  label_encoder: {
    label: "Label Encoder", category: "encoding", icon: "🏷️", color: "bg-purple-600",
    description: "Encode categories as integers 0…N-1.",
    appliesTo: ["categorical","boolean"],
    defaultParams: {},
    paramSchema: [],
  },
  ordinal_encoder: {
    label: "Ordinal Encoder", category: "encoding", icon: "🏷️", color: "bg-purple-600",
    description: "Encode categories with a user-defined order.",
    appliesTo: ["categorical"],
    defaultParams: { handle_unknown: "use_encoded_value" },
    keyParam: undefined,
    paramSchema: [
      { key: "handle_unknown", label: "Unknown Handling", type: "select", options: [
        { value: "use_encoded_value", label: "Assign -1" },
        { value: "error",             label: "Raise error" },
      ]},
    ],
  },
  target_encoder: {
    label: "Target Encoder", category: "encoding", icon: "🏷️", color: "bg-purple-600",
    description: "Replace categories with mean target value. Powerful but use with CV to avoid leakage.",
    appliesTo: ["categorical"],
    defaultParams: { smooth: "auto" },
    keyParam: "smooth",
    paramSchema: [
      { key: "smooth", label: "Smoothing", type: "select", options: [
        { value: "auto", label: "Auto" },
        { value: "1.0",  label: "1.0 (low regularization)" },
        { value: "10.0", label: "10.0 (high regularization)" },
      ], help: "Higher smoothing pulls towards global mean, reducing overfit." },
    ],
  },
  frequency_encoder: {
    label: "Frequency Encoder", category: "encoding", icon: "🏷️", color: "bg-purple-600",
    description: "Replace categories with their frequency. Low-leakage alternative to target encoding.",
    appliesTo: ["categorical"],
    defaultParams: { normalize: true },
    keyParam: "normalize",
    paramSchema: [
      { key: "normalize", label: "Use Proportion (not raw count)", type: "boolean" },
    ],
  },

  // ── TRANSFORMATION ───────────────────────────────────────────────────────────
  log_transform: {
    label: "Log Transform", category: "transformation", icon: "🔄", color: "bg-teal-600",
    description: "log(x + shift) to reduce right-skewness.",
    appliesTo: ["numeric"],
    defaultParams: { base: "natural", shift: 1 },
    keyParam: "base",
    paramSchema: [
      { key: "base",  label: "Log Base", type: "select", options: [
        { value: "natural", label: "Natural (ln)" },
        { value: "log10",   label: "Log₁₀" },
        { value: "log2",    label: "Log₂" },
      ]},
      { key: "shift", label: "Shift (add before log)", type: "number", min: 0, max: 100, step: 0.1,
        help: "Set to 1 to safely handle zeros (log(x+1))." },
    ],
  },
  power_transform: {
    label: "Power Transform", category: "transformation", icon: "🔄", color: "bg-teal-600",
    description: "Box-Cox or Yeo-Johnson to make data more Gaussian.",
    appliesTo: ["numeric"],
    defaultParams: { method: "yeo-johnson", standardize: true },
    keyParam: "method",
    paramSchema: [
      { key: "method", label: "Method", type: "select", options: [
        { value: "yeo-johnson", label: "Yeo-Johnson (handles negatives & zeros)" },
        { value: "box-cox",     label: "Box-Cox (positive values only)" },
      ]},
      { key: "standardize", label: "Standardize Output", type: "boolean" },
    ],
  },
  quantile_transform: {
    label: "Quantile Transform", category: "transformation", icon: "🔄", color: "bg-teal-600",
    description: "Map to uniform or normal distribution. Robust to outliers.",
    appliesTo: ["numeric"],
    defaultParams: { output_distribution: "normal", n_quantiles: 1000 },
    keyParam: "output_distribution",
    paramSchema: [
      { key: "output_distribution", label: "Output Distribution", type: "select", options: [
        { value: "normal",  label: "Normal (Gaussian)" },
        { value: "uniform", label: "Uniform [0, 1]" },
      ]},
      { key: "n_quantiles", label: "Number of Quantiles", type: "number", min: 10, max: 5000, step: 10, tunable: true },
    ],
  },
  sqrt_transform: {
    label: "Square Root Transform", category: "transformation", icon: "🔄", color: "bg-teal-600",
    description: "√x transform — gentler than log, good for count data.",
    appliesTo: ["numeric"],
    defaultParams: {},
    paramSchema: [],
  },

  // ── FEATURE GENERATION ───────────────────────────────────────────────────────
  polynomial_features: {
    label: "Polynomial Features", category: "feature_gen", icon: "⚗️", color: "bg-green-600",
    description: "Generate polynomial and interaction terms. Warning: rapid dimensionality growth.",
    appliesTo: ["numeric"],
    defaultParams: { degree: 2, interaction_only: false, include_bias: false },
    keyParam: "degree",
    paramSchema: [
      { key: "degree",           label: "Degree",                type: "number",  min: 2, max: 5, step: 1, tunable: true },
      { key: "interaction_only", label: "Interaction Terms Only",type: "boolean", help: "Only cross-terms (x·y), no higher powers." },
      { key: "include_bias",     label: "Include Bias Column",   type: "boolean" },
    ],
  },
  binning: {
    label: "Binning / Discretization", category: "feature_gen", icon: "⚗️", color: "bg-green-600",
    description: "Convert continuous values to categorical bins.",
    appliesTo: ["numeric"],
    defaultParams: { n_bins: 5, strategy: "quantile", encode: "onehot" },
    keyParam: "strategy",
    paramSchema: [
      { key: "n_bins",   label: "Number of Bins",  type: "number", min: 2, max: 50, step: 1, tunable: true },
      { key: "strategy", label: "Bin Strategy",    type: "select", options: [
        { value: "quantile", label: "Quantile (equal frequency)" },
        { value: "uniform",  label: "Uniform (equal width)" },
        { value: "kmeans",   label: "K-Means cluster centres" },
      ]},
      { key: "encode",   label: "Encoding Output", type: "select", options: [
        { value: "onehot",  label: "One-hot encoded" },
        { value: "ordinal", label: "Ordinal integer" },
      ]},
    ],
  },
  datetime_extractor: {
    label: "Datetime Extractor", category: "feature_gen", icon: "⚗️", color: "bg-green-600",
    description: "Extract year, month, day, hour, day-of-week from datetime columns.",
    appliesTo: ["datetime"],
    defaultParams: { extract: "all", drop_original: true },
    keyParam: "extract",
    paramSchema: [
      { key: "extract", label: "Components", type: "select", options: [
        { value: "all",  label: "All (year, month, day, hour, dayofweek, quarter)" },
        { value: "date", label: "Date only (year, month, day)" },
        { value: "time", label: "Time only (hour, minute, second)" },
      ]},
      { key: "drop_original", label: "Drop Original Column", type: "boolean" },
    ],
  },
  text_vectoriser: {
    label: "Text Vectoriser", category: "feature_gen", icon: "⚗️", color: "bg-green-600",
    description: "Convert text to numeric features using TF-IDF or bag-of-words.",
    appliesTo: ["text"],
    defaultParams: { method: "tfidf", max_features: 1000, ngram_max: 1 },
    keyParam: "method",
    paramSchema: [
      { key: "method",       label: "Method",         type: "select", options: [
        { value: "tfidf",   label: "TF-IDF" },
        { value: "count",   label: "CountVectorizer (BoW)" },
        { value: "hashing", label: "Hashing Trick (memory-efficient)" },
      ]},
      { key: "max_features", label: "Max Vocabulary", type: "number", min: 50, max: 50000, step: 50, tunable: true },
      { key: "ngram_max",    label: "Max N-gram",     type: "number", min: 1, max: 3, step: 1, tunable: true },
    ],
  },

  // ── FEATURE SELECTION ────────────────────────────────────────────────────────
  variance_filter: {
    label: "Variance Threshold", category: "feature_selection", icon: "🎯", color: "bg-red-600",
    description: "Remove near-constant features (low variance).",
    appliesTo: ["numeric"],
    defaultParams: { threshold: 0.01 },
    keyParam: "threshold",
    paramSchema: [
      { key: "threshold", label: "Variance Threshold", type: "number", min: 0, max: 1, step: 0.001, tunable: true },
    ],
  },
  correlation_filter: {
    label: "Correlation Filter", category: "feature_selection", icon: "🎯", color: "bg-red-600",
    description: "Remove highly correlated redundant features.",
    appliesTo: ["numeric"],
    defaultParams: { threshold: 0.9, method: "pearson" },
    keyParam: "threshold",
    paramSchema: [
      { key: "threshold", label: "Correlation Threshold", type: "number", min: 0.5, max: 1.0, step: 0.01, tunable: true },
      { key: "method",    label: "Method", type: "select", options: [
        { value: "pearson",  label: "Pearson (linear)" },
        { value: "spearman", label: "Spearman (rank)" },
      ]},
    ],
  },
  select_k_best: {
    label: "Select K Best", category: "feature_selection", icon: "🎯", color: "bg-red-600",
    description: "Keep the K highest-scoring features by statistical test.",
    appliesTo: ["numeric"],
    defaultParams: { k: 10, score_func: "f_classif" },
    keyParam: "score_func",
    paramSchema: [
      { key: "k",          label: "K (features to keep)",type: "number", min: 1, max: 500, step: 1, tunable: true },
      { key: "score_func", label: "Score Function",       type: "select", options: [
        { value: "f_classif",              label: "ANOVA F-value (classification)" },
        { value: "f_regression",           label: "F-value (regression)" },
        { value: "mutual_info_classif",    label: "Mutual Info (classification)" },
        { value: "mutual_info_regression", label: "Mutual Info (regression)" },
        { value: "chi2",                   label: "Chi-squared (non-negative)" },
      ]},
    ],
  },
  feature_selection_model: {
    label: "Model-Based Selection", category: "feature_selection", icon: "🎯", color: "bg-red-600",
    description: "Select features using L1 regularization or tree importances.",
    appliesTo: ["numeric"],
    defaultParams: { method: "l1", C: 0.1, threshold: "mean" },
    keyParam: "method",
    paramSchema: [
      { key: "method", label: "Method", type: "select", options: [
        { value: "l1",   label: "L1 / Lasso" },
        { value: "tree", label: "Tree Feature Importance" },
        { value: "rfe",  label: "Recursive Feature Elimination (RFE)" },
      ]},
      { key: "C",         label: "Regularisation C (L1)", type: "number", min: 0.001, max: 10, step: 0.01, tunable: true },
      { key: "threshold", label: "Threshold (tree)",      type: "select", options: [
        { value: "mean",   label: "Mean importance" },
        { value: "median", label: "Median importance" },
      ]},
    ],
  },

  // ── DIMENSIONALITY REDUCTION ─────────────────────────────────────────────────
  pca: {
    label: "PCA", category: "dim_reduction", icon: "📉", color: "bg-indigo-600",
    description: "Principal Component Analysis — project to lower-dimensional space of maximum variance.",
    appliesTo: ["numeric"],
    defaultParams: { n_components: 10, whiten: false, svd_solver: "auto" },
    keyParam: "n_components",
    paramSchema: [
      { key: "n_components", label: "Components (int or variance fraction)", type: "number", min: 1, max: 500, step: 1, tunable: true,
        help: "Integer = fixed components. Decimal (0.95) = keep 95% variance." },
      { key: "whiten",       label: "Whiten Output", type: "boolean" },
      { key: "svd_solver",   label: "SVD Solver",    type: "select", options: [
        { value: "auto",       label: "Auto" },
        { value: "full",       label: "Full (exact)" },
        { value: "randomized", label: "Randomized (fast for large data)" },
      ]},
    ],
  },
  truncated_svd: {
    label: "Truncated SVD", category: "dim_reduction", icon: "📉", color: "bg-indigo-600",
    description: "Like PCA but works on sparse matrices. Use after TF-IDF.",
    appliesTo: ["numeric"],
    defaultParams: { n_components: 100, n_iter: 5 },
    keyParam: "n_components",
    paramSchema: [
      { key: "n_components", label: "Components", type: "number", min: 1, max: 1000, step: 1, tunable: true },
      { key: "n_iter",       label: "Iterations",  type: "number", min: 1, max: 20, step: 1 },
    ],
  },
  kernel_pca: {
    label: "Kernel PCA", category: "dim_reduction", icon: "📉", color: "bg-indigo-600",
    description: "Non-linear dimensionality reduction via kernel trick.",
    appliesTo: ["numeric"],
    defaultParams: { n_components: 10, kernel: "rbf", gamma: 0.1, degree: 3 },
    keyParam: "kernel",
    paramSchema: [
      { key: "n_components", label: "Components", type: "number", min: 1, max: 500, step: 1, tunable: true },
      { key: "kernel",       label: "Kernel",     type: "select", options: [
        { value: "rbf",     label: "RBF (Gaussian)" },
        { value: "poly",    label: "Polynomial" },
        { value: "sigmoid", label: "Sigmoid" },
        { value: "cosine",  label: "Cosine" },
      ]},
      { key: "gamma",  label: "Gamma",          type: "number", min: 1e-5, max: 10, step: 0.01, tunable: true },
      { key: "degree", label: "Degree (Poly)",  type: "number", min: 2,    max: 5,  step: 1,    tunable: true },
    ],
  },

  // ── COLUMN OPERATIONS ────────────────────────────────────────────────────────
  select_features: {
    label: "Select Columns", category: "column_ops", icon: "📁", color: "bg-slate-600",
    description: "Keep only specified columns.",
    appliesTo: ["all"],
    defaultParams: {},
    paramSchema: [{ key: "columns", label: "Columns to Keep", type: "multiselect_columns" }],
  },
  drop_columns: {
    label: "Drop Columns", category: "column_ops", icon: "📁", color: "bg-slate-600",
    description: "Remove specified columns from the dataset.",
    appliesTo: ["all"],
    defaultParams: {},
    paramSchema: [{ key: "columns", label: "Columns to Drop", type: "multiselect_columns" }],
  },
  column_splitter: {
    label: "Column Splitter", category: "column_ops", icon: "📁", color: "bg-slate-600",
    description: "Split dataset into groups, apply different transforms, then merge back. Ideal for mixed-type data.",
    appliesTo: ["all"],
    defaultParams: { split_by: "type" },
    keyParam: "split_by",
    paramSchema: [
      { key: "split_by", label: "Split Strategy", type: "select", options: [
        { value: "type",   label: "By column type (numeric / categorical)" },
        { value: "manual", label: "Manual column selection" },
      ]},
    ],
  },
  column_merger: {
    label: "Column Merger", category: "column_ops", icon: "📁", color: "bg-slate-600",
    description: "Merge previously split column groups back together.",
    appliesTo: ["all"],
    defaultParams: { strategy: "concat" },
    keyParam: "strategy",
    paramSchema: [
      { key: "strategy", label: "Merge Strategy", type: "select", options: [
        { value: "concat", label: "Concatenate horizontally" },
        { value: "add",    label: "Sum (numeric only)" },
      ]},
    ],
  },
};

export const BLOCK_CATEGORIES: { category: BlockCategory; blocks: BlockType[] }[] = [
  { category: "cleaning",          blocks: ["imputer","categorical_imputer","outlier_removal","duplicate_removal"] },
  { category: "scaling",           blocks: ["scaler","normalizer","maxabs_scaler"] },
  { category: "encoding",          blocks: ["one_hot_encoder","label_encoder","ordinal_encoder","target_encoder","frequency_encoder"] },
  { category: "transformation",    blocks: ["log_transform","power_transform","quantile_transform","sqrt_transform"] },
  { category: "feature_gen",       blocks: ["polynomial_features","binning","datetime_extractor","text_vectoriser"] },
  { category: "feature_selection", blocks: ["variance_filter","correlation_filter","select_k_best","feature_selection_model"] },
  { category: "dim_reduction",     blocks: ["pca","truncated_svd","kernel_pca"] },
  { category: "column_ops",        blocks: ["select_features","drop_columns","column_splitter","column_merger"] },
];
