import { HealthInfo, LLMStatus, DatasetMeta, OverviewData, ColumnProfile, CellError } from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth(): Promise<HealthInfo> {
    const res = await fetch('/health');
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getLLMStatus(): Promise<LLMStatus> {
    const res = await fetch(`${API_BASE}/llm/status`);
    if (!res.ok) throw new Error('LLM status check failed');
    return res.json();
  },

  async uploadFile(file: File, sheetName?: string): Promise<DatasetMeta> {
    const formData = new FormData();
    formData.append('file', file);
    if (sheetName) formData.append('sheet_name', sheetName);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async getDatasets(): Promise<DatasetMeta[]> {
    const res = await fetch(`${API_BASE}/datasets`);
    if (!res.ok) return [];
    return res.json();
  },

  async getPreview(datasetId: string, page = 1, pageSize = 50): Promise<{
    dataset_id: string;
    page: number;
    page_size: number;
    total_rows: number;
    columns: string[];
    rows: any[];
    cell_errors: CellError[];
  }> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/preview?page=${page}&page_size=${pageSize}`);
    if (!res.ok) throw new Error('Failed to fetch preview');
    return res.json();
  },

  async getOverview(datasetId: string): Promise<OverviewData> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/overview`);
    if (!res.ok) throw new Error('Failed to fetch overview');
    return res.json();
  },

  async getColumns(datasetId: string): Promise<{ columns: ColumnProfile[]; type_breakdown: Record<string, number> }> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/columns`);
    if (!res.ok) throw new Error('Failed to fetch columns');
    return res.json();
  },

  async getMissing(datasetId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/missing`);
    if (!res.ok) throw new Error('Failed to fetch missing data');
    return res.json();
  },

  async getDuplicates(datasetId: string, fuzzyCol?: string, threshold = 85): Promise<any> {
    const query = new URLSearchParams();
    if (fuzzyCol) query.append('fuzzy_col', fuzzyCol);
    query.append('threshold', threshold.toString());

    const res = await fetch(`${API_BASE}/datasets/${datasetId}/duplicates?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch duplicates');
    return res.json();
  },

  async getErrors(datasetId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/errors`);
    if (!res.ok) throw new Error('Failed to fetch errors');
    return res.json();
  },

  async checkCustomRule(datasetId: string, expression: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression }),
    });
    if (!res.ok) throw new Error('Failed to check custom rule');
    return res.json();
  },

  async getOutliers(datasetId: string, method = 'iqr'): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/outliers?method=${method}`);
    if (!res.ok) throw new Error('Failed to fetch outliers');
    return res.json();
  },

  async getRelations(datasetId: string, method = 'pearson'): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/relations?method=${method}`);
    if (!res.ok) throw new Error('Failed to fetch relations');
    return res.json();
  },

  async generateChart(datasetId: string, spec: {
    chart_type: string;
    x?: string;
    y?: string;
    color?: string;
    agg?: string;
    title?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/chart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spec),
    });
    if (!res.ok) throw new Error('Failed to generate chart');
    return res.json();
  },

  async getInsights(datasetId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/insights`);
    if (!res.ok) throw new Error('Failed to fetch insights');
    return res.json();
  },

  async getPII(datasetId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/pii`);
    if (!res.ok) throw new Error('Failed to fetch PII');
    return res.json();
  },

  async chat(datasetId: string, question: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error('Chat failed');
    return res.json();
  },

  async applyClean(datasetId: string, op: string, params: any, description?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/clean/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op, params, description }),
    });
    if (!res.ok) throw new Error('Failed to apply cleaning step');
    return res.json();
  },

  async undoClean(datasetId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/clean/undo`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to undo');
    return res.json();
  },

  async resetClean(datasetId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/clean/reset`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to reset');
    return res.json();
  },

  async getCleaningScript(datasetId: string): Promise<string> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}/clean/script`);
    if (!res.ok) throw new Error('Failed to get script');
    return res.text();
  },

  async compare(datasetIdA: string, datasetIdB: string): Promise<any> {
    const res = await fetch(`${API_BASE}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_id_a: datasetIdA, dataset_id_b: datasetIdB }),
    });
    if (!res.ok) throw new Error('Failed to compare datasets');
    return res.json();
  },
};
