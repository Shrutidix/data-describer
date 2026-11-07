import React, { useState, useEffect } from 'react';
import { FileText, Download, Shield, EyeOff, FileCode, CheckCircle2 } from 'lucide-react';
import { useDatasetStore } from '../store/useDataset';
import { api } from '../api/client';

export const Report: React.FC = () => {
  const { currentDataset } = useDatasetStore();
  const [piiData, setPiiData] = useState<any>(null);

  useEffect(() => {
    if (!currentDataset) return;
    api.getPII(currentDataset.dataset_id).then(setPiiData);
  }, [currentDataset]);

  if (!currentDataset) {
    return <div className="text-center py-20 text-slate-400">Please load a dataset first.</div>;
  }

  const handleDownload = (format: string) => {
    window.open(`/api/datasets/${currentDataset.dataset_id}/export?format=${format}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Reports & Export Studio</h1>
        <p className="text-sm text-slate-400 mt-1">
          Export verified cleaned data, sensitive PII masks, and reproducible analysis scripts.
        </p>
      </div>

      {/* Export Formats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-1">Standard</span>
            <h3 className="font-bold text-white text-base">Cleaned CSV</h3>
            <p className="text-xs text-slate-400 mt-1">UTF-8 formatted flat file compatible with Excel, Tableau, and SQL.</p>
          </div>
          <button
            onClick={() => handleDownload('csv')}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">Spreadsheet</span>
            <h3 className="font-bold text-white text-base">Excel Workbook (.xlsx)</h3>
            <p className="text-xs text-slate-400 mt-1">Formatted Microsoft Excel workbook with column headers preserved.</p>
          </div>
          <button
            onClick={() => handleDownload('xlsx')}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider block mb-1">Big Data</span>
            <h3 className="font-bold text-white text-base">Apache Parquet</h3>
            <p className="text-xs text-slate-400 mt-1">High-compression columnar format for DuckDB, Spark, and Pandas.</p>
          </div>
          <button
            onClick={() => handleDownload('parquet')}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Parquet</span>
          </button>
        </div>
      </div>

      {/* PII Detection & Privacy Masking */}
      {piiData && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Sensitive Data & PII Detection</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
              {piiData.total_pii_columns} PII columns detected
            </span>
          </div>

          {piiData.has_pii ? (
            <div className="divide-y divide-slate-800 text-xs">
              {piiData.pii_columns.map((p: any) => (
                <div key={p.column} className="py-3 flex items-center justify-between">
                  <div>
                    <strong className="text-slate-200 block text-sm">{p.column}</strong>
                    <span className="text-slate-400 text-xs">{p.pii_type}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-slate-400">
                    <EyeOff className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Sample Mask: <strong className="text-indigo-300">{p.sample_masked}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No sensitive personal identity attributes detected in this dataset.</p>
          )}
        </div>
      )}
    </div>
  );
};
