import os
import shutil
import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Response
from fastapi.responses import PlainTextResponse, StreamingResponse
import pandas as pd
import io

from app.config import settings
from app.models.schemas import (
    DatasetMeta, CleanStepRequest, RuleRequest, ChartRequest,
    ChatRequest, CompareRequest
)
from app.core.loader import (
    load_dataset, get_dataset, get_dataset_meta, DATASET_STORE, get_excel_sheets
)
from app.core.profiler import profile_dataset
from app.core.missing import analyze_missing
from app.core.duplicates import analyze_duplicates
from app.core.validators import validate_dataset, validate_custom_rule
from app.core.outliers import analyze_outliers
from app.core.quality_score import compute_quality_score
from app.core.relations import analyze_relations
from app.core.charts import build_custom_chart
from app.core.cleaner import CleaningEngine
from app.core.pii import detect_pii
from app.core.insights import generate_auto_insights
from app.core.compare import compare_datasets
from app.llm.agent import run_data_agent

router = APIRouter(prefix="/api", tags=["Data Describer"])


@router.post("/upload", response_model=DatasetMeta)
async def upload_file(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None)
):
    """Upload dataset file (CSV, Excel, JSON, Parquet)."""
    upload_dir = settings.data_path / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    temp_path = upload_dir / f"{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        dataset_id, df, meta = load_dataset(str(temp_path), sheet_name=sheet_name)
        meta["created_at"] = datetime.datetime.now().isoformat()
        return DatasetMeta(**meta)
    except Exception as e:
        if temp_path.exists():
            temp_path.unlink()
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")


@router.get("/datasets", response_model=List[DatasetMeta])
async def list_datasets():
    """List loaded datasets."""
    datasets = []
    for d_id, data in DATASET_STORE.items():
        meta = data["meta"].copy()
        if "created_at" not in meta:
            meta["created_at"] = datetime.datetime.now().isoformat()
        datasets.append(DatasetMeta(**meta))
    return datasets


@router.get("/datasets/{dataset_id}/preview")
async def preview_dataset(dataset_id: str, page: int = 1, page_size: int = 50):
    """Return paginated rows with cell-level error flags for data grid."""
    df = get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    total_rows = len(df)
    start_idx = (page - 1) * page_size
    end_idx = min(start_idx + page_size, total_rows)
    paged_df = df.iloc[start_idx:end_idx]

    # Convert NaNs to None for valid JSON serialization
    clean_paged = paged_df.replace({float("nan"): None, float("inf"): None, float("-inf"): None})
    rows = clean_paged.to_dict(orient="records")

    # Add row indices to records
    for i, r in enumerate(rows):
        r["__row_idx"] = start_idx + i

    # Get cell error flags
    val_res = validate_dataset(paged_df)

    return {
        "dataset_id": dataset_id,
        "page": page,
        "page_size": page_size,
        "total_rows": total_rows,
        "columns": list(df.columns),
        "rows": rows,
        "cell_errors": val_res.get("cell_errors", []),
    }


@router.get("/datasets/{dataset_id}/overview")
async def get_overview(dataset_id: str):
    """Overview statistics and Data Quality Score."""
    df = get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    meta = get_dataset_meta(dataset_id)
    quality = compute_quality_score(df)
    profile = profile_dataset(df)

    return {
        "meta": meta,
        "quality_score": quality["overall_score"],
        "quality_grade": quality["grade"],
        "quality_metrics": quality["metrics"],
        "top_issues": quality["top_issues"],
        "type_breakdown": profile["type_breakdown"],
    }


@router.get("/datasets/{dataset_id}/columns")
async def get_columns_profile(dataset_id: str):
    """Full column statistical breakdown."""
    df = get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return profile_dataset(df)


@router.get("/datasets/{dataset_id}/missing")
async def get_missing(dataset_id: str):
    """Missing data analysis and matrix."""
    df = get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return analyze_missing(df)


@router.get("/datasets/{dataset_id}/duplicates")
async def get_duplicates(dataset_id: str, fuzzy_col: Optional[str] = None, threshold: int = 85):
    """Duplicate rows and fuzzy match detection."""
    df = get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return analyze_duplicates(df, fuzzy_col=fuzzy_col, fuzzy_threshold=threshold)


@router.get("/datasets/{dataset_id}/errors")
async def get_errors(dataset_id: str):
    """Data formatting errors and cell errors."""
    df = get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return validate_dataset(df)


@router.post("/datasets/{dataset_id}/rules")
async def check_custom_rule(dataset_id: str, req: RuleRequest):
    """Validate user custom rule expression."""
    df = get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return validate_custom_rule(df, req.expression)


@router.get("/datasets/{dataset_id}/outliers")
async def get_outliers(dataset_id: str, method: str = "iqr"):
    """Outlier detection (IQR, Z-score, Isolation Forest)."""
    df = get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return analyze_outliers(df, method=method)


@router.get("/datasets/{dataset_id}/relations")
async def get_relations(dataset_id: str, method: str = "pearson"):
    """Correlation matrix, Cramér's V, and network graph."""
    df = get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return analyze_relations(df, method=method)


@router.post("/datasets/{dataset_id}/chart")
async def create_chart(dataset_id: str, req: ChartRequest):
    """Generate custom Plotly figure spec."""
    df = get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return build_custom_chart(df, req.chart_type, req.x, req.y, req.color, req.agg, req.title)


@router.get("/datasets/{dataset_id}/insights")
async def get_insights(dataset_id: str):
    """Generate 8–12 automated dataset insights."""
    df = get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return generate_auto_insights(df)


@router.get("/datasets/{dataset_id}/pii")
async def get_pii(dataset_id: str):
    """PII detection and masking preview."""
    df = get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return detect_pii(df)


@router.post("/datasets/{dataset_id}/chat")
async def chat_with_data(dataset_id: str, req: ChatRequest):
    """Ask natural language question -> Python sandbox code execution -> plain language explanation."""
    df = get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    meta = get_dataset_meta(dataset_id)
    fname = meta.get("filename", "dataset.csv") if meta else "dataset.csv"
    return await run_data_agent(df, req.question, filename=fname)


@router.post("/datasets/{dataset_id}/clean/apply")
async def apply_cleaning(dataset_id: str, step: CleanStepRequest):
    """Apply reversible cleaning transformation."""
    store = DATASET_STORE.get(dataset_id)
    if not store:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = store["df"]
    new_df, rows_affected, code = CleaningEngine.apply_operation(df, step.op, step.params)

    # Save to history stack
    step_record = {
        "op": step.op,
        "params": step.params,
        "description": step.description or f"{step.op}: affected {rows_affected} rows",
        "rows_affected": rows_affected,
        "timestamp": datetime.datetime.now().isoformat(),
        "code": code,
        "prev_df": df.copy(deep=True),
    }

    store["history"].append(step_record)
    store["history_idx"] = len(store["history"]) - 1
    store["df"] = new_df
    store["meta"]["rows"] = len(new_df)
    store["meta"]["columns"] = len(new_df.columns)

    return {
        "success": True,
        "rows_affected": rows_affected,
        "current_rows": len(new_df),
        "history_length": len(store["history"]),
        "new_score": compute_quality_score(new_df)["overall_score"],
    }


@router.post("/datasets/{dataset_id}/clean/undo")
async def undo_cleaning(dataset_id: str):
    """Undo last cleaning step."""
    store = DATASET_STORE.get(dataset_id)
    if not store or len(store["history"]) == 0:
        raise HTTPException(status_code=400, detail="No cleaning history to undo")

    last_step = store["history"].pop()
    store["df"] = last_step["prev_df"]
    store["meta"]["rows"] = len(store["df"])
    store["meta"]["columns"] = len(store["df"].columns)

    return {
        "success": True,
        "current_rows": len(store["df"]),
        "remaining_steps": len(store["history"]),
        "new_score": compute_quality_score(store["df"])["overall_score"],
    }


@router.post("/datasets/{dataset_id}/clean/reset")
async def reset_cleaning(dataset_id: str):
    """Reset dataset to original state."""
    store = DATASET_STORE.get(dataset_id)
    if not store:
        raise HTTPException(status_code=404, detail="Dataset not found")

    store["df"] = store["initial_df"].copy(deep=True)
    store["history"] = []
    store["meta"]["rows"] = len(store["df"])
    store["meta"]["columns"] = len(store["df"].columns)

    return {
        "success": True,
        "current_rows": len(store["df"]),
        "new_score": compute_quality_score(store["df"])["overall_score"],
    }


@router.get("/datasets/{dataset_id}/clean/script", response_class=PlainTextResponse)
async def get_cleaning_script(dataset_id: str):
    """Export cleaning history as reproducible Python pandas script."""
    store = DATASET_STORE.get(dataset_id)
    if not store:
        raise HTTPException(status_code=404, detail="Dataset not found")
    fname = store["meta"].get("filename", "dataset.csv")
    return CleaningEngine.generate_pipeline_script(store["history"], fname)


@router.get("/datasets/{dataset_id}/export")
async def export_dataset(dataset_id: str, format: str = "csv"):
    """Download cleaned dataset as CSV, Excel, or Parquet."""
    df = get_dataset(dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    meta = get_dataset_meta(dataset_id)
    fname = meta.get("filename", "dataset") if meta else "dataset"
    base_name = os.path.splitext(fname)[0]

    if format == "xlsx":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Cleaned_Data")
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=cleaned_{base_name}.xlsx"}
        )
    elif format == "parquet":
        output = io.BytesIO()
        df.to_parquet(output, index=False)
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename=cleaned_{base_name}.parquet"}
        )
    else:  # CSV default
        csv_str = df.to_csv(index=False)
        return Response(
            content=csv_str,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=cleaned_{base_name}.csv"}
        )


@router.post("/compare")
async def compare_two_datasets(req: CompareRequest):
    """Compare two loaded datasets."""
    df_a = get_dataset(req.dataset_id_a)
    df_b = get_dataset(req.dataset_id_b)
    if df_a is None or df_b is None:
        raise HTTPException(status_code=404, detail="One or both datasets not found")

    meta_a = get_dataset_meta(req.dataset_id_a)
    meta_b = get_dataset_meta(req.dataset_id_b)

    return compare_datasets(
        df_a, df_b,
        name1=meta_a.get("filename", "Dataset A") if meta_a else "Dataset A",
        name2=meta_b.get("filename", "Dataset B") if meta_b else "Dataset B"
    )

