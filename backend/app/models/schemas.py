from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime


class HealthResponse(BaseModel):
    status: str = "ok"
    app: str
    version: str
    ollama_connected: bool
    ollama_url: str


class OllamaStatusResponse(BaseModel):
    connected: bool
    url: str
    models: List[str] = []
    error: Optional[str] = None


class DatasetMeta(BaseModel):
    dataset_id: str
    filename: str
    file_size_bytes: int
    rows: int
    columns: int
    created_at: str
    sheets: Optional[List[str]] = None
    selected_sheet: Optional[str] = None
    is_sampled: bool = False
    total_rows: Optional[int] = None


class CleanStepRequest(BaseModel):
    op: str
    params: Dict[str, Any] = {}
    description: Optional[str] = None


class RuleRequest(BaseModel):
    expression: str


class ChartRequest(BaseModel):
    chart_type: str
    x: Optional[str] = None
    y: Optional[str] = None
    color: Optional[str] = None
    agg: str = "count"
    title: Optional[str] = None


class ChatRequest(BaseModel):
    question: str


class CompareRequest(BaseModel):
    dataset_id_a: str
    dataset_id_b: str
