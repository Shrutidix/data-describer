from typing import Dict, Any, List
import pandas as pd
import numpy as np

HIDDEN_MISSING_STRINGS = {"", " ", "na", "n/a", "null", "none", "-", "--", "?", "nil", "nan", "#n/a", "unknown"}
NUMERIC_SENTINELS = {9999, 99999, -999, -9999, 0}


def analyze_missing(df: pd.DataFrame) -> Dict[str, Any]:
    """Complete missing values analysis including hidden sentinels and suggestions."""
    total_rows = len(df)
    columns_missing = []
    
    # Check for hidden missing per column
    for col in df.columns:
        s = df[col]
        explicit_nulls = int(s.isna().sum())
        
        # Check hidden string nulls
        hidden_nulls = 0
        if s.dtype == object or pd.api.types.is_string_dtype(s):
            hidden_nulls = int(s.dropna().astype(str).str.strip().str.lower().isin(HIDDEN_MISSING_STRINGS).sum())
        elif pd.api.types.is_numeric_dtype(s):
            # Check for 9999 / -999 sentinels
            hidden_nulls = int(s.isin({9999, 99999, -999, -9999}).sum())

        total_missing = explicit_nulls + hidden_nulls
        pct = round(total_missing / total_rows * 100, 2) if total_rows > 0 else 0

        # Suggested remediation
        suggested_action = "none"
        reason = "Column is complete"
        if pct > 60.0:
            suggested_action = "drop_column"
            reason = f"High missing rate ({pct}% > 60%). Recommend dropping column."
        elif pct > 0:
            if pd.api.types.is_numeric_dtype(s):
                skew = abs(float(s.dropna().skew())) if len(s.dropna()) > 2 else 0
                if skew > 1.0:
                    suggested_action = "fill_median"
                    reason = f"Numeric with high skew ({skew:.1f}). Median imputation prevents outlier bias."
                else:
                    suggested_action = "fill_mean"
                    reason = "Normally distributed numeric column. Impute with mean."
            else:
                suggested_action = "fill_mode"
                reason = "Categorical / text column. Impute with most frequent category."

        columns_missing.append({
            "column": col,
            "explicit_nulls": explicit_nulls,
            "hidden_nulls": hidden_nulls,
            "total_missing": total_missing,
            "missing_pct": pct,
            "suggested_action": suggested_action,
            "reason": reason,
        })

    # Sort columns by missing_pct descending
    columns_missing.sort(key=lambda x: x["missing_pct"], reverse=True)

    # Matrix sample data (first 50 rows x all columns boolean mask for frontend heatmap)
    sample_size = min(50, total_rows)
    matrix_rows = []
    if sample_size > 0:
        sample_df = df.head(sample_size)
        for i, row in sample_df.iterrows():
            matrix_rows.append({
                "row_idx": int(i),
                "missing_cols": [col for col in df.columns if pd.isna(row[col]) or str(row[col]).strip().lower() in HIDDEN_MISSING_STRINGS]
            })

    # Overall dataset completeness
    total_cells = total_rows * len(df.columns) if total_rows > 0 else 1
    total_missing_cells = sum(c["total_missing"] for c in columns_missing)
    completeness_score = round(max(0, 100 - (total_missing_cells / total_cells * 100)), 1)

    return {
        "columns": columns_missing,
        "completeness_score": completeness_score,
        "total_missing_cells": total_missing_cells,
        "matrix_preview": matrix_rows,
    }

