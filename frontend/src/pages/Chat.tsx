import React, { useState } from 'react';
import { MessageSquare, Send, Sparkles, Code2, ChevronDown, ChevronUp, Loader2, Bot, User, Table } from 'lucide-react';
import { useDatasetStore } from '../store/useDataset';
import { api } from '../api/client';
import { ChatMessage } from '../types';
import Plot from 'react-plotly.js';

export const Chat: React.FC = () => {
  const { currentDataset, ollamaConnected } = useDatasetStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your local AI data analyst. Ask me any question about this dataset in English, Hindi, or Hinglish. I write exact Python code to compute answers deterministically.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});

  const suggestedQuestions = [
    'Top 5 categories by revenue as a bar chart',
    'Which region has the most missing customer records?',
    'What is the distribution of customer age?',
    'Sabse zyada orders kis city se aaye?',
  ];

  const handleSend = async (questionText?: string) => {
    const q = questionText || input;
    if (!q.trim() || !currentDataset || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: q.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chat(currentDataset.dataset_id, q.trim());
      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: res.explanation || 'Analysis computed.',
        code: res.code,
        result: res.result,
        figure: res.figure,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: `Error processing query: ${e.message}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleCode = (id: string) => {
    setExpandedCodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!currentDataset) {
    return <div className="text-center py-20 text-slate-400">Please load a dataset first.</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto space-y-4">
      {/* Top chat header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Chat With Your Data</h1>
          <p className="text-xs text-slate-400">Deterministic pandas execution • 100% Offline</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${ollamaConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <span className="text-slate-400 font-medium">
            {ollamaConnected ? 'Local Ollama Connected' : 'Heuristic Mode (Ollama Offline)'}
          </span>
        </div>
      </div>

      {/* Suggested queries */}
      <div className="flex flex-wrap gap-2">
        {suggestedQuestions.map((sq, i) => (
          <button
            key={i}
            onClick={() => handleSend(sq)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/60 text-xs text-slate-300 font-medium hover:text-white transition-all text-left"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Message history */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs space-y-3 leading-relaxed shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none font-medium'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* Collapsible Python Code Block */}
              {msg.code && (
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => toggleCode(msg.id)}
                    className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-400 hover:text-indigo-300"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{expandedCodes[msg.id] ? 'Hide Python code' : 'Show Python code'}</span>
                    {expandedCodes[msg.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {expandedCodes[msg.id] && (
                    <pre className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto font-mono">
                      {msg.code}
                    </pre>
                  )}
                </div>
              )}

              {/* Rendered Table Result */}
              {msg.result && msg.result.type === 'dataframe' && (
                <div className="overflow-x-auto max-h-48 rounded-xl border border-slate-800 bg-slate-950/60 p-2 font-mono">
                  <table className="w-full text-[11px] text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        {msg.result.columns.map((col: string) => (
                          <th key={col} className="p-1.5 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {msg.result.rows.map((row: any, rIdx: number) => (
                        <tr key={rIdx}>
                          {msg.result.columns.map((col: string) => (
                            <td key={col} className="p-1.5 whitespace-nowrap text-slate-300">{String(row[col])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Rendered Plotly Chart */}
              {msg.figure && (
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                  <Plot
                    data={msg.figure.data || []}
                    layout={{
                      ...msg.figure.layout,
                      autosize: true,
                      paper_bgcolor: 'transparent',
                      plot_bgcolor: 'transparent',
                      font: { color: '#94A3B8', size: 10 },
                      margin: { l: 40, r: 20, t: 30, b: 30 },
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '260px' }}
                  />
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-indigo-400 text-xs py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing dataset in Python sandbox...</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 pt-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this dataset (e.g. Which region made highest sales?)..."
          className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
