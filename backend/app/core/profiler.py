from typing import Dict, Any, List
import pandas as pd
import numpy as np
from scipy import stats
from app.core.type_inference import infer_semantic_type


def profile_column(series: pd.Series, col_name: str) -> Dict[str, Any]:
    """Generate detailed descriptive statistics for a single column."""
    total_count = len(series)
    null_count = int(series.isna().sum())
    null_pct = round((null_count / total_count * 100), 2) if total_count > 0 else 0
    clean_series = series.dropna()
    valid_count = len(clean_series)
    unique_count = int(series.nunique())
    unique_pct = round((unique_count / total_count * 100), 2) if total_count > 0 else 0

    semantic_type = infer_semantic_type(series, col_name)
    physical_dtype = str(series.dtype)

    # Top 10 most frequent values
    top_values = []
    if valid_count > 0:
        val_counts = clean_series.astype(str).value_counts().head(10)
        top_values = [{"value": str(k), "count": int(v), "pct": round(v / total_count * 100, 2)} for k, v in val_counts.items()]

    col_profile: Dict[str, Any] = {
        "name": col_name,
        "physical_dtype": physical_dtype,
        "semantic_type": semantic_type,
        "total_count": total_count,
        "valid_count": valid_count,
        "missing_count": null_count,
        "missing_pct": null_pct,
        "unique_count": unique_count,
        "unique_pct": unique_pct,
        "top_values": top_values,
        "is_constant": unique_count == 1,
        "is_unique": unique_count == total_count,
        "stats": {},
    }

    # Numeric profiling
    # Convert series to numeric if possible (e.g. currency, commas)
    numeric_s = None
    if pd.api.types.is_numeric_dtype(series):
        numeric_s = clean_series.astype(float)
    else:
        try:
            cleaned_num = clean_series.astype(str).str.replace(r"[^\d.-]", "", regex=True)
            numeric_s = pd.to_numeric(cleaned_num, errors="coerce").dropna()
            if len(numeric_s) < valid_count * 0.7:
                numeric_s = None
        except Exception:
            numeric_s = None

    if numeric_s is not None and len(numeric_s) > 0:
        q25 = float(np.percentile(numeric_s, 25))
        q50 = float(np.percentile(numeric_s, 50))
        q75 = float(np.percentile(numeric_s, 75))
        iqr = q75 - q25
        mean_val = float(numeric_s.mean())
        std_val = float(numeric_s.std()) if len(numeric_s) > 1 else 0.0

        # Histogram calculation (15 bins)
        counts, bin_edges = np.histogram(numeric_s, bins=min(15, max(5, unique_count)))
        bins = [{"bin_start": round(bin_edges[i], 2), "bin_end": round(bin_edges[i+1], 2), "count": int(counts[i])} for i in range(len(counts))]

        skew_val = float(stats.skew(numeric_s)) if len(numeric_s) > 2 and std_val > 0 else 0.0
        kurt_val = float(stats.kurtosis(numeric_s)) if len(numeric_s) > 3 and std_val > 0 else 0.0

        col_profile["stats"] = {
            "min": float(numeric_s.min()),
            "max": float(numeric_s.max()),
            "mean": round(mean_val, 2),
            "median": round(q50, 2),
            "std": round(std_val, 2),
            "variance": round(float(numeric_s.var()), 2) if len(numeric_s) > 1 else 0.0,
            "q25": round(q25, 2),
            "q75": round(q75, 2),
            "iqr": round(iqr, 2),
            "skewness": round(skew_val, 2),
            "kurtosis": round(kurt_val, 2),
            "zero_count": int((numeric_s == 0).sum()),
            "negative_count": int((numeric_s < 0).sum()),
            "histogram": bins,
        }
    elif semantic_type in ["text", "category", "email", "url"]:
        str_series = clean_series.astype(str)
        lengths = str_series.str.len()
        col_profile["stats"] = {
            "min_length": int(lengths.min()) if len(lengths) > 0 else 0,
            "max_length": int(lengths.max()) if len(lengths) > 0 else 0,
            "avg_length": round(float(lengths.mean()), 1) if len(lengths) > 0 else 0,
            "blank_count": int((str_series.str.strip() == "").sum()),
            "whitespace_padded_count": int((str_series != str_series.str.strip()).sum()),
        }
    elif semantic_type == "datetime":
        try:
            dt_series = pd.to_datetime(clean_series, errors="coerce").dropna()
            if len(dt_series) > 0:
                col_profile["stats"] = {
                    "min_date": str(dt_series.min()),
                    "max_date": str(dt_series.max()),
                    "most_common_weekday": int(dt_series.dt.dayofweek.mode()[0]) if len(dt_series) > 0 else None,
                    "most_common_month": int(dt_series.dt.month.mode()[0]) if len(dt_series) > 0 else None,
                }
        except Exception:
            pass

    return col_profile


def profile_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    """Profile all columns in DataFrame."""
    columns_profile = [profile_column(df[col], col) for col in df.columns]
    
    # Type breakdown counts
    type_counts: Dict[str, int] = {}
    for c in columns_profile:
        st = c["semantic_type"]
        type_counts[st] = type_counts.get(st, 0) + 1

    return {
        "columns": columns_profile,
        "type_breakdown": type_counts,
        "total_rows": len(df),
        "total_columns": len(df.columns),
    }

