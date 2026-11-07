# Data Describer — Build Spec for Antigravity

> **How to use this file**
> 1. Create an empty folder `data-describer/` and open it in Antigravity.
> 2. Put this file in the folder root as `SPEC.md`.
> 3. Paste the **Kickoff Prompt** (section 0) into the Antigravity agent panel.
> 4. Let it build **one phase at a time** (section 11). After each phase, run the app, check it, then say "Phase N done, start Phase N+1".

---

## 0. Kickoff Prompt (paste this into Antigravity)

```
You are a senior full-stack engineer. Build "Data Describer", a local, privacy-first
CSV/Excel analyser with a local open-source LLM, following SPEC.md in this folder
exactly. Read SPEC.md fully before writing any code.

Hard rules:
1. Backend: Python 3.11+, FastAPI, pandas, DuckDB, scipy, scikit-learn, Plotly.
   Frontend: React + Vite + TypeScript + Tailwind CSS + shadcn/ui + react-plotly.js.
2. LLM runs locally through Ollama (http://localhost:11434). Model name comes from
   .env (default qwen3:8b). Never call any cloud AI API.
3. ALL numbers (counts, stats, correlations, outliers) are computed by Python code,
   never guessed by the LLM. The LLM only plans, writes pandas code, and explains
   results in plain language.
4. LLM-generated code must run through the sandbox described in SPEC.md section 7.
5. Build in the phases listed in SPEC.md section 11. Finish one phase, make it run
   end-to-end, write its tests, then STOP and give me a short summary + the exact
   Windows commands to run it. Do not start the next phase until I say so.
6. Target OS is Windows 11 (PowerShell). Give Windows commands.
7. Keep code typed (Pydantic models on backend, TypeScript types on frontend),
   modular, and commented where logic is non-obvious.

Start with Phase 1.
```

---

## 1. Product Vision

A user drops a CSV or Excel file and within seconds gets a **complete health report** of their data — size, types, missing values, duplicates, errors, outliers, relationships, distributions — shown in a clean dashboard. Then they can **chat with their data** in plain English (or Hindi/Hinglish) and get answers, tables and charts, and **clean the data** with one click, with full undo and export.

Everything runs **on the user's own machine**: data never leaves the computer. That is the main selling point for businesses with sensitive data.

### Core design principle (important)
Small local models (3B–8B) are bad at arithmetic over large tables and will hallucinate numbers. So:

| Job | Who does it |
|---|---|
| Counting, statistics, correlations, outlier detection, charts | **Python (pandas / DuckDB / scipy)** — deterministic and exact |
| Understanding the user's question, writing pandas code, choosing the chart | **LLM** |
| Explaining results, summarising insights, suggesting next steps | **LLM** (given the computed numbers as context) |

---

## 2. Model Choice (Ollama)

Target hardware: NVIDIA RTX 5070 (12 GB VRAM), ~60 GB RAM. Make the model **configurable from the Settings page** (list models from `GET /api/tags` on Ollama).

| Role | Default | Alternatives | Notes |
|---|---|---|---|
| Main chat + reasoning | `qwen3:8b` | `gemma4` (12B), `llama3.1:8b` | Good tool calling and multilingual; fits 12 GB at Q4 |
| Code generation (pandas) | `qwen2.5-coder:7b` | `qwen3:8b` | Strong small coding model |
| Low-RAM / fast fallback | `llama3.2:3b` | `qwen3:4b`, `phi4-mini` | For laptops without a GPU |

Setup commands (Windows):
```powershell
# install Ollama from https://ollama.com/download, then:
ollama pull qwen3:8b
ollama pull qwen2.5-coder:7b
ollama pull llama3.2:3b
```

For Qwen3, append `/no_think` to the system prompt for fast answers; use thinking mode only for the "Deep Analysis" button.

---

## 3. Tech Stack

**Backend**
- FastAPI + Uvicorn (async API, auto docs at `/docs`)
- pandas + pyarrow (data frames), **DuckDB** (fast SQL on large files, 1M+ rows)
- openpyxl / calamine (`python-calamine`) for Excel, `chardet` for encoding detection
- scipy, scikit-learn (stats tests, IsolationForest outliers, mutual information)
- Plotly (Python) to build figure JSON that the frontend renders
- `ollama` Python SDK (or httpx to the Ollama REST API)
- SQLite (via SQLModel) for sessions, chat history, cleaning history
- WeasyPrint or `xhtml2pdf` for PDF reports; openpyxl for Excel export
- pytest for tests

**Frontend**
- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui (cards, tabs, dialogs, toasts) + lucide-react icons
- react-plotly.js for all charts
- TanStack Table (virtualised data grid for 100k+ rows) + TanStack Query (API state)
- Zustand (global state), react-dropzone (upload), react-markdown (AI answers)
- Framer Motion (subtle animations)

---

## 4. Folder Structure

```
data-describer/
├── SPEC.md
├── README.md
├── .env.example
├── start.ps1                     # starts backend + frontend together (Windows)
│
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py               # FastAPI app, CORS, router registration
│   │   ├── config.py             # pydantic-settings, reads .env
│   │   ├── db.py                 # SQLite session/history store
│   │   ├── api/
│   │   │   ├── upload.py         # POST /upload, GET /datasets
│   │   │   ├── profile.py        # overview, columns, quality score
│   │   │   ├── quality.py        # missing, duplicates, errors, outliers
│   │   │   ├── relations.py      # correlation, associations, pairs
│   │   │   ├── charts.py         # distribution, time series, custom charts
│   │   │   ├── clean.py          # cleaning actions, undo/redo, history
│   │   │   ├── chat.py           # AI chat (streaming SSE)
│   │   │   ├── insights.py       # auto insights
│   │   │   ├── compare.py        # compare two files
│   │   │   └── export.py         # CSV/Excel/PDF/HTML/notebook export
│   │   ├── core/
│   │   │   ├── loader.py         # CSV/Excel/JSON/Parquet loading, encoding, sheets
│   │   │   ├── type_inference.py # semantic types (email, phone, date, currency…)
│   │   │   ├── profiler.py       # per-column stats
│   │   │   ├── missing.py
│   │   │   ├── duplicates.py     # exact + fuzzy duplicates
│   │   │   ├── validators.py     # data errors / rule checks
│   │   │   ├── outliers.py       # IQR, Z-score, IsolationForest
│   │   │   ├── relations.py      # Pearson, Spearman, Cramér's V, correlation ratio
│   │   │   ├── timeseries.py     # trend, seasonality, gaps
│   │   │   ├── pii.py            # PII detection (email, phone, Aadhaar-like, PAN-like)
│   │   │   ├── quality_score.py  # 0–100 score
│   │   │   ├── cleaner.py        # cleaning operations as reversible steps
│   │   │   └── charts.py         # Plotly figure builders
│   │   ├── llm/
│   │   │   ├── client.py         # Ollama wrapper, streaming, model switching
│   │   │   ├── prompts.py        # all system prompts in one place
│   │   │   ├── context.py        # builds compact dataset summary for the LLM
│   │   │   ├── agent.py          # plan → code → run → explain loop
│   │   │   └── sandbox.py        # safe pandas code execution
│   │   ├── reports/
│   │   │   ├── templates/report.html  # Jinja2 template
│   │   │   └── builder.py
│   │   └── models/schemas.py     # Pydantic request/response models
│   └── tests/
│       ├── fixtures/             # messy sample CSVs/XLSX for tests
│       └── test_*.py
│
└── frontend/
    ├── package.json
    ├── index.html
    └── src/
        ├── main.tsx, App.tsx
        ├── api/client.ts          # typed API calls
        ├── store/useDataset.ts    # Zustand
        ├── types/
        ├── components/
        │   ├── layout/ (Sidebar, Topbar, ThemeToggle)
        │   ├── upload/ (DropZone, SheetPicker, UploadProgress)
        │   ├── overview/ (StatCard, QualityGauge, ColumnTypeBadge)
        │   ├── charts/ (PlotlyChart, ChartCard)
        │   ├── grid/ (DataGrid with highlight of bad cells)
        │   ├── chat/ (ChatPanel, MessageBubble, CodeBlock, SuggestedQuestions)
        │   └── clean/ (CleaningActionCard, HistoryTimeline, DiffPreview)
        └── pages/
            ├── Home.tsx           # upload + recent files
            ├── Overview.tsx
            ├── Columns.tsx
            ├── Quality.tsx        # missing / duplicates / errors / outliers tabs
            ├── Relationships.tsx
            ├── Visualize.tsx      # chart builder
            ├── Chat.tsx
            ├── Clean.tsx
            ├── Compare.tsx
            ├── Report.tsx
            └── Settings.tsx
```

---

## 5. Features (complete list)

### 5.1 Upload & Loading
- Drag-and-drop or browse. Formats: `.csv`, `.tsv`, `.txt`, `.xlsx`, `.xls`, `.json`, `.parquet`.
- Auto-detect encoding (UTF-8, UTF-16, Latin-1, Windows-1252) and delimiter (`,` `;` `\t` `|`).
- Excel: list all sheets, let user pick one or "load all".
- Detect header row automatically (skip junk title rows on top of Excel files).
- Large files (>200 MB): load into DuckDB, profile on a smart sample, show "sampled" badge; exact counts still via DuckDB SQL.
- Upload progress bar; recent files list on the Home page.

### 5.2 Overview Dashboard
- Rows, columns, file size, memory usage, load time.
- Column type breakdown (numeric / categorical / text / datetime / boolean / ID).
- **Data Quality Score 0–100** shown as a gauge, built from: completeness, uniqueness, validity, consistency, outlier ratio (weights shown on hover).
- Top 5 issues found, each with a "Fix" button.
- AI-written 4–6 line summary of the dataset ("This looks like a sales ledger with…").

### 5.3 Column Profiler (one card per column)
- Physical dtype + **semantic type** (email, phone, URL, date, currency, percentage, pincode, ID, free text, category).
- Count, missing %, unique count, unique %, most frequent values (top 10 bar).
- Numeric: min, max, mean, median, mode, std, variance, skewness, kurtosis, quartiles, IQR, zero count, negative count, histogram + box plot.
- Text: min/max/avg length, blank strings, leading/trailing spaces, case inconsistency, word cloud (optional).
- Datetime: range, gaps, most common weekday/month, future dates, invalid dates.
- Flags: constant column, high-cardinality, probable ID column, mixed types.

### 5.4 Missing Data
- Missing count and % per column (bar chart) and per row.
- Missing-value **heatmap/matrix** (like missingno) and missing-correlation (columns that go missing together).
- Detect hidden missing values: `""`, `" "`, `NA`, `N/A`, `null`, `None`, `-`, `?`, `0` in ID columns, `9999`-style sentinels.
- Suggested fix per column with reason: drop column (>60% missing), drop rows, fill mean/median/mode, forward-fill (time series), KNN impute, constant value.

### 5.5 Duplicates
- Exact duplicate rows (count + preview + "keep first/last/remove all").
- Duplicates on a chosen subset of columns (e.g. same email).
- **Fuzzy duplicates** ("Rahul Sharma" vs "rahul  sharma", "Lucknow" vs "Lucknw") using `rapidfuzz`, with similarity threshold slider.
- Duplicate columns (same values, different names).

### 5.6 Data Errors & Validation
- Mixed types in a column (numbers stored as text, "1,200" vs 1200).
- Invalid formats: emails, phones, dates, pincodes, URLs.
- Inconsistent categories ("Male", "male", "M", "MALE").
- Whitespace / special characters / encoding garbage (`Ã©`).
- Impossible values: negative age, age > 120, percentages > 100, future birth dates, end date before start date.
- **Custom rules builder**: user writes a rule like `age between 18 and 60` or in plain English; the LLM converts it to a pandas expression, Python validates it.
- All bad cells highlighted red in the data grid with a tooltip explaining why.

### 5.7 Outliers / Anomalies
- Methods: IQR, Z-score, Modified Z-score (MAD), IsolationForest (multivariate).
- Box plots + scatter with outliers highlighted; table of outlier rows.
- Actions: remove, cap (winsorize), mark as a new column `is_outlier`.

### 5.8 Relationships Between Columns
- **Correlation heatmap** (Pearson, Spearman, Kendall — switchable).
- Categorical vs categorical: Cramér's V matrix.
- Numeric vs categorical: correlation ratio (eta) + grouped box plots.
- Mutual information score (catches non-linear relations).
- Top 10 strongest relationships as a ranked list with plain-English explanation ("Price and Quantity are strongly negatively related (−0.82)").
- Scatter matrix (pair plot) for chosen columns, with trend line.
- Multicollinearity warning (VIF) for ML users.
- **Relationship network graph**: columns as nodes, edges weighted by correlation strength.

### 5.9 Flow & Visual Charts
- Auto chart gallery: best chart chosen per column type.
- **Chart builder**: pick X, Y, colour, aggregation, chart type (bar, line, area, scatter, pie, donut, histogram, box, violin, heatmap, treemap, sunburst, **Sankey flow**, funnel, geo map if lat/long or Indian states present).
- **Sankey / flow diagram** for categorical flows (e.g. Region → Product → Status).
- **Data pipeline flow graph**: a visual flowchart of the cleaning steps applied (Raw file → Removed 120 duplicates → Filled 45 missing ages → Clean file).
- Time series: line with rolling average, trend/seasonality decomposition, gap detection.
- Every chart: download PNG/SVG, "Ask AI about this chart" button.

### 5.10 Chat With Your Data (AI)
- Chat panel with streaming answers (Server-Sent Events).
- Answers can include: text, a table, a Plotly chart, and a collapsible "Show code" block.
- Supports English, Hindi and Hinglish questions.
- Suggested questions generated from the dataset ("Which city has the highest sales?").
- Remembers conversation context; "New chat" resets.
- If code fails, the agent retries up to 2 times with the error message (self-correction).
- "Deep Analysis" toggle: uses thinking mode + multi-step plan.

### 5.11 Auto Insights
- One click generates 8–12 insight cards: top/bottom performers, unusual spikes, strong relationships, skewed columns, segments that differ, trends over time.
- Each insight is computed in Python first, then the LLM writes the one-line explanation.
- Pin insights to the report.

### 5.12 One-Click Cleaning (with Undo)
- Every cleaning action is a **step** stored in history: `{op, params, rows_affected, timestamp}`.
- Preview before apply (side-by-side diff of affected rows).
- Undo / redo / reset to original.
- Operations: drop/fill missing, remove duplicates, trim spaces, fix case, standardise categories (mapping table), convert types, parse dates, remove/cap outliers, rename/drop columns, split/merge columns, find & replace, filter rows.
- **Export cleaning steps as a Python script** (reproducible pandas code).

### 5.13 PII / Sensitive Data Detection
- Detect emails, phone numbers, Aadhaar-like 12-digit numbers, PAN-like patterns, card-like numbers, names, addresses.
- Badge on the column + option to mask (`r****@gmail.com`) or hash before export.

### 5.14 Compare Two Files
- Upload file A and B (e.g. Jan vs Feb): schema differences, added/removed rows (by key column), changed values, stats drift per column.

### 5.15 Reports & Export
- Full report as **PDF**, **HTML** (interactive charts), and **Excel** (multiple sheets: summary, issues, column stats, cleaned data).
- Export cleaned data as CSV / Excel / Parquet.
- Export a Jupyter notebook with all the analysis code.

### 5.16 Settings
- Ollama URL, chat model, code model (dropdowns from installed models), temperature.
- Dark / light theme. Sample size for big files. Language preference.
- "Check Ollama" status indicator (green/red dot in the top bar).

---

## 6. API Design (FastAPI)

All routes under `/api`. Dataset identified by `dataset_id` (UUID). Responses are Pydantic models.

| Method | Route | Purpose |
|---|---|---|
| POST | `/upload` | multipart file → `{dataset_id, sheets?, rows, cols}` |
| GET | `/datasets` | recent datasets |
| GET | `/datasets/{id}/preview?page=&size=` | paginated rows + cell-level issue flags |
| GET | `/datasets/{id}/overview` | counts, types, quality score, top issues |
| GET | `/datasets/{id}/columns` | full profile per column |
| GET | `/datasets/{id}/missing` | missing stats + matrix data |
| GET | `/datasets/{id}/duplicates?subset=&fuzzy=&threshold=` | duplicates |
| GET | `/datasets/{id}/errors` | validation errors |
| POST | `/datasets/{id}/rules` | custom rule (text or expression) → violations |
| GET | `/datasets/{id}/outliers?method=` | outliers |
| GET | `/datasets/{id}/relations?method=` | correlation / Cramér's V / MI matrices + top pairs |
| POST | `/datasets/{id}/chart` | chart spec → Plotly JSON |
| GET | `/datasets/{id}/insights` | auto insights |
| POST | `/datasets/{id}/chat` | SSE stream: tokens, code, table, chart events |
| POST | `/datasets/{id}/clean/preview` | step → diff preview |
| POST | `/datasets/{id}/clean/apply` | apply step |
| POST | `/datasets/{id}/clean/undo` · `/redo` · `/reset` | history control |
| GET | `/datasets/{id}/clean/script` | reproducible pandas script |
| POST | `/compare` | two dataset ids → diff report |
| GET | `/datasets/{id}/export?format=csv|xlsx|parquet|pdf|html|ipynb` | downloads |
| GET | `/llm/status` · `/llm/models` | Ollama health + installed models |

Cache heavy results (profile, relations) per `dataset_id + version` so the UI is instant after the first run.

---

## 7. LLM Integration Design

### 7.1 Dataset context (sent to the LLM, never the full data)
`llm/context.py` builds a compact summary (< 2,000 tokens):
- file name, rows, columns
- per column: name, dtype, semantic type, missing %, unique count, 3 sample values, min/max or top categories
- known issues list
- the DataFrame variable is always `df`

### 7.2 Agent loop (`llm/agent.py`)
```
user question
  → classify intent (question / chart / clean / explain / smalltalk)
  → code model writes pandas code that stores the answer in `result`
     (and optionally a Plotly figure in `fig`)
  → sandbox runs code (timeout 15s)
  → on error: send traceback back to the model, retry (max 2)
  → chat model receives the question + computed result (truncated)
     and writes a short plain-language answer
  → stream to UI: text tokens + table + chart + code
```

### 7.3 Sandbox (`llm/sandbox.py`)
- Parse code with `ast`; **reject** imports other than `pandas, numpy, plotly.express, plotly.graph_objects, scipy.stats, math, datetime, re`; reject `open`, `exec`, `eval`, `__import__`, `os`, `sys`, `subprocess`, `socket`, `requests`, dunder attribute access, file writes.
- Run in a separate process (`multiprocessing`) with a timeout and memory cap; work on a **copy** of `df` so the original is never modified by chat.
- Return `result` (DataFrame → first 200 rows as JSON, scalar → value) and `fig` (Plotly JSON).
- Note in README: this is a safety layer for a local single-user tool, not a hardened multi-tenant sandbox.

### 7.4 System prompts (`llm/prompts.py`)
**Code-writer prompt (summary):**
```
You are a pandas expert. A DataFrame named `df` is already loaded.
Dataset summary:
{context}
Write Python code that answers the user's question.
Rules:
- Use only pandas (pd), numpy (np), plotly.express (px).
- Store the final answer in a variable named `result`.
- If a chart helps, create a Plotly figure in a variable named `fig`.
- Do not print, do not read or write files, do not import other modules.
- Return ONLY code inside one ```python block.
Question: {question}
```
**Explainer prompt (summary):**
```
You are a friendly data analyst. Explain the result below to a non-technical
business user in 2–5 sentences. Use exact numbers from the result only; never
invent numbers. If the result is empty or looks wrong, say so.
Reply in the same language the user asked in (English/Hindi/Hinglish).
Question: {question}
Computed result: {result}
```

---

## 8. UI / UX Design Spec

**Look & feel:** clean, modern SaaS dashboard (think Linear / Vercel). Dark mode default with light mode toggle.
- Font: Inter (UI), JetBrains Mono (code).
- Colours: background `#0B0F19` (dark) / `#F8FAFC` (light); primary indigo `#6366F1`; success `#10B981`; warning `#F59E0B`; danger `#EF4444`.
- Rounded cards (`rounded-2xl`), soft shadows, generous spacing, 8px grid.
- Skeleton loaders for every async card; toasts for actions; empty states with illustrations.
- Charts use one consistent Plotly theme matching the app colours (light + dark templates).

**Layout:**
- Left **sidebar**: Overview, Columns, Quality, Relationships, Visualize, Chat, Clean, Compare, Report, Settings. Collapsible.
- **Top bar**: dataset name + switcher, rows × cols badge, Quality Score chip, Ollama status dot, theme toggle, Export button.
- **Floating AI button** (bottom-right) opens chat as a side drawer from any page.

**Home page:** big drop zone with animated border, supported formats, "Try sample dataset" button (bundle 2–3 messy sample files), recent files grid.

**Overview page:** row of 4 stat cards → quality gauge + issues list → column type donut → AI summary card → mini data grid.

**Quality page:** tabs for Missing / Duplicates / Errors / Outliers, each with a chart on top, table below, and fix actions on the right.

**Chat page:** messages on the left (60%), live "result panel" on the right (40%) showing the latest table/chart large; suggested question chips above the input.

**Clean page:** action cards grid on the left; history timeline + pipeline flow graph on the right; preview dialog with before/after diff.

Responsive down to 1280px wide (desktop-first app); usable on tablet.

---

## 9. Ideas That Make It Stand Out (enhancements)

1. **Privacy-first local AI** — headline feature; show a "🔒 100% offline" badge.
2. **Data Quality Score** with history (score goes up as you clean — gamified).
3. **Explain-like-I'm-new mode** — every stat has an ⓘ tooltip in simple words.
4. **Reproducible pipeline** — export cleaning steps as a Python script / notebook.
5. **Natural-language validation rules** ("phone must be 10 digits").
6. **Hinglish chat** support for Indian SMB users.
7. **Data storytelling report** — PDF with an AI-written narrative, ready for a client.
8. **Schema drift / compare** for monthly reports.
9. **PII masking** before sharing data.
10. **Future (v2):** connect to MySQL/PostgreSQL/Google Sheets, scheduled re-checks, simple forecasting (Prophet/statsmodels), ML-readiness check (target leakage, class imbalance), multi-user login, Docker image.

---

## 10. Non-Functional Requirements
- 100k rows × 50 cols: full profile in < 5 s on the target machine.
- 1M+ rows: works via DuckDB + sampling; UI never freezes (virtualised grid).
- Original uploaded file is never modified; cleaning works on versioned copies.
- All LLM failures are handled gracefully (Ollama offline → analysis still works, chat shows a clear message with "how to start Ollama").
- Logging with `loguru`; errors return JSON `{error, detail}`.
- `.env.example` with: `OLLAMA_URL`, `CHAT_MODEL`, `CODE_MODEL`, `MAX_UPLOAD_MB`, `SAMPLE_ROWS`, `DATA_DIR`.

---

## 11. Build Phases (Antigravity builds one at a time)

| Phase | Scope | Done when |
|---|---|---|
| **1. Skeleton** | Folder structure, FastAPI app with `/health`, React + Vite + Tailwind + shadcn setup, sidebar layout, dark/light theme, `start.ps1` | Both servers start with one command; empty dashboard visible |
| **2. Upload & Overview** | loader (CSV/Excel/encoding/sheets), `/upload`, `/overview`, `/preview`, Home + Overview pages, data grid | Upload a messy CSV and see rows, cols, types, preview |
| **3. Column profiler + Missing + Duplicates** | profiler, semantic types, missing analysis + heatmap, exact + fuzzy duplicates | Columns & Quality pages fully working |
| **4. Errors, Outliers, Quality Score** | validators, custom rules (expression only for now), outliers (IQR/Z/IsolationForest), quality score gauge, bad-cell highlighting | Score shows; bad cells highlighted red |
| **5. Relationships & Charts** | correlation/Cramér's V/MI, network graph, chart builder incl. Sankey, time series, auto chart gallery | Relationships + Visualize pages done |
| **6. Local LLM** | Ollama client, status endpoint, Settings page, dataset context, AI summary on Overview | Summary appears; model switch works |
| **7. Chat agent** | sandbox, agent loop with retries, SSE streaming, chat UI with code/table/chart, suggested questions, NL rules | Ask "top 5 cities by sales as bar chart" → correct chart |
| **8. Cleaning** | cleaner steps, preview diff, undo/redo/reset, pipeline flow graph, export script | Clean a file, undo, export script, script reproduces result |
| **9. Insights, PII, Compare** | auto insights, PII detect/mask, compare two files | All three pages working |
| **10. Reports & polish** | PDF/HTML/Excel/notebook export, sample datasets, empty states, loading skeletons, README with screenshots | Full demo flow works start to finish |

---

## 12. Testing & Acceptance

Create `backend/tests/fixtures/` with deliberately messy files:
- `sales_messy.csv` — duplicates, missing values, "N/A" strings, "1,200" numbers, mixed date formats, outliers, inconsistent city names.
- `employees.xlsx` — 2 sheets, junk title rows above the header, invalid emails/phones, negative ages.
- `big_1m.csv` — generated 1M-row file for performance testing.

Tests (pytest) must verify **exact** expected counts on these fixtures (e.g. "sales_messy has exactly 37 duplicate rows"). Also test: sandbox blocks `import os`, `open()`, `__import__`; agent retry on failing code; undo restores identical DataFrame.

Final acceptance demo:
1. Upload `sales_messy.csv` → overview + score appear in < 5 s.
2. Quality page lists missing, duplicates, errors, outliers correctly.
3. Ask in chat: "Which region had the highest revenue last quarter? Show a chart." → correct number + chart + code.
4. Ask in Hinglish: "sabse zyada orders kis city se aaye?" → correct answer.
5. Clean: remove duplicates, fill missing, standardise city names → score increases → undo works.
6. Export PDF report + cleaned Excel + Python script.

---

## 13. Windows Run Commands (expected in README)

```powershell
# backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend (new terminal)
cd frontend
npm install
npm run dev        # http://localhost:5173

# or both at once
.\start.ps1
```

