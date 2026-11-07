from typing import Dict, Any
import pandas as pd
from app.core.type_inference import infer_semantic_type


def build_compact_dataset_context(df: pd.DataFrame, filename: str = "dataset") -> str:
    """Build compact text summary (< 2,000 tokens) for LLM prompts."""
    lines = [
        f"File: {filename}",
        f"Shape: {len(df):,} rows x {len(df.columns)} columns",
        "Columns summary:",
    ]

    for col in df.columns:
        s = df[col]
        sem_type = infer_semantic_type(s, col)
        null_count = int(s.isna().sum())
        null_pct = round(null_count / max(len(df), 1) * 100, 1)
        unique_cnt = int(s.nunique())
        
        sample_vals = [str(v) for v in s.dropna().head(3).tolist()]
        sample_str = ", ".join(sample_vals)

        if pd.api.types.is_numeric_dtype(s) and len(s.dropna()) > 0:
            lines.append(f" - {col} ({sem_type}): range [{s.min()} to {s.max()}], nulls: {null_pct}%, samples: [{sample_str}]")
        else:
            top_cats = [str(k) for k in s.value_counts().head(3).index]
            lines.append(f" - {col} ({sem_type}): {unique_cnt} uniques, nulls: {null_pct}%, top: [{', '.join(top_cats)}]")

    return "\n".join(lines)

