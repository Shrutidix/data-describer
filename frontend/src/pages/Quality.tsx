import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  Copy,
  Activity,
  Sliders,
  CheckCircle2,
  Trash2,
  Sparkles,
  Loader2,
  Play,
} from 'lucide-react';
import { useDatasetStore } from '../store/useDataset';
import { api } from '../api/client';

export const Quality: React.FC = () => {
  const { currentDataset, dataVersion, incrementVersion, setCurrentPage } = useDatasetStore();
  const [activeTab, setActiveTab] = useState<'missing' | 'duplicates' | 'errors' | 'outliers'>('missing');
  const [loading, setLoading] = useState(true);

  // Tab data states
  const [missingData, setMissingData] = useState<any>(null);
  const [duplicatesData, setDuplicatesData] = useState<any>(null);
  const [errorsData, setErrorsData] = useState<any>(null);
  const [outliersData, setOutliersData] = useState<any>(null);

  // Controls
  const [fuzzyThreshold, setFuzzyThreshold] = useState(80);
  const [outlierMethod, setOutlierMethod] = useState<'iqr' | 'zscore' | 'isolation_forest'>('iqr');
  const [customRule, setCustomRule] = useState('Customer_Age >= 18');
  const [ruleResult, setRuleResult] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!currentDataset) return;
    setLoading(true);

    Promise.all([
      api.getMissing(currentDataset.dataset_id),
      api.getDuplicates(currentDataset.dataset_id, undefined, fuzzyThreshold),
      api.getErrors(currentDataset.dataset_id),
      api.getOutliers(currentDataset.dataset_id, outlierMethod),
    ])
      .then(([mis, dup, err, out]) => {
        setMissingData(mis);
        setDuplicatesData(dup);
        setErrorsData(err);
        setOutliersData(out);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [currentDataset, dataVersion, fuzzyThreshold, outlierMethod]);

  const handleApplyFix = async (op: string, params: any) => {
    if (!currentDataset) return;
    setActionLoading(true);
    try {
      await api.applyClean(currentDataset.dataset_id, op, params);
      incrementVersion();
    } catch (e: any) {
      alert(e.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckRule = async () => {
    if (!currentDataset || !customRule.trim()) return;
    try {
      const res = await api.checkCustomRule(currentDataset.dataset_id, customRule.trim());
      setRuleResult(res);
    } catch (e: any) {
      alert(e.message || 'Failed to check rule');
    }
  };

  if (!currentDataset) {
    return <div className="text-center py-20 text-slate-400">Please load a dataset first.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-indigo-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm font-medium">Running deep quality scans...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Data Quality</h1>
        <p className="text-sm text-slate-400 mt-1">
          Deep-dive analysis of missing values, duplicates, formatting errors, and numerical outliers.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'missing', label: 'Missing Data', icon: AlertCircle, badge: missingData?.total_missing_cells },
          { id: 'duplicates', label: 'Duplicates', icon: Copy, badge: duplicatesData?.exact_duplicates_count },
          { id: 'errors', label: 'Data Errors & Rules', icon: ShieldCheck, badge: errorsData?.total_errors },
          { id: 'outliers', label: 'Outliers & Anomalies', icon: Activity, badge: outliersData?.total_outlier_rows },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {Boolean(tab.badge) && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Missing Data */}
      {activeTab === 'missing' && missingData && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Dataset Completeness Score</span>
              <div className="text-3xl font-extrabold text-white mt-1">
                {missingData.completeness_score}%
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Total Missing Cells</span>
              <span className="text-lg font-bold text-amber-400">{missingData.total_missing_cells.toLocaleString()}</span>
            </div>
          </div>

          {/* Missing Table with Suggested Actions */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="p-4 border-b border-slate-800 font-semibold text-white text-sm">
              Missing Values by Column & Suggested Actions
            </div>
            <div className="divide-y divide-slate-800/60 text-xs font-mono">
              {missingData.columns.map((c: any) => (
                <div key={c.column} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-200 text-sm font-sans">{c.column}</strong>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${c.missing_pct > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {c.total_missing} missing ({c.missing_pct}%)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-sans block">{c.reason}</span>
                  </div>

                  {c.suggested_action !== 'none' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          if (c.suggested_action === 'drop_column') {
                            handleApplyFix('drop_column', { column: c.column });
                          } else if (c.suggested_action === 'fill_median') {
                            handleApplyFix('fill_na', { column: c.column, strategy: 'median' });
                          } else if (c.suggested_action === 'fill_mean') {
                            handleApplyFix('fill_na', { column: c.column, strategy: 'mean' });
                          } else {
                            handleApplyFix('fill_na', { column: c.column, strategy: 'mode' });
                          }
                        }}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-sm"
                      >
                        Apply: {c.suggested_action.replace('_', ' ')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Duplicates */}
      {activeTab === 'duplicates' && duplicatesData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Exact Duplicate Rows</span>
                <div className="text-2xl font-extrabold text-white mt-1">
                  {duplicatesData.exact_duplicates_count}
                </div>
              </div>
              {duplicatesData.exact_duplicates_count > 0 && (
                <button
                  onClick={() => handleApplyFix('drop_duplicates', { keep: 'first' })}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-md"
                >
                  Remove Exact Duplicates
                </button>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Uniqueness Score</span>
                <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                  {duplicatesData.uniqueness_score}%
                </div>
              </div>
            </div>
          </div>

          {/* Fuzzy Duplicates Slider & Preview */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Fuzzy Match Detection (RapidFuzz)</h3>
                <p className="text-xs text-slate-400">
                  Detect near-identical entries (e.g., typos, extra spaces, transliterations) in column "{duplicatesData.fuzzy_column}"
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-medium">Threshold: {fuzzyThreshold}%</span>
                <input
                  type="range"
                  min="60"
                  max="95"
                  value={fuzzyThreshold}
                  onChange={(e) => setFuzzyThreshold(Number(e.target.value))}
                  className="w-28 accent-indigo-500"
                />
              </div>
            </div>

            {duplicatesData.fuzzy_matches && duplicatesData.fuzzy_matches.length > 0 ? (
              <div className="divide-y divide-slate-800 text-xs font-mono">
                {duplicatesData.fuzzy_matches.map((m: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">
                        {m.similarity}% Match
                      </span>
                      <span className="text-slate-200">"{m.val1}"</span>
                      <span className="text-slate-500">vs</span>
                      <span className="text-slate-200">"{m.val2}"</span>
                    </div>
                    <button
                      onClick={() => handleApplyFix('replace_value', { column: duplicatesData.fuzzy_column, old_value: m.val2, new_value: m.val1 })}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      Merge into "{m.val1}"
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                No fuzzy duplicates found above {fuzzyThreshold}% similarity threshold.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Errors & Rules */}
      {activeTab === 'errors' && errorsData && (
        <div className="space-y-6">
          {/* Custom Rule Builder */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Custom Validation Rule Evaluator</h3>
              <p className="text-xs text-slate-400">
                Write a pandas expression to validate business logic (e.g. Quantity &gt; 0 and Unit_Price &gt; 0)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={customRule}
                onChange={(e) => setCustomRule(e.target.value)}
                placeholder="e.g. Customer_Age >= 18 and Customer_Age <= 100"
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleCheckRule}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Test Rule</span>
              </button>
            </div>

            {ruleResult && (
              <div className={`p-4 rounded-xl text-xs ${ruleResult.valid ? 'bg-slate-950 border border-slate-800' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {ruleResult.valid ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${ruleResult.violations_count > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <span className="font-semibold text-white">
                        {ruleResult.violations_count} records violate rule ({ruleResult.violations_pct}%)
                      </span>
                    </div>
                  </div>
                ) : (
                  <span>Rule syntax error: {ruleResult.error}</span>
                )}
              </div>
            )}
          </div>

          {/* Validation Errors List */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white mb-2">Rule Violations & Mixed Types</h3>
            <div className="space-y-2.5">
              {errorsData.errors.map((err: any, i: number) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-rose-400 block">{err.issue_type} in {err.column}</span>
                    <span className="text-slate-400">{err.description}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300">
                    {err.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Outliers */}
      {activeTab === 'outliers' && outliersData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div>
              <span className="text-xs text-slate-400 font-medium">Detection Algorithm</span>
              <div className="flex items-center gap-2 mt-2">
                {(['iqr', 'zscore', 'isolation_forest'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setOutlierMethod(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                      outlierMethod === m
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Outlier Records Detected</span>
              <span className="text-2xl font-bold text-amber-400">{outliersData.total_outlier_rows}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="p-4 border-b border-slate-800 font-semibold text-white text-sm">
              Columns with Outliers & Thresholds
            </div>
            <div className="divide-y divide-slate-800/60 text-xs font-mono">
              {outliersData.columns.map((col: any) => (
                <div key={col.column} className="p-4 flex items-center justify-between">
                  <div>
                    <strong className="text-slate-200 font-sans block text-sm">{col.column}</strong>
                    <span className="text-slate-400 text-[11px]">
                      {col.outlier_count} outliers ({col.outlier_pct}%) • Valid Range: [{col.lower_bound ?? 'Auto'} to {col.upper_bound ?? 'Auto'}]
                    </span>
                  </div>
                  {col.lower_bound !== undefined && (
                    <button
                      onClick={() => handleApplyFix('cap_outliers', { column: col.column, lower_bound: col.lower_bound, upper_bound: col.upper_bound })}
                      className="px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 font-semibold text-xs"
                    >
                      Cap Values (Winsorize)
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
