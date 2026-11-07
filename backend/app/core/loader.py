import os
import uuid
import chardet
import csv
from pathlib import Path
from typing import Tuple, Dict, Any, List, Optional
import pandas as pd
import duckdb
from loguru import logger
from app.config import settings

# In-memory dataset registry: dataset_id -> { "df": pd.DataFrame, "meta": dict, "history": list, "history_idx": int }
DATASET_STORE: Dict[str, Dict[str, Any]] = {}


def detect_encoding(file_path: str) -> str:
    """Detect text file encoding using chardet with UTF-8 fallback."""
    with open(file_path, "rb") as f:
        raw = f.read(100_000)
    res = chardet.detect(raw)
    encoding = res.get("encoding") or "utf-8"
    if encoding.lower() in ["ascii", "iso-8859-1", "windows-1252"]:
        # Test if it decodes as utf-8 cleanly
        try:
            raw.decode("utf-8")
            return "utf-8"
        except UnicodeDecodeError:
            return encoding
    return encoding


def detect_delimiter(file_path: str, encoding: str) -> str:
    """Detect delimiter among comma, semicolon, tab, pipe."""
    candidates = [",", ";", "\t", "|"]
    try:
        with open(file_path, "r", encoding=encoding, errors="replace") as f:
            sample = "".join([f.readline() for _ in range(15)])
        sniffer = csv.Sniffer()
        dialect = sniffer.sniff(sample, delimiters=";,|\t")
        return dialect.delimiter
    except Exception:
        # Fallback line counter
        counts = {c: 0 for c in candidates}
        try:
            with open(file_path, "r", encoding=encoding, errors="replace") as f:
                for _ in range(10):
                    line = f.readline()
                    for c in candidates:
                        counts[c] += line.count(c)
            best = max(counts, key=counts.get)
            return best if counts[best] > 0 else ","
        except Exception:
            return ","


def get_excel_sheets(file_path: str) -> List[str]:
    """Return sheet names of an Excel workbook."""
    xl = pd.ExcelFile(file_path)
    return xl.sheet_names


def load_dataset(file_path: str, sheet_name: Optional[str] = None) -> Tuple[str, pd.DataFrame, Dict[str, Any]]:
    """
    Load dataset from file into pandas DataFrame.
    Supports CSV, TSV, XLSX, XLS, JSON, Parquet.
    """
    path = Path(file_path)
    ext = path.suffix.lower()
    file_size = os.path.getsize(file_path)
    dataset_id = str(uuid.uuid4())

    meta: Dict[str, Any] = {
        "dataset_id": dataset_id,
        "filename": path.name,
        "file_size_bytes": file_size,
        "format": ext,
        "sheets": None,
        "selected_sheet": None,
        "is_sampled": False,
        "total_rows": 0,
    }

    df: pd.DataFrame
    if ext in [".xlsx", ".xls"]:
        xl = pd.ExcelFile(file_path)
        meta["sheets"] = xl.sheet_names
        target_sheet = sheet_name or xl.sheet_names[0]
        meta["selected_sheet"] = target_sheet
        
        # Read header with auto-skip junk rows if top rows are sparse
        preview_df = xl.parse(target_sheet, nrows=10, header=None)
        skip = 0
        for i, row in preview_df.iterrows():
            if row.dropna().count() >= 2:
                skip = i
                break
        df = xl.parse(target_sheet, skiprows=skip)
    elif ext in [".parquet"]:
        df = pd.read_parquet(file_path)
    elif ext in [".json"]:
        df = pd.read_json(file_path)
    else:  # CSV, TSV, TXT
        encoding = detect_encoding(file_path)
        delimiter = detect_delimiter(file_path, encoding)
        meta["encoding"] = encoding
        meta["delimiter"] = delimiter
        
        # If file is very large (> 200MB), sample or load via duckdb
        if file_size > settings.MAX_UPLOAD_MB * 1024 * 1024:
            logger.info(f"Large file detected ({file_size / 1e6:.1f} MB). Reading smart sample.")
            con = duckdb.connect()
            total_rows = con.execute(f"SELECT count(*) FROM read_csv_auto('{file_path}')").fetchone()[0]
            meta["is_sampled"] = True
            meta["total_rows"] = total_rows
            df = con.execute(f"SELECT * FROM read_csv_auto('{file_path}') LIMIT {settings.SAMPLE_ROWS}").df()
        else:
            df = pd.read_csv(file_path, encoding=encoding, sep=delimiter, low_memory=False)

    # Clean column names (strip whitespace)
    df.columns = [str(c).strip() if c is not None else f"col_{i}" for i, c in enumerate(df.columns)]
    
    meta["rows"] = len(df)
    meta["columns"] = len(df.columns)
    if not meta.get("total_rows"):
        meta["total_rows"] = len(df)

    # Store in memory registry with history stack for cleaning undo/redo
    DATASET_STORE[dataset_id] = {
        "df": df,
        "initial_df": df.copy(deep=True),
        "meta": meta,
        "history": [],      # List of {op, params, rows_affected, timestamp, df_snapshot}
        "history_idx": -1,
        "file_path": file_path,
    }

    return dataset_id, df, meta


def get_dataset(dataset_id: str) -> Optional[pd.DataFrame]:
    if dataset_id in DATASET_STORE:
        return DATASET_STORE[dataset_id]["df"]
    return None


def get_dataset_meta(dataset_id: str) -> Optional[Dict[str, Any]]:
    if dataset_id in DATASET_STORE:
        return DATASET_STORE[dataset_id]["meta"]
    return None

