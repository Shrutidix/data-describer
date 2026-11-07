import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Sliders, Play, Download, Loader2, GitFork } from 'lucide-react';
import { useDatasetStore } from '../store/useDataset';
import { api } from '../api/client';
import Plot from 'react-plotly.js';

export const Visualize: React.FC = () => {
  const { currentDataset } = useDatasetStore();
  const [columns, setColumns] = useState<string[]>([]);
  const [chartType, setChartType] = useState('bar');
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  const [colorCol, setColorCol] = useState('');
  const [agg, setAgg] = useState('sum');
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentDataset) return;
    api.getColumns(currentDataset.dataset_id).then((res) => {
      const colNames = res.columns.map((c) => c.name);
      setColumns(colNames);
      if (colNames.length > 0) {
        setXCol(colNames[0]);
        if (colNames.length > 1) setYCol(colNames[1]);
      }
    });
  }, [currentDataset]);

  const handleGenerate = async () => {
    if (!currentDataset || !xCol) return;
    setLoading(true);
    try {
      const res = await api.generateChart(currentDataset.dataset_id, {
        chart_type: chartType,
        x: xCol,
        y: yCol || undefined,
        color: colorCol || undefined,
        agg: agg,
        title: `${chartType.toUpperCase()} of ${yCol || xCol}`,
      });
      setChartData(res);
    } catch (e: any) {
      alert(e.message || 'Failed to build chart');
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
        <h1 className="text-2xl font-bold text-white tracking-tight">Chart Builder & Flow</h1>
        <p className="text-sm text-slate-400 mt-1">
          Build custom interactive charts, time series, and Sankey categorical flow diagrams.
        </p>
      </div>

      {/* Control panel */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
        {/* Chart type pills */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-2">Select Visual Type</label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'bar', label: 'Bar Chart' },
              { id: 'line', label: 'Line / Trend' },
              { id: 'scatter', label: 'Scatter Plot' },
              { id: 'pie', label: 'Pie / Donut' },
              { id: 'box', label: 'Box Plot' },
              { id: 'violin', label: 'Violin' },
              { id: 'histogram', label: 'Histogram' },
              { id: 'sankey', label: 'Sankey Flow' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setChartType(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  chartType === t.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">X-Axis Column</label>
            <select
              value={xCol}
              onChange={(e) => setXCol(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
            >
              {columns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Y-Axis Column (Value)</label>
            <select
              value={yCol}
              onChange={(e) => setYCol(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">(None / Count)</option>
              {columns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Aggregation</label>
            <select
              value={agg}
              onChange={(e) => setAgg(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="sum">Sum</option>
              <option value="mean">Mean / Average</option>
              <option value="count">Count</option>
              <option value="median">Median</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Color / Group By</label>
            <select
              value={colorCol}
              onChange={(e) => setColorCol(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">(None)</option>
              {columns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>Generate Chart</span>
        </button>
      </div>

      {/* Rendered Chart Display */}
      {chartData ? (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex justify-center overflow-hidden">
          <Plot
            data={chartData.data || []}
            layout={{
              ...chartData.layout,
              autosize: true,
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#94A3B8' },
            }}
            useResizeHandler={true}
            style={{ width: '100%', minHeight: '450px' }}
          />
        </div>
      ) : (
        <div className="p-16 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <BarChart3 className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No chart generated yet</h3>
          <p className="text-xs text-slate-500">Pick axes and visual type above, then click Generate Chart.</p>
        </div>
      )}
    </div>
  );
};
