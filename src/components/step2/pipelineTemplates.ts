import { PipelineBlock, PipelineTemplate, ColumnMeta } from "@/types";
import { v4 as uuidv4 } from "uuid";

type TemplateFactory = (cols: ColumnMeta[]) => Omit<PipelineBlock, "id">[];

const numericCols = (cols: ColumnMeta[]) => cols.filter(c => c.type === "numeric" && !c.is_target).map(c => c.name);
const catCols     = (cols: ColumnMeta[]) => cols.filter(c => c.type === "categorical" || c.type === "boolean").map(c => c.name);
const textCols    = (cols: ColumnMeta[]) => cols.filter(c => c.type === "text").map(c => c.name);
const dtCols      = (cols: ColumnMeta[]) => cols.filter(c => c.type === "datetime").map(c => c.name);

const FACTORIES: Record<PipelineTemplate, TemplateFactory> = {
  classification: (cols) => {
    const blocks: Omit<PipelineBlock, "id">[] = [];
    if (numericCols(cols).length)  blocks.push({ block_type: "imputer",         params: { strategy: "median" },           column_targets: numericCols(cols), label: "Numeric Imputer" });
    if (catCols(cols).length)      blocks.push({ block_type: "categorical_imputer", params: { strategy: "most_frequent" }, column_targets: catCols(cols),     label: "Categorical Imputer" });
    if (numericCols(cols).length)  blocks.push({ block_type: "outlier_removal", params: { method: "iqr", threshold: 1.5, action: "clip" }, column_targets: numericCols(cols), label: "Outlier Removal" });
    if (numericCols(cols).length)  blocks.push({ block_type: "scaler",          params: { method: "standard" },           column_targets: numericCols(cols), label: "Scaler" });
    if (catCols(cols).length)      blocks.push({ block_type: "one_hot_encoder", params: { drop: "first", max_categories: 20 }, column_targets: catCols(cols), label: "One-Hot Encoder" });
    return blocks;
  },

  regression: (cols) => {
    const blocks: Omit<PipelineBlock, "id">[] = [];
    if (numericCols(cols).length)  blocks.push({ block_type: "imputer",            params: { strategy: "mean" },               column_targets: numericCols(cols), label: "Numeric Imputer" });
    if (catCols(cols).length)      blocks.push({ block_type: "categorical_imputer",params: { strategy: "most_frequent" },       column_targets: catCols(cols),     label: "Categorical Imputer" });
    if (numericCols(cols).length)  blocks.push({ block_type: "scaler",             params: { method: "robust" },               column_targets: numericCols(cols), label: "Robust Scaler" });
    if (catCols(cols).length)      blocks.push({ block_type: "ordinal_encoder",    params: { handle_unknown: "use_encoded_value" }, column_targets: catCols(cols), label: "Ordinal Encoder" });
    if (dtCols(cols).length)       blocks.push({ block_type: "datetime_extractor", params: { extract: "all", drop_original: true }, column_targets: dtCols(cols),  label: "Datetime Extractor" });
    return blocks;
  },

  time_series: (cols) => {
    const blocks: Omit<PipelineBlock, "id">[] = [];
    if (dtCols(cols).length)       blocks.push({ block_type: "datetime_extractor", params: { extract: "all", drop_original: false }, column_targets: dtCols(cols), label: "Datetime Features" });
    if (numericCols(cols).length)  blocks.push({ block_type: "imputer",            params: { strategy: "median" },            column_targets: numericCols(cols), label: "Numeric Imputer" });
    if (numericCols(cols).length)  blocks.push({ block_type: "scaler",             params: { method: "minmax" },              column_targets: numericCols(cols), label: "Min-Max Scaler" });
    return blocks;
  },

  nlp: (cols) => {
    const blocks: Omit<PipelineBlock, "id">[] = [];
    if (textCols(cols).length)     blocks.push({ block_type: "text_vectoriser",    params: { method: "tfidf", max_features: 5000, ngram_max: 2 }, column_targets: textCols(cols), label: "TF-IDF Vectoriser" });
    if (textCols(cols).length)     blocks.push({ block_type: "truncated_svd",      params: { n_components: 100 }, column_targets: [], label: "SVD (Dimensionality Reduction)" });
    if (catCols(cols).length)      blocks.push({ block_type: "label_encoder",      params: {}, column_targets: catCols(cols), label: "Label Encoder" });
    return blocks;
  },

  feature_selection: (cols) => {
    const blocks: Omit<PipelineBlock, "id">[] = [];
    if (numericCols(cols).length)  blocks.push({ block_type: "imputer",              params: { strategy: "median" },            column_targets: numericCols(cols), label: "Numeric Imputer" });
    if (numericCols(cols).length)  blocks.push({ block_type: "scaler",               params: { method: "standard" },            column_targets: numericCols(cols), label: "Scaler" });
    if (numericCols(cols).length)  blocks.push({ block_type: "variance_filter",      params: { threshold: 0.01 },               column_targets: numericCols(cols), label: "Variance Filter" });
    if (numericCols(cols).length)  blocks.push({ block_type: "correlation_filter",   params: { threshold: 0.9 },                column_targets: numericCols(cols), label: "Correlation Filter" });
    if (numericCols(cols).length)  blocks.push({ block_type: "select_k_best",        params: { k: 10, score_func: "f_classif"}, column_targets: numericCols(cols), label: "Select K Best" });
    return blocks;
  },

  dim_reduction: (cols) => {
    const blocks: Omit<PipelineBlock, "id">[] = [];
    if (numericCols(cols).length)  blocks.push({ block_type: "imputer", params: { strategy: "mean" },   column_targets: numericCols(cols), label: "Numeric Imputer" });
    if (numericCols(cols).length)  blocks.push({ block_type: "scaler",  params: { method: "standard" }, column_targets: numericCols(cols), label: "Scaler" });
    if (numericCols(cols).length)  blocks.push({ block_type: "pca",     params: { n_components: 10, whiten: false, svd_solver: "auto" }, column_targets: [], label: "PCA" });
    return blocks;
  },

  cleaning_only: (cols) => {
    const blocks: Omit<PipelineBlock, "id">[] = [];
    blocks.push({ block_type: "duplicate_removal",    params: { keep: "first" },              column_targets: [],               label: "Remove Duplicates" });
    if (numericCols(cols).length) blocks.push({ block_type: "imputer",            params: { strategy: "median" },         column_targets: numericCols(cols), label: "Numeric Imputer" });
    if (catCols(cols).length)     blocks.push({ block_type: "categorical_imputer",params: { strategy: "most_frequent" },  column_targets: catCols(cols),     label: "Categorical Imputer" });
    if (numericCols(cols).length) blocks.push({ block_type: "outlier_removal",    params: { method: "iqr", threshold: 1.5, action: "clip" }, column_targets: numericCols(cols), label: "Outlier Removal" });
    return blocks;
  },

  categorical_heavy: (cols) => {
    const blocks: Omit<PipelineBlock, "id">[] = [];
    if (catCols(cols).length)      blocks.push({ block_type: "categorical_imputer", params: { strategy: "most_frequent" },       column_targets: catCols(cols),     label: "Categorical Imputer" });
    if (numericCols(cols).length)  blocks.push({ block_type: "imputer",             params: { strategy: "median" },              column_targets: numericCols(cols), label: "Numeric Imputer" });
    if (catCols(cols).length)      blocks.push({ block_type: "frequency_encoder",   params: { normalize: true },                 column_targets: catCols(cols),     label: "Frequency Encoder" });
    if (numericCols(cols).length)  blocks.push({ block_type: "scaler",              params: { method: "robust" },                column_targets: numericCols(cols), label: "Robust Scaler" });
    return blocks;
  },

  blank: () => [],
};

export function buildTemplate(t: PipelineTemplate, cols: ColumnMeta[]): PipelineBlock[] {
  return (FACTORIES[t]?.(cols) ?? []).map(b => ({ ...b, id: uuidv4() }));
}

export interface TemplateOption {
  id: PipelineTemplate;
  name: string;
  description: string;
  tags: string[];
}

export const TEMPLATE_CATEGORIES: { name: string; templates: TemplateOption[] }[] = [
  {
    name: "Standard",
    templates: [
      { id: "classification",  name: "Classification Pipeline",  description: "Imputer → Outlier removal → Scaler → One-hot encoder. Best for classification tasks.", tags: ["classification","recommended"] },
      { id: "regression",      name: "Regression Pipeline",      description: "Imputer → Robust scaler → Ordinal encoder → Datetime extractor.",                       tags: ["regression","recommended"] },
      { id: "blank",           name: "Blank (Custom)",           description: "Start from scratch and add exactly the blocks you need.",                               tags: ["custom"] },
    ],
  },
  {
    name: "Data Cleaning",
    templates: [
      { id: "cleaning_only",   name: "Cleaning Only",            description: "Deduplicate, impute missing values, and clip outliers. No encoding or scaling.",        tags: ["cleaning"] },
    ],
  },
  {
    name: "Text & NLP",
    templates: [
      { id: "nlp",             name: "NLP Pipeline",             description: "TF-IDF vectorisation + SVD for text columns. Add label encoder for categoricals.",      tags: ["nlp","text"] },
    ],
  },
  {
    name: "Time Series",
    templates: [
      { id: "time_series",     name: "Time Series",              description: "Extract datetime features, impute, and scale. Combine with lag features manually.",     tags: ["time-series","datetime"] },
    ],
  },
  {
    name: "Advanced",
    templates: [
      { id: "feature_selection", name: "Feature Selection",      description: "Impute → Scale → Variance filter → Correlation filter → Select K Best.",              tags: ["feature-selection","advanced"] },
      { id: "dim_reduction",   name: "Dimensionality Reduction",  description: "Impute → Scale → PCA. Reduces features to principal components.",                    tags: ["pca","dim-reduction","advanced"] },
      { id: "categorical_heavy", name: "Categorical-Heavy Data", description: "Frequency encoding + robust scaling. For datasets with many categorical columns.",     tags: ["encoding","categorical"] },
    ],
  },
];
