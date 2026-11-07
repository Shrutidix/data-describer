from typing import Dict, Any, List
import pandas as pd
import numpy as np


def compare_datasets(df1: pd.DataFrame, df2: pd.DataFrame, name1: str = "Dataset A", name2: str = "Dataset B") -> Dict[str, Any]:
    """Compare two dataframes for schema differences, row count shifts, and statistical drift."""
    cols1 = set(df1.columns)
    cols2 = set(df2.columns)

    common_cols = sorted(list(cols1.intersection(cols2)))
    added_cols = sorted(list(cols2 - cols1))
    removed_cols = sorted(list(cols1 - cols2))

    # Numerical drift on common columns
    drift_metrics = []
    for c in common_cols:
        s1 = df1[c]
        s2 = df2[c]
        if pd.api.types.is_numeric_dtype(s1) and pd.api.types.is_numeric_dtype(s2):
            m1 = float(s1.dropna().mean()) if len(s1.dropna()) > 0 else 0
            m2 = float(s2.dropna().mean()) if len(s2.dropna()) > 0 else 0
            pct_change = round(((m2 - m1) / max(abs(m1), 1e-5)) * 100, 2)
            drift_metrics.append({
                "column": c,
                "mean_a": round(m1, 2),
                "mean_b": round(m2, 2),
                "pct_change": pct_change,
                "type": "numeric",
            })
        else:
            u1 = int(s1.nunique())
            u2 = int(s2.nunique())
            drift_metrics.append({
                "column": c,
                "unique_a": u1,
                "unique_b": u2,
                "pct_change": round(((u2 - u1) / max(u1, 1)) * 100, 2),
                "type": "categorical",
            })

    return {
        "dataset_a": {"name": name1, "rows": len(df1), "cols": len(df1.columns)},
        "dataset_b": {"name": name2, "rows": len(df2), "cols": len(df2.columns)},
        "common_columns_count": len(common_cols),
        "added_columns": added_cols,
        "removed_columns": removed_cols,
        "drift_metrics": drift_metrics,
    }

