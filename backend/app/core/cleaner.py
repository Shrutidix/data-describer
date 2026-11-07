import datetime
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np


class CleaningEngine:
    """Reversible cleaning transformations with undo/redo and script generator."""

    @staticmethod
    def apply_operation(df: pd.DataFrame, op: str, params: Dict[str, Any]) -> Tuple[pd.DataFrame, int, str]:
        """
        Apply single transformation to df copy.
        Returns: (new_df, rows_affected, generated_code)
        """
        new_df = df.copy(deep=True)
        rows_affected = 0
        code = ""

        if op == "drop_duplicates":
            subset = params.get("subset")
            keep = params.get("keep", "first")
            before = len(new_df)
            new_df = new_df.drop_duplicates(subset=subset, keep=keep)
            rows_affected = before - len(new_df)
            cols_arg = f", subset={subset}" if subset else ""
            code = f"df = df.drop_duplicates(keep='{keep}'{cols_arg})"

        elif op == "drop_na_rows":
            subset = params.get("subset")
            before = len(new_df)
            new_df = new_df.dropna(subset=subset)
            rows_affected = before - len(new_df)
            cols_arg = f", subset={subset}" if subset else ""
            code = f"df = df.dropna({cols_arg})"

        elif op == "fill_na":
            col = params["column"]
            strategy = params.get("strategy", "mean")
            val = params.get("value")
            null_count = int(new_df[col].isna().sum())
            rows_affected = null_count

            if strategy == "mean" and pd.api.types.is_numeric_dtype(new_df[col]):
                mean_val = float(new_df[col].mean())
                new_df[col] = new_df[col].fillna(mean_val)
                code = f"df['{col}'] = df['{col}'].fillna(df['{col}'].mean())"
            elif strategy == "median" and pd.api.types.is_numeric_dtype(new_df[col]):
                med_val = float(new_df[col].median())
                new_df[col] = new_df[col].fillna(med_val)
                code = f"df['{col}'] = df['{col}'].fillna(df['{col}'].median())"
            elif strategy == "mode":
                mode_val = new_df[col].mode()[0] if len(new_df[col].mode()) > 0 else ""
                new_df[col] = new_df[col].fillna(mode_val)
                code = f"df['{col}'] = df['{col}'].fillna(df['{col}'].mode()[0])"
            elif strategy == "constant":
                new_df[col] = new_df[col].fillna(val)
                code = f"df['{col}'] = df['{col}'].fillna({repr(val)})"

        elif op == "trim_spaces":
            cols = params.get("columns", [c for c in new_df.columns if new_df[c].dtype == object])
            for c in cols:
                if c in new_df.columns and new_df[c].dtype == object:
                    mask = new_df[c].dropna().astype(str) != new_df[c].dropna().astype(str).str.strip()
                    rows_affected += int(mask.sum())
                    new_df[c] = new_df[c].astype(str).str.strip()
            code = f"for col in {cols}:\n    if col in df.columns and df[col].dtype == object:\n        df[col] = df[col].astype(str).str.strip()"

        elif op == "standardize_case":
            col = params["column"]
            case_type = params.get("case", "title")
            if col in new_df.columns:
                rows_affected = len(new_df)
                if case_type == "lower":
                    new_df[col] = new_df[col].astype(str).str.lower()
                    code = f"df['{col}'] = df['{col}'].astype(str).str.lower()"
                elif case_type == "upper":
                    new_df[col] = new_df[col].astype(str).str.upper()
                    code = f"df['{col}'] = df['{col}'].astype(str).str.upper()"
                else:
                    new_df[col] = new_df[col].astype(str).str.title()
                    code = f"df['{col}'] = df['{col}'].astype(str).str.title()"

        elif op == "cap_outliers":
            col = params["column"]
            lower = params.get("lower_bound")
            upper = params.get("upper_bound")
            if col in new_df.columns and pd.api.types.is_numeric_dtype(new_df[col]):
                mask = (new_df[col] < lower) | (new_df[col] > upper)
                rows_affected = int(mask.sum())
                new_df[col] = new_df[col].clip(lower=lower, upper=upper)
                code = f"df['{col}'] = df['{col}'].clip(lower={lower}, upper={upper})"

        elif op == "replace_value":
            col = params["column"]
            old_val = params["old_value"]
            new_val = params["new_value"]
            if col in new_df.columns:
                mask = new_df[col] == old_val
                rows_affected = int(mask.sum())
                new_df[col] = new_df[col].replace(old_val, new_val)
                code = f"df['{col}'] = df['{col}'].replace({repr(old_val)}, {repr(new_val)})"

        elif op == "drop_column":
            col = params["column"]
            if col in new_df.columns:
                new_df = new_df.drop(columns=[col])
                rows_affected = len(new_df)
                code = f"df = df.drop(columns=['{col}'])"

        return new_df, rows_affected, code

    @staticmethod
    def generate_pipeline_script(history: List[Dict[str, Any]], filename: str) -> str:
        """Generate reproducible Python script reproducing cleaning steps."""
        lines = [
            "# ===========================================================",
            f"# Data Describer Pipeline — Clean Script for {filename}",
            f"# Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "# ===========================================================",
            "import pandas as pd",
            "import numpy as np",
            "",
            "# 1. Load Original Dataset",
            f"df = pd.read_csv('{filename}')",
            "",
            "# 2. Apply Cleaning Transformations",
        ]

        for step in history:
            lines.append(f"# Step: {step.get('description', step.get('op'))}")
            lines.append(step.get("code", f"# Op: {step.get('op')}"))
            lines.append("")

        lines.append("# 3. Save Cleaned Dataset")
        lines.append(f"df.to_csv('cleaned_{filename}', index=False)")
        lines.append("print('Cleaning pipeline finished successfully!')")

        return "\n".join(lines)
