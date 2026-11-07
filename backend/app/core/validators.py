import re
from typing import Dict, Any, List, Set, Tuple
import pandas as pd
import numpy as np
from app.core.type_inference import infer_semantic_type, EMAIL_REGEX, PHONE_REGEX, URL_REGEX, PINCODE_REGEX


def validate_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Validate data integrity, finding formatting errors, mixed types, impossible values,
    and returning cell-level flags for the UI data grid.
    """
    errors_list: List[Dict[str, Any]] = []
    cell_errors: List[Dict[str, Any]] = []  # [{ row: int, col: str, reason: str }]

    for col in df.columns:
        s = df[col]
        clean_s = s.dropna()
        if len(clean_s) == 0:
            continue

        sem_type = infer_semantic_type(s, col)
        col_lower = col.lower()

        # 1. Check Impossible Values
        if "age" in col_lower:
            num_s = pd.to_numeric(clean_s, errors="coerce")
            neg_mask = num_s < 0
            too_old_mask = num_s > 120
            if neg_mask.sum() > 0:
                errors_list.append({
                    "column": col,
                    "issue_type": "Impossible Value",
                    "description": f"{int(neg_mask.sum())} negative age values detected.",
                    "severity": "high",
                })
                for idx in s[neg_mask.reindex(s.index, fill_value=False)].index[:20]:
                    cell_errors.append({"row": int(idx), "col": col, "reason": "Negative age impossible"})
            if too_old_mask.sum() > 0:
                errors_list.append({
                    "column": col,
                    "issue_type": "Impossible Value",
                    "description": f"{int(too_old_mask.sum())} age values > 120 detected.",
                    "severity": "medium",
                })
                for idx in s[too_old_mask.reindex(s.index, fill_value=False)].index[:20]:
                    cell_errors.append({"row": int(idx), "col": col, "reason": "Age > 120 improbable"})

        # 2. Check Mixed Types / Formatted Numbers as Strings ("1,200")
        if s.dtype == object and sem_type != "text":
            str_vals = clean_s.astype(str)
            has_comma_numbers = str_vals.str.match(r"^\d{1,3}(,\d{3})+(\.\d+)?$").sum()
            if has_comma_numbers > 0:
                errors_list.append({
                    "column": col,
                    "issue_type": "Mixed Type / Formatting",
                    "description": f"{int(has_comma_numbers)} numbers stored as text with comma formatting.",
                    "severity": "medium",
                })
                for idx in s[str_vals.str.match(r"^\d{1,3}(,\d{3})+(\.\d+)?$")].index[:20]:
                    cell_errors.append({"row": int(idx), "col": col, "reason": "Formatted number stored as string"})

        # 3. Check Format Validation
        if sem_type == "email":
            invalid_mask = ~clean_s.astype(str).str.strip().str.match(EMAIL_REGEX)
            if invalid_mask.sum() > 0:
                errors_list.append({
                    "column": col,
                    "issue_type": "Invalid Email Format",
                    "description": f"{int(invalid_mask.sum())} invalid email formats.",
                    "severity": "high",
                })
                for idx in clean_s[invalid_mask].index[:20]:
                    cell_errors.append({"row": int(idx), "col": col, "reason": "Invalid email format"})

        elif sem_type == "phone":
            invalid_mask = ~clean_s.astype(str).str.strip().str.match(PHONE_REGEX)
            if invalid_mask.sum() > 0:
                errors_list.append({
                    "column": col,
                    "issue_type": "Invalid Phone Format",
                    "description": f"{int(invalid_mask.sum())} invalid phone number formats.",
                    "severity": "medium",
                })
                for idx in clean_s[invalid_mask].index[:20]:
                    cell_errors.append({"row": int(idx), "col": col, "reason": "Invalid phone format"})

        # 4. Check Inconsistent Categories (e.g. Male, male, M, MALE)
        if sem_type == "category" and s.dtype == object:
            str_s = clean_s.astype(str).str.strip()
            unique_raw = set(str_s.unique())
            unique_lower = {v.lower(): [] for v in unique_raw}
            for v in unique_raw:
                unique_lower[v.lower()].append(v)
            casing_issues = [variants for variants in unique_lower.values() if len(variants) > 1]
            if len(casing_issues) > 0:
                errors_list.append({
                    "column": col,
                    "issue_type": "Inconsistent Category Casing",
                    "description": f"Inconsistent capitalization found: {', '.join([' vs '.join(c) for c in casing_issues[:3]])}",
                    "severity": "low",
                })

    validity_score = round(max(0, 100 - (len(cell_errors) / max(len(df), 1) * 20)), 1)

    return {
        "errors": errors_list,
        "cell_errors": cell_errors[:100],  # Cap at 100 for fast UI rendering
        "validity_score": validity_score,
        "total_errors": len(errors_list),
    }


def validate_custom_rule(df: pd.DataFrame, rule_expression: str) -> Dict[str, Any]:
    """
    Validate a user-supplied rule expression (e.g. 'Customer_Age >= 18' or 'Revenue > 0').
    Safely evaluated via pd.DataFrame.query.
    """
    try:
        # Check against df
        violating_df = df.query(f"not ({rule_expression})")
        violations_count = len(violating_df)
        pct = round(violations_count / max(len(df), 1) * 100, 2)
        preview = violating_df.head(15).to_dict(orient="records")
        return {
            "valid": True,
            "rule": rule_expression,
            "violations_count": violations_count,
            "violations_pct": pct,
            "preview": preview,
        }
    except Exception as e:
        return {
            "valid": False,
            "rule": rule_expression,
            "error": str(e),
            "violations_count": 0,
            "violations_pct": 0,
            "preview": [],
        }

