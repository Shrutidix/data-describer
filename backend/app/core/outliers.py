from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest


def detect_outliers_iqr(series: pd.Series, factor: float = 1.5) -> pd.Series:
    """Detect outliers using Interquartile Range method."""
    clean = series.dropna()
    if len(clean) < 4:
        return pd.Series(False, index=series.index)
    q25 = np.percentile(clean, 25)
    q75 = np.percentile(clean, 75)
    iqr = q75 - q25
    lower_bound = q25 - (factor * iqr)
    upper_bound = q75 + (factor * iqr)
    return (series < lower_bound) | (series > upper_bound)


def detect_outliers_zscore(series: pd.Series, threshold: float = 3.0) -> pd.Series:
    """Detect outliers using standard Z-score method."""
    clean = series.dropna()
    if len(clean) < 3 or clean.std() == 0:
        return pd.Series(False, index=series.index)
    mean = clean.mean()
    std = clean.std()
    z_scores = (series - mean).abs() / std
    return z_scores > threshold


def detect_outliers_isolation_forest(df_num: pd.DataFrame, contamination: float = 0.05) -> pd.Series:
    """Multivariate outlier detection using Isolation Forest."""
    if len(df_num) < 10 or len(df_num.columns) == 0:
        return pd.Series(False, index=df_num.index)
    
    clean_df = df_num.fillna(df_num.median())
    clf = IsolationForest(contamination=contamination, random_state=42)
    preds = clf.fit_predict(clean_df)
    return pd.Series(preds == -1, index=df_num.index)


def analyze_outliers(df: pd.DataFrame, method: str = "iqr") -> Dict[str, Any]:
    """
    Run outlier detection on all numeric columns or multivariate.
    Method: 'iqr', 'zscore', 'isolation_forest'.
    """
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    total_rows = len(df)
    
    column_outliers = []
    outlier_indices = set()

    if method == "isolation_forest" and len(num_cols) >= 2:
        mask = detect_outliers_isolation_forest(df[num_cols])
        outlier_indices.update(df[mask].index.tolist())
        column_outliers.append({
            "column": "Multivariate (Isolation Forest)",
            "outlier_count": int(mask.sum()),
            "outlier_pct": round(mask.sum() / max(total_rows, 1) * 100, 2),
            "method": "isolation_forest",
        })
    else:
        for col in num_cols:
            s = df[col]
            if method == "zscore":
                mask = detect_outliers_zscore(s)
            else:
                mask = detect_outliers_iqr(s)

            cnt = int(mask.sum())
            if cnt > 0:
                outlier_indices.update(s[mask].index.tolist())
                q25 = float(s.dropna().quantile(0.25)) if len(s.dropna()) > 0 else 0
                q75 = float(s.dropna().quantile(0.75)) if len(s.dropna()) > 0 else 0
                column_outliers.append({
                    "column": col,
                    "outlier_count": cnt,
                    "outlier_pct": round(cnt / max(total_rows, 1) * 100, 2),
                    "lower_bound": round(q25 - 1.5 * (q75 - q25), 2),
                    "upper_bound": round(q75 + 1.5 * (q75 - q25), 2),
                    "method": method,
                })

    preview_rows = []
    if len(outlier_indices) > 0:
        preview_rows = df.loc[list(outlier_indices)[:20]].to_dict(orient="records")

    outlier_score = round(max(0, 100 - (len(outlier_indices) / max(total_rows, 1) * 100)), 1)

    return {
        "columns": column_outliers,
        "total_outlier_rows": len(outlier_indices),
        "outlier_score": outlier_score,
        "preview": preview_rows,
        "method": method,
    }

