export type Page =
  | 'home'
  | 'overview'
  | 'columns'
  | 'quality'
  | 'relationships'
  | 'visualize'
  | 'chat'
  | 'clean'
  | 'compare'
  | 'report'
  | 'settings';

export interface DatasetMeta {
  dataset_id: string;
  filename: string;
  file_size_bytes: number;
  rows: number;
  columns: number;
  created_at: string;
  sheets?: string[];
  selected_sheet?: string;
  is_sampled?: boolean;
  total_rows?: number;
}

export interface HealthInfo {
  status: string;
  app: string;
  version: string;
  ollama_connected: boolean;
  ollama_url: string;
}

export interface LLMStatus {
  connected: boolean;
  url: string;
  models: string[];
  error?: string;
}

export interface ColumnProfile {
  name: string;
  physical_dtype: string;
  semantic_type: string;
  total_count: number;
  valid_count: number;
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  unique_pct: number;
  top_values: Array<{ value: string; count: number; pct: number }>;
  is_constant: boolean;
  is_unique: boolean;
  stats: {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    std?: number;
    variance?: number;
    q25?: number;
    q75?: number;
    iqr?: number;
    skewness?: number;
    kurtosis?: number;
    zero_count?: number;
    negative_count?: number;
    histogram?: Array<{ bin_start: number; bin_end: number; count: number }>;
    min_length?: number;
    max_length?: number;
    avg_length?: number;
    blank_count?: number;
    whitespace_padded_count?: number;
    min_date?: string;
    max_date?: string;
  };
}

export interface CellError {
  row: number;
  col: string;
  reason: string;
}

export interface QualityMetric {
  score: number;
  weight: string;
}

export interface TopIssue {
  type: string;
  desc: string;
  severity: 'high' | 'medium' | 'low';
  action: string;
}

export interface OverviewData {
  meta: DatasetMeta;
  quality_score: number;
  quality_grade: string;
  quality_metrics: Record<string, QualityMetric>;
  top_issues: TopIssue[];
  type_breakdown: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  code?: string;
  result?: any;
  figure?: any;
  timestamp: string;
}
