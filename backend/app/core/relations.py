from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from scipy import stats


def cramers_v(x: pd.Series, y: pd.Series) -> float:
    """Calculate Cramér's V for two categorical series."""
    confusion_matrix = pd.crosstab(x, y)
    if confusion_matrix.empty or confusion_matrix.shape[0] < 2 or confusion_matrix.shape[1] < 2:
        return 0.0
    chi2 = stats.chi2_contingency(confusion_matrix)[0]
    n = confusion_matrix.sum().sum()
    phi2 = chi2 / n
    r, k = confusion_matrix.shape
    phi2corr = max(0, phi2 - ((k - 1) * (r - 1)) / (n - 1))
    rcorr = r - ((r - 1) ** 2) / (n - 1)
    kcorr = k - ((k - 1) ** 2) / (n - 1)
    denom = min((kcorr - 1), (rcorr - 1))
    if denom <= 0:
        return 0.0
    return float(np.sqrt(phi2corr / denom))


def analyze_relations(df: pd.DataFrame, method: str = "pearson") -> Dict[str, Any]:
    """
    Compute correlations, associations, top pairs, and network graph representation.
    """
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = [c for c in df.columns if df[c].dtype == object or pd.api.types.is_string_dtype(df[c])]

    # 1. Numeric Correlation Matrix
    corr_matrix: Dict[str, Dict[str, float]] = {}
    top_pairs: List[Dict[str, Any]] = []

    if len(num_cols) >= 2:
        clean_num = df[num_cols].dropna()
        if len(clean_num) > 2:
            matrix_df = clean_num.corr(method=method)
            for c in num_cols:
                corr_matrix[c] = {}
                for c2 in num_cols:
                    val = matrix_df.loc[c, c2]
                    corr_matrix[c][c2] = round(float(val), 3) if not np.isnan(val) else 0.0

            # Find top pairs
            seen = set()
            for i in range(len(num_cols)):
                for j in range(i + 1, len(num_cols)):
                    c1, c2 = num_cols[i], num_cols[j]
                    val = corr_matrix.get(c1, {}).get(c2, 0.0)
                    top_pairs.append({
                        "col1": c1,
                        "col2": c2,
                        "value": val,
                        "abs_val": abs(val),
                        "type": "numeric-numeric",
                        "description": (
                            f"Strong positive correlation ({val:.2f})" if val >= 0.7
                            else f"Moderate positive correlation ({val:.2f})" if val >= 0.4
                            else f"Strong negative correlation ({val:.2f})" if val <= -0.7
                            else f"Moderate negative correlation ({val:.2f})" if val <= -0.4
                            else f"Weak relationship ({val:.2f})"
                        )
                    })

    # 2. Categorical Cramér's V
    cramers_matrix: Dict[str, Dict[str, float]] = {}
    if len(cat_cols) >= 2:
        for c1 in cat_cols[:10]:
            cramers_matrix[c1] = {}
            for c2 in cat_cols[:10]:
                if c1 == c2:
                    cramers_matrix[c1][c2] = 1.0
                else:
                    val = round(cramers_v(df[c1].dropna(), df[c2].dropna()), 3)
                    cramers_matrix[c1][c2] = val
                    if c1 < c2 and val >= 0.3:
                        top_pairs.append({
                            "col1": c1,
                            "col2": c2,
                            "value": val,
                            "abs_val": val,
                            "type": "categorical-categorical",
                            "description": f"Association strength Cramér's V of {val:.2f}",
                        })

    # Sort top pairs by absolute value
    top_pairs.sort(key=lambda x: x["abs_val"], reverse=True)

    # 3. Network Graph Nodes and Edges
    nodes = [{"id": col, "label": col, "group": "numeric" if col in num_cols else "categorical"} for col in df.columns]
    edges = []
    for pair in top_pairs:
        if pair["abs_val"] >= 0.3:
            edges.append({
                "source": pair["col1"],
                "target": pair["col2"],
                "weight": pair["abs_val"],
                "value": pair["value"],
            })

    return {
        "numeric_columns": num_cols,
        "categorical_columns": cat_cols,
        "correlation_matrix": corr_matrix,
        "cramers_matrix": cramers_matrix,
        "top_pairs": top_pairs[:15],
        "network": {
            "nodes": nodes,
            "edges": edges[:30],
        },
        "method": method,
    }

