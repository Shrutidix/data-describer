import json
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go


DARK_TEMPLATE = {
    "layout": {
        "paper_bgcolor": "#111827",
        "plot_bgcolor": "#111827",
        "font": {"color": "#94A3B8", "family": "Inter, sans-serif"},
        "margin": {"l": 50, "r": 30, "t": 40, "b": 40},
        "colorway": ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"],
        "xaxis": {"gridcolor": "#1F2937", "zerolinecolor": "#374151"},
        "yaxis": {"gridcolor": "#1F2937", "zerolinecolor": "#374151"},
    }
}


def build_custom_chart(
    df: pd.DataFrame,
    chart_type: str,
    x: Optional[str] = None,
    y: Optional[str] = None,
    color: Optional[str] = None,
    agg: str = "count",
    title: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build custom Plotly chart based on specification.
    chart_type: 'bar', 'line', 'scatter', 'pie', 'histogram', 'box', 'violin', 'sankey'.
    """
    sample_df = df.head(1000) if len(df) > 1000 else df
    fig: go.Figure

    if chart_type == "bar":
        if y and agg != "none":
            grouped = sample_df.groupby(x)[y].agg(agg).reset_index()
            fig = px.bar(grouped, x=x, y=y, color=color, title=title)
        else:
            fig = px.bar(sample_df, x=x, y=y, color=color, title=title)

    elif chart_type == "line":
        fig = px.line(sample_df, x=x, y=y, color=color, title=title)

    elif chart_type == "scatter":
        fig = px.scatter(sample_df, x=x, y=y, color=color, trendline="ols" if pd.api.types.is_numeric_dtype(sample_df[x]) and pd.api.types.is_numeric_dtype(sample_df[y]) else None, title=title)

    elif chart_type == "pie":
        fig = px.pie(sample_df, names=x, values=y, title=title, hole=0.3)

    elif chart_type == "box":
        fig = px.box(sample_df, x=x, y=y, color=color, title=title)

    elif chart_type == "violin":
        fig = px.violin(sample_df, x=x, y=y, color=color, box=True, title=title)

    elif chart_type == "sankey":
        return build_sankey_flow(df, [x, y, color] if color else [x, y])

    else:  # histogram
        fig = px.histogram(sample_df, x=x, y=y, color=color, title=title)

    fig.update_layout(template=DARK_TEMPLATE)
    return json.loads(fig.to_json())


def build_sankey_flow(df: pd.DataFrame, flow_cols: List[Optional[str]]) -> Dict[str, Any]:
    """Build Sankey categorical flow diagram."""
    valid_cols = [c for c in flow_cols if c and c in df.columns]
    if len(valid_cols) < 2:
        valid_cols = [c for c in df.columns if df[c].dtype == object or pd.api.types.is_string_dtype(df[c])][:3]

    if len(valid_cols) < 2:
        return {"data": [], "layout": {}}

    # Extract distinct labels
    labels = []
    label_map = {}
    for col in valid_cols:
        for val in df[col].dropna().unique()[:10]:
            label_name = f"{col}: {val}"
            if label_name not in label_map:
                label_map[label_name] = len(labels)
                labels.append(label_name)

    sources = []
    targets = []
    values = []

    for i in range(len(valid_cols) - 1):
        c1, c2 = valid_cols[i], valid_cols[i+1]
        pair_counts = df.groupby([c1, c2]).size().reset_index(name="count")
        for _, row in pair_counts.iterrows():
            src_lbl = f"{c1}: {row[c1]}"
            tgt_lbl = f"{c2}: {row[c2]}"
            if src_lbl in label_map and tgt_lbl in label_map:
                sources.append(label_map[src_lbl])
                targets.append(label_map[tgt_lbl])
                values.append(int(row["count"]))

    fig = go.Figure(data=[go.Sankey(
        node=dict(
            pad=15,
            thickness=20,
            line=dict(color="#374151", width=0.5),
            label=labels,
            color="#6366F1",
        ),
        link=dict(
            source=sources,
            target=targets,
            value=values,
            color="rgba(99, 102, 241, 0.3)",
        )
    )])

    fig.update_layout(template=DARK_TEMPLATE, title="Categorical Flow Diagram")
    return json.loads(fig.to_json())

