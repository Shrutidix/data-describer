import React, { useState } from 'react';
import { Settings as SettingsIcon, Cpu, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useDatasetStore } from '../store/useDataset';
import { api } from '../api/client';

export const Settings: React.FC = () => {
  const { ollamaConnected, ollamaModels, setOllamaStatus } = useDatasetStore();
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [chatModel, setChatModel] = useState('qwen3:8b');
  const [codeModel, setCodeModel] = useState('qwen2.5-coder:7b');
  const [checking, setChecking] = useState(false);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const res = await api.getLLMStatus();
      setOllamaStatus(res.connected, res.models);
    } catch {
      setOllamaStatus(false, []);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure local Ollama connection, AI model selection, sampling thresholds, and preferences.
        </p>
      </div>

      {/* Ollama Connection Card */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Ollama Engine (Local LLM)</h3>
              <p className="text-xs text-slate-400">
                All inference runs 100% on your local GPU/CPU.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                ollamaConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {ollamaConnected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Offline</span>
                </>
              )}
            </span>
            <button
              onClick={checkConnection}
              disabled={checking}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
              title="Test Ollama Connection"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Ollama API URL</label>
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white font-mono text-xs focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Main Chat Model</label>
            <select
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs focus:outline-none"
            >
              {ollamaModels.length > 0 ? (
                ollamaModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))
              ) : (
                <>
                  <option value="qwen3:8b">qwen3:8b (Default)</option>
                  <option value="gemma4">gemma4 (12B)</option>
                  <option value="llama3.1:8b">llama3.1:8b</option>
                  <option value="llama3.2:3b">llama3.2:3b (Fallback)</option>
                </>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Code Generator Model (Pandas)</label>
            <select
              value={codeModel}
              onChange={(e) => setCodeModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs focus:outline-none"
            >
              <option value="qwen2.5-coder:7b">qwen2.5-coder:7b (Recommended)</option>
              <option value="qwen3:8b">qwen3:8b</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Language Preference</label>
            <select className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs focus:outline-none">
              <option value="en">English</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="hinglish">Hinglish</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

