from typing import Dict, Any, List
import pandas as pd
import numpy as np


def generate_auto_insights(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Generate 8–12 deterministic insight cards across distributions, top performers,
    anomalies, and relationships.
    """
    insights: List[Dict[str, Any]] = []
    total_rows = len(df)
    if total_rows == 0:
        return insights

    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = [c for c in df.columns if df[c].dtype == object or pd.api.types.is_string_dtype(df[c])]

    # 1. Top Category Concentration
    for col in cat_cols[:3]:
        counts = df[col].value_counts()
        if len(counts) > 0:
            top_val = counts.index[0]
            top_pct = round(counts.iloc[0] / total_rows * 100, 1)
            if top_pct >= 25.0:
                insights.append({
                    "id": f"dom_{col}",
                    "title": f"'{top_val}' Dominates {col}",
                    "description": f"The category '{top_val}' accounts for {top_pct}% ({counts.iloc[0]:,} records) of all entries in '{col}'.",
                    "category": "Distribution",
                    "significance": "High" if top_pct > 50 else "Medium",
                })

    # 2. Skewness / Outlier Spikes
    for col in num_cols[:4]:
        s = df[col].dropna()
        if len(s) > 2 and s.std() > 0:
            skew = float(s.skew())
            if abs(skew) > 1.5:
                direction = "right (positively)" if skew > 0 else "left (negatively)"
                insights.append({
                    "id": f"skew_{col}",
                    "title": f"Heavy Skew in '{col}'",
                    "description": f"Values are strongly {direction} skewed (skewness = {skew:.2f}) with median of {s.median():,.1f} vs mean of {s.mean():,.1f}.",
                    "category": "Anomaly",
                    "significance": "Medium",
                })

    # 3. High Value Performers
    for col in num_cols[:2]:
        s = df[col].dropna()
        if len(s) > 0:
            top_95 = float(np.percentile(s, 95))
            top_share = float(s[s >= top_95].sum() / max(s.sum(), 1) * 100)
            if top_share >= 20.0:
                insights.append({
                    "id": f"pareto_{col}",
                    "title": f"Top 5% Accounts for {top_share:.1f}% of {col}",
                    "description": f"Strong Pareto concentration: the upper 5th percentile generates {top_share:.1f}% of total '{col}'.",
                    "category": "Business Impact",
                    "significance": "High",
                })

    # 4. Correlation Insight
    if len(num_cols) >= 2:
        corr_df = df[num_cols].corr()
        for i in range(len(num_cols)):
            for j in range(i + 1, len(num_cols)):
                c1, c2 = num_cols[i], num_cols[j]
                r = float(corr_df.loc[c1, c2])
                if abs(r) >= 0.65:
                    insights.append({
                        "id": f"corr_{c1}_{c2}",
                        "title": f"Strong Link Between {c1} & {c2}",
                        "description": f"Correlation of {r:+.2f} indicates that as {c1} increases, {c2} tends to {'rise' if r > 0 else 'fall'}.",
                        "category": "Correlation",
                        "significance": "High",
                    })

    # 5. Missing Data Insight
    null_counts = df.isna().sum()
    top_null_col = null_counts.idxmax()
    if null_counts[top_null_col] > 0:
        null_pct = round(null_counts[top_null_col] / total_rows * 100, 1)
        insights.append({
            "id": "missing_alert",
            "title": f"Data Gap in '{top_null_col}'",
            "description": f"{null_pct}% of records ({null_counts[top_null_col]:,} rows) lack data in '{top_null_col}'.",
            "category": "Data Health",
            "significance": "High" if null_pct > 30 else "Medium",
        })

    return insights[:10]

