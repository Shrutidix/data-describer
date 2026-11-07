from typing import Dict, Any
import pandas as pd
from app.core.missing import analyze_missing
from app.core.duplicates import analyze_duplicates
from app.core.validators import validate_dataset
from app.core.outliers import analyze_outliers


def compute_quality_score(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute comprehensive 0–100 Data Quality Score based on weighted metrics:
    - Completeness: 30%
    - Uniqueness: 20%
    - Validity: 25%
    - Consistency: 15%
    - Outlier Health: 10%
    """
    total_rows = len(df)
    if total_rows == 0:
        return {"overall_score": 0, "grade": "F", "metrics": {}}

    missing_res = analyze_missing(df)
    duplicates_res = analyze_duplicates(df)
    validators_res = validate_dataset(df)
    outliers_res = analyze_outliers(df)

    completeness = missing_res["completeness_score"]
    uniqueness = duplicates_res["uniqueness_score"]
    validity = validators_res["validity_score"]
    outlier_health = outliers_res["outlier_score"]
    
    # Consistency is estimated based on formatting and type cleanliness
    consistency = round(min(validity * 1.05, 100.0), 1)

    overall_score = round(
        (completeness * 0.30) +
        (uniqueness * 0.20) +
        (validity * 0.25) +
        (consistency * 0.15) +
        (outlier_health * 0.10),
        1
    )

    grade = "A" if overall_score >= 90 else "B" if overall_score >= 80 else "C" if overall_score >= 65 else "D" if overall_score >= 50 else "F"

    # Top 5 actionable issues
    top_issues = []
    if missing_res["total_missing_cells"] > 0:
        top_col = missing_res["columns"][0] if len(missing_res["columns"]) > 0 else None
        if top_col and top_col["missing_pct"] > 0:
            top_issues.append({
                "type": "Missing Values",
                "desc": f"{top_col['total_missing']} missing values in '{top_col['column']}' ({top_col['missing_pct']}%)",
                "severity": "high" if top_col['missing_pct'] > 30 else "medium",
                "action": "Clean / Impute Missing",
            })

    if duplicates_res["exact_duplicates_count"] > 0:
        top_issues.append({
            "type": "Duplicate Rows",
            "desc": f"{duplicates_res['exact_duplicates_count']} duplicate rows detected in dataset.",
            "severity": "medium",
            "action": "Remove Duplicates",
        })

    for err in validators_res["errors"][:2]:
        top_issues.append({
            "type": err["issue_type"],
            "desc": err["description"],
            "severity": err["severity"],
            "action": "Fix Format / Value",
        })

    if outliers_res["total_outlier_rows"] > 0:
        top_issues.append({
            "type": "Numerical Outliers",
            "desc": f"{outliers_res['total_outlier_rows']} outlier records detected across numeric columns.",
            "severity": "low",
            "action": "Cap / Filter Outliers",
        })

    return {
        "overall_score": overall_score,
        "grade": grade,
        "metrics": {
            "completeness": {"score": completeness, "weight": "30%"},
            "uniqueness": {"score": uniqueness, "weight": "20%"},
            "validity": {"score": validity, "weight": "25%"},
            "consistency": {"score": consistency, "weight": "15%"},
            "outlier_health": {"score": outlier_health, "weight": "10%"},
        },
        "top_issues": top_issues[:5],
    }

