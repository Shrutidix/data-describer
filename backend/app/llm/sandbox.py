import ast
import json
from typing import Dict, Any, Tuple, Optional
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go

# Allowed modules for AST check
ALLOWED_MODULES = {
    "pandas", "pd", "numpy", "np", "plotly", "plotly.express", "px",
    "plotly.graph_objects", "go", "scipy", "scipy.stats", "math", "datetime", "re"
}

FORBIDDEN_CALLS = {
    "open", "exec", "eval", "__import__", "compile", "globals", "locals",
    "getattr", "setattr", "delattr", "system", "popen", "spawn"
}


class CodeSafetyError(Exception):
    pass


def validate_code_ast(code: str) -> None:
    """Validate python code using AST to block unsafe calls and imports."""
    tree = ast.parse(code)
    for node in ast.walk(tree):
        # Check imports
        if isinstance(node, ast.Import):
            for alias in node.names:
                root_pkg = alias.name.split(".")[0]
                if root_pkg not in ALLOWED_MODULES:
                    raise CodeSafetyError(f"Import of '{alias.name}' is strictly forbidden.")
        elif isinstance(node, ast.ImportFrom):
            root_pkg = (node.module or "").split(".")[0]
            if root_pkg not in ALLOWED_MODULES:
                raise CodeSafetyError(f"Import from '{node.module}' is strictly forbidden.")

        # Check function calls
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in FORBIDDEN_CALLS:
                raise CodeSafetyError(f"Function call to '{node.func.id}' is forbidden.")

        # Check dunder attribute access
        elif isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            raise CodeSafetyError(f"Dunder attribute access '{node.attr}' is forbidden.")


def execute_sandboxed_code(code: str, df: pd.DataFrame) -> Tuple[Any, Optional[Dict[str, Any]], Optional[str]]:
    """
    Safely execute pandas analysis code on a copy of df.
    Returns: (result, fig_json, error_message)
    """
    try:
        validate_code_ast(code)
    except Exception as e:
        return None, None, f"Safety Validation Error: {str(e)}"

    # Set up safe execution namespace
    safe_env: Dict[str, Any] = {
        "df": df.copy(deep=True),
        "pd": pd,
        "np": np,
        "px": px,
        "go": go,
        "result": None,
        "fig": None,
    }

    try:
        exec(code, safe_env)
        raw_result = safe_env.get("result")
        raw_fig = safe_env.get("fig")

        # Format result
        formatted_result = None
        if isinstance(raw_result, pd.DataFrame):
            formatted_result = {
                "type": "dataframe",
                "columns": list(raw_result.columns),
                "rows": raw_result.head(100).to_dict(orient="records"),
                "total_rows": len(raw_result),
            }
        elif isinstance(raw_result, pd.Series):
            formatted_result = {
                "type": "series",
                "data": raw_result.head(100).to_dict(),
            }
        elif raw_result is not None:
            formatted_result = {
                "type": "scalar",
                "value": str(raw_result),
            }

        fig_json = None
        if raw_fig is not None and hasattr(raw_fig, "to_json"):
            fig_json = json.loads(raw_fig.to_json())

        return formatted_result, fig_json, None

    except Exception as e:
        return None, None, f"Runtime Execution Error: {str(e)}"

