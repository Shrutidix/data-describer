import os
import pytest
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.core.loader import load_dataset, DATASET_STORE
from app.core.profiler import profile_dataset
from app.core.missing import analyze_missing
from app.core.duplicates import analyze_duplicates
from app.core.validators import validate_dataset, validate_custom_rule
from app.core.outliers import analyze_outliers
from app.core.quality_score import compute_quality_score
from app.core.relations import analyze_relations
from app.core.cleaner import CleaningEngine
from app.core.pii import detect_pii
from app.core.insights import generate_auto_insights
from app.llm.sandbox import execute_sandboxed_code, CodeSafetyError

client = TestClient(app)
FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "sales_messy.csv")


def test_fixture_loading():
    assert os.path.exists(FIXTURE_PATH), "Fixture sales_messy.csv must exist"
    d_id, df, meta = load_dataset(FIXTURE_PATH)
    assert len(df) == 21
    assert "Revenue" in df.columns
    assert "Customer_Age" in df.columns
    assert meta["rows"] == 21


def test_column_profiler():
    d_id, df, _ = load_dataset(FIXTURE_PATH)
    res = profile_dataset(df)
    assert res["total_rows"] == 21
    assert res["total_columns"] == 12
    cols = {c["name"]: c for c in res["columns"]}
    assert "Customer_Age" in cols
    assert cols["Customer_Age"]["missing_count"] > 0
    assert "histogram" in cols["Quantity"]["stats"]


def test_missing_data_analysis():
    d_id, df, _ = load_dataset(FIXTURE_PATH)
    res = analyze_missing(df)
    assert "Customer_Age" in [c["column"] for c in res["columns"]]
    assert res["total_missing_cells"] > 0
    assert 0 <= res["completeness_score"] <= 100


def test_duplicates_and_fuzzy():
    d_id, df, _ = load_dataset(FIXTURE_PATH)
    res = analyze_duplicates(df, fuzzy_col="Customer_Name", fuzzy_threshold=80)
    assert res["exact_duplicates_count"] >= 1
    assert "fuzzy_matches" in res
    assert len(res["fuzzy_matches"]) >= 1  # Matches Rahul Sharma and rahul sharma


def test_validators_and_impossible_values():
    d_id, df, _ = load_dataset(FIXTURE_PATH)
    res = validate_dataset(df)
    # Detects negative age and age 145
    issues = [e["issue_type"] for e in res["errors"]]
    assert "Impossible Value" in issues
    assert len(res["cell_errors"]) > 0

    # Custom rule check
    rule_res = validate_custom_rule(df, "Quantity > 0")
    assert rule_res["valid"] is True
    assert rule_res["violations_count"] == 0


def test_outlier_detection():
    d_id, df, _ = load_dataset(FIXTURE_PATH)
    iqr_res = analyze_outliers(df, method="iqr")
    assert iqr_res["total_outlier_rows"] > 0

    if_res = analyze_outliers(df, method="isolation_forest")
    assert if_res["total_outlier_rows"] >= 0


def test_quality_score():
    d_id, df, _ = load_dataset(FIXTURE_PATH)
    res = compute_quality_score(df)
    assert 0 <= res["overall_score"] <= 100
    assert res["grade"] in ["A", "B", "C", "D", "F"]
    assert len(res["top_issues"]) > 0


def test_relations_and_network():
    d_id, df, _ = load_dataset(FIXTURE_PATH)
    res = analyze_relations(df)
    assert "correlation_matrix" in res
    assert "network" in res
    assert len(res["network"]["nodes"]) == len(df.columns)


def test_cleaning_and_undo():
    d_id, df, _ = load_dataset(FIXTURE_PATH)
    initial_len = len(df)

    # 1. Apply drop duplicates
    cleaned_df, affected, code = CleaningEngine.apply_operation(df, "drop_duplicates", {})
    assert len(cleaned_df) < initial_len
    assert affected > 0
    assert "drop_duplicates" in code

    # 2. Fill missing age
    cleaned_df2, affected2, code2 = CleaningEngine.apply_operation(
        cleaned_df, "fill_na", {"column": "Customer_Age", "strategy": "median"}
    )
    assert cleaned_df2["Customer_Age"].isna().sum() == 0


def test_pii_detection():
    d_id, df, _ = load_dataset(FIXTURE_PATH)
    res = detect_pii(df)
    assert res["has_pii"] is True
    pii_types = [p["pii_type"] for p in res["pii_columns"]]
    assert "Personal Name" in pii_types


def test_auto_insights():
    d_id, df, _ = load_dataset(FIXTURE_PATH)
    insights = generate_auto_insights(df)
    assert len(insights) >= 3
    assert any("Dominates" in i["title"] or "Link" in i["title"] or "Skew" in i["title"] for i in insights)


def test_sandbox_security():
    d_id, df, _ = load_dataset(FIXTURE_PATH)

    # 1. Blocked import os
    bad_code = "import os\nresult = os.listdir('.')"
    res, fig, err = execute_sandboxed_code(bad_code, df)
    assert err is not None
    assert "strictly forbidden" in err

    # 2. Blocked open()
    bad_code2 = "with open('secret.txt', 'w') as f: f.write('hack')\nresult = 1"
    res, fig, err = execute_sandboxed_code(bad_code2, df)
    assert err is not None
    assert "forbidden" in err

    # 3. Allowed pandas query
    good_code = "result = df['Quantity'].sum()"
    res, fig, err = execute_sandboxed_code(good_code, df)
    assert err is None
    assert res["value"] == str(df["Quantity"].sum())
