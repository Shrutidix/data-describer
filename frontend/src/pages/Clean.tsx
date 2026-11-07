import React, { useState } from 'react';
import {
  Sparkles,
  Undo2,
  RotateCcw,
  FileCode,
  Copy,
  Check,
  CheckCircle2,
  Trash2,
  Sliders,
  Type,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import { useDatasetStore } from '../store/useDataset';
import { api } from '../api/client';

export const Clean: React.FC = () => {
  const { currentDataset, dataVersion, incrementVersion } = useDatasetStore();
  const [loading, setLoading] = useState(false);
  const [scriptModal, setScriptModal] = useState(false);
  const [pythonScript, setPythonScript] = useState('');
  const [copied, setCopied] = useState(false);

  // Dynamic parameters
  const [selectedCol, setSelectedCol] = useState('Customer_Age');
  const [fillStrategy, setFillStrategy] = useState('median');
  const [caseType, setCaseType] = useState('title');

  const runCleanOp = async (op: string, params: any, desc: string) => {
    if (!currentDataset) return;
    setLoading(true);
    try {
      await api.applyClean(currentDataset.dataset_id, op, params, desc);
      incrementVersion();
    } catch (e: any) {
      alert(e.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!currentDataset) return;
    setLoading(true);
    try {
      await api.undoClean(currentDataset.dataset_id);
      incrementVersion();
    } catch (e: any) {
      alert(e.message || 'Nothing to undo');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!currentDataset) return;
    if (!confirm('Reset dataset to initial state?')) return;
    setLoading(true);
    try {
      await api.resetClean(currentDataset.dataset_id);
      incrementVersion();
    } catch (e: any) {
      alert(e.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenScript = async () => {
    if (!currentDataset) return;
    try {
      const code = await api.getCleaningScript(currentDataset.dataset_id);
      setPythonScript(code);
      setScriptModal(true);
    } catch (e: any) {
      alert(e.message || 'Failed to fetch script');
    }
  };

  if (!currentDataset) {
    return <div className="text-center py-20 text-slate-400">Please load a dataset first.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">One-Click Cleaning Engine</h1>
          <p className="text-sm text-slate-400 mt-1">
            Reversible transformations with full undo/redo and reproducible Python script export.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo Step</span>
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold border border-slate-700 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleOpenScript}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Export Python Script</span>
          </button>
        </div>
      </div>

      {/* Grid of Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Remove Duplicates */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Remove Exact Duplicates</h3>
              <p className="text-[11px] text-slate-400">Deduplicate identical rows keeping first record.</p>
            </div>
          </div>
          <button
            onClick={() => runCleanOp('drop_duplicates', { keep: 'first' }, 'Removed duplicate rows')}
            disabled={loading}
            className="w-full py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold text-xs border border-indigo-500/20 transition-all"
          >
            Remove Duplicate Rows
          </button>
        </div>

        {/* 2. Impute Missing Values */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Fill Missing Values</h3>
              <p className="text-[11px] text-slate-400">Impute with mean, median, or category mode.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <input
              type="text"
              placeholder="Column name"
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
            />
            <select
              value={fillStrategy}
              onChange={(e) => setFillStrategy(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
            >
              <option value="median">Fill with Median</option>
              <option value="mean">Fill with Mean</option>
              <option value="mode">Fill with Mode (Frequent)</option>
            </select>
          </div>

          <button
            onClick={() => runCleanOp('fill_na', { column: selectedCol, strategy: fillStrategy }, `Filled missing in ${selectedCol}`)}
            disabled={loading}
            className="w-full py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-semibold text-xs border border-emerald-500/20 transition-all"
          >
            Apply Imputation
          </button>
        </div>

        {/* 3. Trim Spaces */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Trim Whitespace</h3>
              <p className="text-[11px] text-slate-400">Strip leading and trailing spaces from all text columns.</p>
            </div>
          </div>
          <button
            onClick={() => runCleanOp('trim_spaces', {}, 'Trimmed whitespace across text columns')}
            disabled={loading}
            className="w-full py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-semibold text-xs border border-purple-500/20 transition-all"
          >
            Trim All String Columns
          </button>
        </div>

        {/* 4. Standardize Case */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Standardize Text Capitalization</h3>
              <p className="text-[11px] text-slate-400">Convert text column to Title Case, Lower, or Upper.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
            >
              <option value="title">Title Case (e.g. Rahul Sharma)</option>
              <option value="lower">lower case (e.g. rahul sharma)</option>
              <option value="upper">UPPER CASE (e.g. RAHUL SHARMA)</option>
            </select>
          </div>

          <button
            onClick={() => runCleanOp('standardize_case', { column: 'Customer_Name', case: caseType }, `Normalized case on Customer_Name`)}
            disabled={loading}
            className="w-full py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-semibold text-xs border border-amber-500/20 transition-all"
          >
            Standardize Names
          </button>
        </div>
      </div>

      {/* Script Export Modal */}
      {scriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Reproducible Python Pipeline Script</h3>
              </div>
              <button
                onClick={() => setScriptModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-96">
              {pythonScript}
            </pre>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(pythonScript);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Python Code'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
