import React, { useState, useEffect } from 'react';
import { GitFork, Network, Layers, TrendingUp, Loader2, ArrowRight } from 'lucide-react';
import { useDatasetStore } from '../store/useDataset';
import { api } from '../api/client';

export const Relationships: React.FC = () => {
  const { currentDataset } = useDatasetStore();
  const [method, setMethod] = useState<'pearson' | 'spearman'>('pearson');
  const [relationsData, setRelationsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentDataset) return;
    setLoading(true);
    api.getRelations(currentDataset.dataset_id, method)
      .then((data) => setRelationsData(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [currentDataset, method]);

  if (!currentDataset) {
    return <div className="text-center py-20 text-slate-400">Please load a dataset first.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-indigo-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm font-medium">Computing correlation matrices & associations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Column Relationships</h1>
          <p className="text-sm text-slate-400 mt-1">
            Correlation heatmaps, Cramér's V, mutual information, and network dependency graphs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Method:</span>
          {(['pearson', 'spearman'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                method === m
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Top 10 Ranked Relationships */}
      {relationsData && relationsData.top_pairs && relationsData.top_pairs.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center gap-2 text-white font-semibold text-sm">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>Ranked Strongest Relationships</span>
          </div>
          <div className="divide-y divide-slate-800/60 text-xs font-mono">
            {relationsData.top_pairs.map((pair: any, i: number) => (
              <div key={i} className="p-3.5 flex items-center justify-between hover:bg-slate-800/20">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-slate-500 font-bold">{i + 1}</span>
                  <div>
                    <span className="font-semibold text-slate-200 font-sans text-sm">
                      {pair.col1} <span className="text-slate-500 font-normal">↔</span> {pair.col2}
                    </span>
                    <span className="text-slate-400 text-[11px] block font-sans">{pair.description}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      pair.value >= 0.5
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : pair.value <= -0.5
                        ? 'bg-rose-500/10 text-rose-400'
                        : 'bg-indigo-500/10 text-indigo-400'
                    }`}
                  >
                    {pair.value > 0 ? `+${pair.value.toFixed(2)}` : pair.value.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Network Graph Visualizer */}
      {relationsData?.network && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Network className="w-4 h-4 text-indigo-400" />
                <span>Relationship Dependency Network</span>
              </h3>
              <p className="text-xs text-slate-400">
                Interactive relationship nodes connected by correlation edge strength ({'>='} 0.3)
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap gap-2">
            {relationsData.network.nodes.map((node: any) => (
              <div
                key={node.id}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 flex items-center gap-2"
              >
                <span className={`w-2 h-2 rounded-full ${node.group === 'numeric' ? 'bg-indigo-400' : 'bg-purple-400'}`} />
                <span>{node.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
