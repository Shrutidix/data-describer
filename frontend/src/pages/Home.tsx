import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileSpreadsheet,
  ShieldCheck,
  Zap,
  Lock,
  Sparkles,
  ArrowRight,
  Loader2,
  Clock,
  Layers,
} from 'lucide-react';
import { useDatasetStore } from '../store/useDataset';
import { api } from '../api/client';

export const Home: React.FC = () => {
  const { setCurrentDataset, setCurrentPage, recentDatasets, loadRecentDatasets } = useDatasetStore();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecentDatasets();
  }, [loadRecentDatasets]);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setUploading(true);
    setError(null);

    try {
      const meta = await api.uploadFile(file);
      setCurrentDataset(meta);
      setCurrentPage('overview');
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'text/csv': ['.csv', '.tsv', '.txt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
      'application/octet-stream': ['.parquet'],
    },
  });

  const handleSampleClick = async () => {
    setUploading(true);
    setError(null);
    try {
      // Create sample file from demo data
      const sampleContent = `Order_ID,Date,Customer_Name,City,Region,Product_Category,Quantity,Unit_Price,Revenue,Discount,Payment_Method,Customer_Age
1001,2026-01-15,Rahul Sharma,Mumbai,West,Electronics,2,1200,2400,0.1,Credit Card,34
1001,2026-01-15,Rahul Sharma,Mumbai,West,Electronics,2,1200,2400,0.1,Credit Card,34
1002,15/01/2026,rahul  sharma,Mumbai,West,Electronics,2,1200,2400,0.1,Credit Card,34
1003,2026-01-16,Priya Patel,Ahmedabad,West,Apparel,1,850,850,0.05,UPI,28
1004,2026-01-16,Amit Verma,Delhi,North,Home,3,450,"1,350",0.15,Net Banking,42
1005,2026-01-17,Sneha Reddy,Bangalore,South,Electronics,1,35000,35000,0.0,Credit Card,29
1006,2026-01-18,Vikram Singh,Lucknow,North,Apparel,2,700,1400,N/A,Cash,31
1006,2026-01-18,Vikram Singh,Lucknow,North,Apparel,2,700,1400,N/A,Cash,31
1008,2026-01-19,Ananya Gupta,Kolkata,East,Beauty,4,300,1200,0.1,UPI,null
1009,2026-01-20,Rohan Mehta,Mumbai,West,Electronics,1,75000,75000,0.05,Credit Card,45
1010,2026-01-21,Kavita Nair,Kochi,South,Grocery,10,120,1200,0.02,UPI,38
1011,2026-01-22,Arjun Rao,Hyderabad,South,Electronics,1,18000,18000,0.1,Credit Card,
1012,2026-01-23,Neha Joshi,Pune,West,Apparel,2,950,1900,0.0,Debit Card,26
1013,2026-01-24,Suresh Kumar,Delhi,North,Home,1,999999,999999,0.0,Net Banking,-5
1014,2026-01-25,Pooja Mishra,Lucknw,North,Beauty,3,400,1200,0.1,UPI,33
1015,2026-01-26,Manoj Tiwari,Patna,East,Grocery,5,150,750,0.0,Cash,52
1016,2026-01-27,Sunita Das,Kolkata,East,Electronics,2,4500,9000,0.08,Credit Card,41
1017,2026-01-28,Deepak Chawla,Delhi,North,Apparel,1,1100,1100,0.05,UPI,30
1018,2026-01-29,Shweta Iyer,Chennai,South,Beauty,2,650,1300,0.1,Debit Card,27
1019,2026-01-30,Rajesh Khanna,Mumbai,West,Home,1,3200,3200,0.15,Credit Card,145
1020,2026-01-31,Simran Kaur,Chandigarh,North,Grocery,4,250,1000,0.05,UPI,35`;

      const blob = new Blob([sampleContent], { type: 'text/csv' });
      const file = new File([blob], 'sales_messy_sample.csv', { type: 'text/csv' });
      const meta = await api.uploadFile(file);
      setCurrentDataset(meta);
      setCurrentPage('overview');
    } catch (err: any) {
      setError(err.message || 'Sample loading failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-6">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <Lock className="w-3.5 h-3.5" />
          <span>Local & Offline • Data Never Leaves Your Device</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          Drop any CSV or Excel file. <br />
          <span className="bg-gradient-to-r from-indigo-400 via-indigo-200 to-indigo-500 bg-clip-text text-transparent">
            Get instant health, insights & AI chat.
          </span>
        </h1>
        <p className="text-slate-400 text-base max-w-2xl mx-auto">
          Comprehensive health score, missing values, duplicates, outliers, distribution plots,
          and plain-English queries powered by deterministic Python + local Ollama.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="relative group">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/30 to-purple-500/30 blur-xl opacity-50 group-hover:opacity-80 transition duration-500" />
        <div
          {...getRootProps()}
          className={`relative rounded-3xl border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
            isDragActive
              ? 'border-indigo-400 bg-indigo-950/40 scale-[1.01]'
              : 'border-slate-700 hover:border-indigo-500/80 bg-slate-900/80 backdrop-blur-xl'
          }`}
        >
          <input {...getInputProps()} />

          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <h3 className="text-xl font-bold text-white mb-2">
            {uploading ? 'Profiling and indexing dataset...' : 'Drag & drop your dataset here, or browse'}
          </h3>

          <p className="text-sm text-slate-400 mb-6">
            Supports CSV, TSV, XLSX, XLS, JSON, and Parquet (up to 200 MB)
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSampleClick();
              }}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 hover:border-slate-600 transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Try with messy sample dataset</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium max-w-md mx-auto">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Recent Datasets */}
      {recentDatasets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Recent Datasets</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentDatasets.map((d) => (
              <button
                key={d.dataset_id}
                onClick={() => {
                  setCurrentDataset(d);
                  setCurrentPage('overview');
                }}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 text-left transition-all group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2.5 rounded-xl bg-slate-800 text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-sm text-slate-200 block truncate">
                      {d.filename}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {d.rows.toLocaleString()} rows × {d.columns} cols
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="font-semibold text-white text-base">Data Quality Score (0–100)</h4>
          <p className="text-sm text-slate-400 leading-relaxed">
            Multi-metric health score evaluating completeness, uniqueness, format validity, and outlier ratios.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Zap className="w-5 h-5" />
          </div>
          <h4 className="font-semibold text-white text-base">Deterministic Python Stats</h4>
          <p className="text-sm text-slate-400 leading-relaxed">
            Exact computations via pandas, DuckDB, and scipy. Zero hallucinated arithmetic.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="font-semibold text-white text-base">One-Click Cleaning & Undo</h4>
          <p className="text-sm text-slate-400 leading-relaxed">
            Fix issues with before/after diffs, step history, and exportable reproducible pandas scripts.
          </p>
        </div>
      </div>
    </div>
  );
};
