import React, { useEffect } from 'react';
import { Download, Upload, Cpu, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { useDatasetStore } from '../../store/useDataset';
import { ThemeToggle } from './ThemeToggle';
import { api } from '../../api/client';

export const Topbar: React.FC = () => {
  const {
    currentDataset,
    qualityScore,
    ollamaConnected,
    setOllamaStatus,
    setCurrentPage,
    isSidebarCollapsed,
  } = useDatasetStore();

  useEffect(() => {
    // Initial check for Ollama status
    api
      .getLLMStatus()
      .then((data) => setOllamaStatus(data.connected, data.models))
      .catch(() => setOllamaStatus(false, []));

    const interval = setInterval(() => {
      api
        .getLLMStatus()
        .then((data) => setOllamaStatus(data.connected, data.models))
        .catch(() => setOllamaStatus(false, []));
    }, 15000);

    return () => clearInterval(interval);
  }, [setOllamaStatus]);

  return (
    <header
      className={`fixed top-0 right-0 h-16 z-20 transition-all duration-300 border-b border-slate-800 bg-[#0B0F19]/90 backdrop-blur-md px-6 flex items-center justify-between ${
        isSidebarCollapsed ? 'left-20' : 'left-64'
      }`}
    >
      {/* Left side: dataset info / switcher */}
      <div className="flex items-center gap-4">
        {currentDataset ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-sm max-w-xs truncate">
                {currentDataset.filename}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 text-xs font-mono text-slate-300">
              <span>{currentDataset.rows.toLocaleString()}</span>
              <span className="text-slate-500">×</span>
              <span>{currentDataset.columns} cols</span>
            </div>

            {qualityScore !== null && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                  qualityScore >= 80
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : qualityScore >= 60
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Score: {qualityScore}/100</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
            <span>No dataset loaded</span>
            <button
              onClick={() => setCurrentPage('home')}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload file
            </button>
          </div>
        )}
      </div>

      {/* Right side: Ollama status, Theme, Actions */}
      <div className="flex items-center gap-3">
        {/* Ollama Status Indicator */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-medium"
          title={
            ollamaConnected
              ? 'Local Ollama is connected & ready'
              : 'Ollama is offline (Run `ollama serve` in PowerShell)'
          }
        >
          <Cpu className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300 hidden sm:inline">Ollama:</span>
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                ollamaConnected
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : 'bg-rose-500'
              }`}
            />
            <span className={ollamaConnected ? 'text-emerald-400' : 'text-rose-400'}>
              {ollamaConnected ? 'Online' : 'Offline'}
            </span>
          </span>
        </div>

        <ThemeToggle />

        {currentDataset && (
          <button
            onClick={() => setCurrentPage('report')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        )}
      </div>
    </header>
  );
};

