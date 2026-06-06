import { PipelineBlock, PipelineTemplate, ColumnMeta } from "@/types";

type TemplateFactory = (columns: ColumnMeta[]) => Omit<PipelineBlock, "id">[];

export const PIPELINE_TEMPLATES: Record<Exclude<PipelineTemplate, "blank">, TemplateFactory> = {
  classification: (columns) => {
    const categoricalCols = columns.filter((c) => c.type === "categorical" && !c.is_target).map((c) => c.name);
    const numericCols = columns.filter((c) => c.type === "numeric" && !c.is_target).map((c) => c.name);
    return [
      {
        block_type: "categorical_imputer",
        params: { strategy: "constant" },
        column_targets: categoricalCols,
        label: "Categorical Imputer",
      },
      {
        block_type: "imputer",
        params: { strategy: "mean" },
        column_targets: numericCols,
        label: "Imputer",
      },
      {
        block_type: "one_hot_encoder",
        params: { drop: "first", handle_unknown: "ignore" },
        column_targets: categoricalCols,
        label: "One-Hot Encoder",
      },
      {
        block_type: "scaler",
        params: { type: "StandardScaler" },
        column_targets: numericCols,
        label: "StandardScaler",
      },
    ];
  },

  regression: (columns) => {
    const numericCols = columns.filter((c) => c.type === "numeric" && !c.is_target).map((c) => c.name);
    return [
      {
        block_type: "imputer",
        params: { strategy: "median" },
        column_targets: numericCols,
        label: "Imputer (Median)",
      },
      {
        block_type: "outlier_removal",
        params: { method: "IQR", action: "clip" },
        column_targets: numericCols,
        label: "Outlier Removal (IQR)",
      },
      {
        block_type: "scaler",
        params: { type: "StandardScaler" },
        column_targets: numericCols,
        label: "StandardScaler",
      },
    ];
  },

  time_series: (columns) => {
    const dateTimeCols = columns.filter((c) => c.type === "datetime").map((c) => c.name);
    const numericCols = columns.filter((c) => c.type === "numeric" && !c.is_target).map((c) => c.name);
    return [
      {
        block_type: "datetime_extractor",
        params: { parts: ["year", "month", "day", "dayofweek"] },
        column_targets: dateTimeCols,
        label: "DateTime Extractor",
      },
      {
        block_type: "imputer",
        params: { strategy: "median" },
        column_targets: numericCols,
        label: "Imputer (Median)",
      },
      {
        block_type: "scaler",
        params: { type: "MinMaxScaler" },
        column_targets: numericCols,
        label: "MinMaxScaler",
      },
    ];
  },

  nlp: (columns) => {
    const categoricalCols = columns.filter((c) => c.type === "categorical" && !c.is_target).map((c) => c.name);
    const textCols = columns.filter((c) => c.type === "text").map((c) => c.name);
    return [
      {
        block_type: "categorical_imputer",
        params: { strategy: "constant" },
        column_targets: categoricalCols,
        label: "Categorical Imputer",
      },
      {
        block_type: "text_vectoriser",
        params: { max_features: 5000, ngram_range: "1,2" },
        column_targets: textCols,
        label: "TF-IDF Vectoriser",
      },
      {
        block_type: "variance_filter",
        params: { threshold: 0.01 },
        column_targets: [],
        label: "Variance Filter",
      },
    ];
  },
};
