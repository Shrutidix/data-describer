from typing import Dict, Any, List, Optional
import pandas as pd
from rapidfuzz import fuzz


def analyze_duplicates(
    df: pd.DataFrame,
    subset: Optional[List[str]] = None,
    fuzzy_col: Optional[str] = None,
    fuzzy_threshold: int = 85
) -> Dict[str, Any]:
    """Analyze exact duplicate rows, subset duplicates, and fuzzy string duplicates."""
    total_rows = len(df)
    
    # Exact duplicate rows
    cols = subset if subset and len(subset) > 0 else df.columns.tolist()
    exact_mask = df.duplicated(subset=cols, keep=False)
    exact_count = int(exact_mask.sum())
    exact_unique_dupes = int(df.duplicated(subset=cols, keep="first").sum())

    preview_rows = []
    if exact_count > 0:
        dupe_sample = df[exact_mask].head(20)
        preview_rows = dupe_sample.to_dict(orient="records")

    # Duplicate columns (identical values under different names)
    duplicate_columns = []
    for i in range(len(df.columns)):
        for j in range(i + 1, len(df.columns)):
            c1, c2 = df.columns[i], df.columns[j]
            if df[c1].equals(df[c2]):
                duplicate_columns.append({"col1": c1, "col2": c2})

    # Fuzzy duplicate detection on chosen or first text column
    fuzzy_matches = []
    target_col = fuzzy_col
    if not target_col:
        text_cols = [c for c in df.columns if df[c].dtype == object or pd.api.types.is_string_dtype(df[c])]
        if len(text_cols) > 0:
            target_col = text_cols[0]

    if target_col and target_col in df.columns:
        unique_vals = df[target_col].dropna().astype(str).str.strip().unique()
        # Limit sample to 200 for fast fuzzy matching
        candidates = [v for v in unique_vals if len(v) >= 3][:200]
        
        seen_pairs = set()
        for i in range(len(candidates)):
            v1 = candidates[i]
            for j in range(i + 1, len(candidates)):
                v2 = candidates[j]
                if v1.lower() == v2.lower():
                    continue
                score = fuzz.token_sort_ratio(v1, v2)
                if score >= fuzzy_threshold:
                    pair_key = tuple(sorted([v1, v2]))
                    if pair_key not in seen_pairs:
                        seen_pairs.add(pair_key)
                        fuzzy_matches.append({
                            "val1": v1,
                            "val2": v2,
                            "similarity": score,
                            "count1": int((df[target_col] == v1).sum()),
                            "count2": int((df[target_col] == v2).sum()),
                        })
                        if len(fuzzy_matches) >= 20:
                            break
            if len(fuzzy_matches) >= 20:
                break

    uniqueness_score = round(max(0, 100 - (exact_unique_dupes / max(total_rows, 1) * 100)), 1)

    return {
        "exact_duplicates_count": exact_unique_dupes,
        "total_duplicate_rows": exact_count,
        "uniqueness_score": uniqueness_score,
        "exact_preview": preview_rows,
        "duplicate_columns": duplicate_columns,
        "fuzzy_matches": fuzzy_matches,
        "fuzzy_column": target_col,
    }

