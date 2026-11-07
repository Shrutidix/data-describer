import React, { useState, useEffect } from 'react';
import { GitCompare, ArrowRight, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useDatasetStore } from '../store/useDataset';
import { api } from '../api/client';
import { DatasetMeta } from '../types';

export const Compare: React.FC = () => {
  const { currentDataset, recentDatasets } = useDatasetStore();
  const [targetId, setTargetId] = useState('');
  const [diffResult, setDiffResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (recentDatasets.length > 1 && currentDataset) {
      const other = recentDatasets.find((d) => d.dataset_id !== currentDataset.dataset_id);
      if (other) setTargetId(other.dataset_id);
    }
  }, [recentDatasets, currentDataset]);

  const handleRunCompare = async () => {
    if (!currentDataset || !targetId) return;
    setLoading(true);
    try {
      const res = await api.compare(currentDataset.dataset_id, targetId);
      setDiffResult(res);
    } catch (e: any) {
      alert(e.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  if (!currentDataset) {
    return <div className="text-center py-20 text-slate-400">Please load a dataset first.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Compare Two Datasets</h1>
        <p className="text-sm text-slate-400 mt-1">
          Detect schema changes, added/removed columns, and statistical drift between versions.
        </p>
      </div>

      {/* Selectors */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-300 block mb-1">Baseline Dataset (A)</label>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium">
              {currentDataset.filename} ({currentDataset.rows} rows)
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-300 block mb-1">Comparison Dataset (B)</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">Select comparison dataset...</option>
              {recentDatasets.map((d) => (
                <option key={d.dataset_id} value={d.dataset_id}>
                  {d.filename} ({d.rows} rows)
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleRunCompare}
          disabled={loading || !targetId}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs shadow-md transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
          <span>Compare Datasets</span>
        </button>
      </div>

      {/* Comparison Results */}
      {diffResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Common Attributes</span>
              <span className="text-2xl font-bold text-white">{diffResult.common_columns_count}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Added in B</span>
              <span className="text-2xl font-bold text-emerald-400">{diffResult.added_columns.length}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Missing from B</span>
              <span className="text-2xl font-bold text-rose-400">{diffResult.removed_columns.length}</span>
            </div>
          </div>

          {/* Statistical Drift Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="p-4 border-b border-slate-800 font-semibold text-white text-sm">
              Statistical Shift in Shared Columns
            </div>
            <div className="divide-y divide-slate-800/60 text-xs font-mono">
              {diffResult.drift_metrics.map((dm: any) => (
                <div key={dm.column} className="p-3.5 flex items-center justify-between">
                  <span className="font-sans font-semibold text-slate-200">{dm.column}</span>
                  <div className="flex items-center gap-4">
                    {dm.type === 'numeric' ? (
                      <>
                        <span className="text-slate-400">Mean A: {dm.mean_a}</span>
                        <span className="text-slate-400">Mean B: {dm.mean_b}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-400">Uniques A: {dm.unique_a}</span>
                        <span className="text-slate-400">Uniques B: {dm.unique_b}</span>
                      </>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        Math.abs(dm.pct_change) > 20
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {dm.pct_change > 0 ? `+${dm.pct_change}%` : `${dm.pct_change}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
