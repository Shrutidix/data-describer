import React, { useEffect, useState } from 'react';
import { Columns as ColumnsIcon, Hash, Type, Calendar, Mail, Phone, Link2, DollarSign, Percent, MapPin, Key, Layers, Loader2 } from 'lucide-react';
import { useDatasetStore } from '../store/useDataset';
import { api } from '../api/client';
import { ColumnProfile } from '../types';

export const Columns: React.FC = () => {
  const { currentDataset, dataVersion } = useDatasetStore();
  const [columns, setColumns] = useState<ColumnProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!currentDataset) return;
    setLoading(true);
    api.getColumns(currentDataset.dataset_id)
      .then((data) => setColumns(data.columns))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [currentDataset, dataVersion]);

  const filteredColumns = columns.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.semantic_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSemanticIcon = (type: string) => {
    switch (type) {
      case 'numeric': return <Hash className="w-3.5 h-3.5 text-indigo-400" />;
      case 'category': return <Layers className="w-3.5 h-3.5 text-purple-400" />;
      case 'email': return <Mail className="w-3.5 h-3.5 text-blue-400" />;
      case 'phone': return <Phone className="w-3.5 h-3.5 text-emerald-400" />;
      case 'url': return <Link2 className="w-3.5 h-3.5 text-cyan-400" />;
      case 'currency': return <DollarSign className="w-3.5 h-3.5 text-amber-400" />;
      case 'percentage': return <Percent className="w-3.5 h-3.5 text-rose-400" />;
      case 'pincode': return <MapPin className="w-3.5 h-3.5 text-orange-400" />;
      case 'id': return <Key className="w-3.5 h-3.5 text-amber-500" />;
      case 'datetime': return <Calendar className="w-3.5 h-3.5 text-emerald-500" />;
      default: return <Type className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  if (!currentDataset) {
    return <div className="text-center py-20 text-slate-400">Please load a dataset first.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-indigo-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm font-medium">Profiling columns...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Column Profiler</h1>
          <p className="text-sm text-slate-400 mt-1">
            Detailed statistical breakdown and semantic types for each of the {columns.length} columns.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search column or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid of Column Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredColumns.map((col) => (
          <div
            key={col.name}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-4"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                  {getSemanticIcon(col.semantic_type)}
                </span>
                <span className="font-bold text-white text-sm truncate">{col.name}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                  {col.semantic_type}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-slate-800">
                  {col.physical_dtype}
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Valid Count</span>
                <span className="font-semibold text-slate-200">{col.valid_count.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Missing</span>
                <span className={`font-semibold ${col.missing_count > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                  {col.missing_count} ({col.missing_pct}%)
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Unique</span>
                <span className="font-semibold text-slate-200">{col.unique_count.toLocaleString()}</span>
              </div>
            </div>

            {/* Numeric Stats */}
            {col.stats.mean !== undefined && (
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-2 text-xs">
                <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-400 font-mono">
                  <div>Min: <strong className="text-white">{col.stats.min}</strong></div>
                  <div>Mean: <strong className="text-white">{col.stats.mean}</strong></div>
                  <div>Median: <strong className="text-white">{col.stats.median}</strong></div>
                  <div>Max: <strong className="text-white">{col.stats.max}</strong></div>
                </div>

                {/* Histogram Visual */}
                {col.stats.histogram && col.stats.histogram.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] text-slate-500 block mb-1">Distribution Histogram</span>
                    <div className="flex items-end gap-1 h-12 pt-2 border-b border-slate-800">
                      {col.stats.histogram.map((bin, i) => {
                        const maxCount = Math.max(...col.stats.histogram!.map((b) => b.count), 1);
                        const heightPct = Math.round((bin.count / maxCount) * 100);
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-indigo-600/70 hover:bg-indigo-500 rounded-t transition-all group relative"
                            style={{ height: `${Math.max(10, heightPct)}%` }}
                            title={`Range: ${bin.bin_start} - ${bin.bin_end} (${bin.count} items)`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Text Stats */}
            {col.stats.avg_length !== undefined && (
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 flex justify-between">
                <span>Avg Length: <strong className="text-white">{col.stats.avg_length} chars</strong></span>
                <span>Max Length: <strong className="text-white">{col.stats.max_length}</strong></span>
                <span>Blank Strings: <strong className="text-white">{col.stats.blank_count}</strong></span>
              </div>
            )}

            {/* Top 5 Values Bar */}
            {col.top_values && col.top_values.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Most Frequent Values
                </span>
                <div className="space-y-1">
                  {col.top_values.slice(0, 4).map((tv, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 truncate max-w-[200px]">{tv.value || '(empty)'}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.min(100, tv.pct)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 w-8 text-right">{tv.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
