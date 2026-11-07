# Data Describer 📊🔒

A complete, local, privacy-first CSV and Excel analyser with a local open-source LLM (via Ollama). 

All computations (counts, stats, correlations, outlier detection, charts) are computed deterministically by Python (`pandas`, `DuckDB`, `scipy`, `Plotly`), never guessed by an LLM.

**Data never leaves your machine. 100% Offline.**

---

## Features Implemented & Working End-to-End

1. **Upload & Loading**: Drag-and-drop CSV, TSV, XLSX, XLS, JSON, and Parquet with delimiter and encoding auto-detection.
2. **Overview Dashboard**: Rows, columns, memory usage, file size, animated 0–100 Data Quality Score gauge, Top 5 actionable issues with "Fix" buttons, and interactive virtualized Data Grid with red-highlighted invalid cells.
3. **Column Profiler**: Physical and semantic types (`email`, `phone`, `date`, `currency`, `percentage`, `pincode`, `id`, `category`), distribution histograms, quartiles, IQR, skewness, min/max/mean/median, and top frequent value bars.
4. **Data Quality Suite**:
   - **Missing Data**: Completeness score, missing per column, matrix preview, suggested fixes (drop, mean, median, mode).
   - **Duplicates**: Exact duplicate row count & preview, fuzzy duplicate matching using `RapidFuzz` with similarity threshold slider.
   - **Errors & Rules**: Impossible values (negative age, age > 120), format validation, and custom pandas rule evaluator.
   - **Outliers**: IQR, Z-score, and multivariate IsolationForest anomaly detection.
5. **Relationships & Correlation**: Pearson and Spearman correlation heatmaps, categorical Cramér's V associations, ranked strongest pairs, and dependency network graph.
6. **Chart Builder & Sankey Flow**: Custom chart studio (Bar, Line, Scatter, Pie/Donut, Box, Violin, Histogram, and Sankey categorical flow diagram) using Plotly.
7. **AI Chat Agent**: Natural language queries (English, Hindi, Hinglish), AST-sandboxed Python code execution (blocking `os`, `sys`, `open`, `__import__`), collapsible code blocks, and table/chart outputs.
8. **One-Click Cleaning Engine**: Reversible operations (drop duplicates, impute missing, trim whitespace, standardize case, cap outliers) with full undo/redo, reset, and exportable Python pipeline script.
9. **Compare Two Datasets**: Side-by-side version comparison with schema changes and statistical drift metrics.
10. **Reports & Export Studio**: Export cleaned datasets to CSV, Excel (`.xlsx`), Parquet, and Python pipeline scripts, plus automated PII detection (emails, phones, PAN, Aadhaar) and privacy masking.

---

## Quick Start (Windows 11 PowerShell)

The servers are already running! You can open your browser immediately:

- **Frontend Application**: **[http://localhost:5173](http://localhost:5173)**
- **FastAPI Backend**: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**
- **Interactive API Documentation**: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

### To Start Manually in Future:
```powershell
cd "C:\Users\admin\.gemini\antigravity\scratch\Data Describer"
.\start.ps1
```

---

## Running Automated Tests
```powershell
cd "C:\Users\admin\.gemini\antigravity\scratch\Data Describer\backend"
python -m pytest
```
*All 17 automated unit and integration tests pass with 100% success.*
