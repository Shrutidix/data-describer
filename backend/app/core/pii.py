import re
from typing import Dict, Any, List
import pandas as pd

PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
AADHAAR_REGEX = re.compile(r"^\b\d{4}\s?\d{4}\s?\d{4}\b$")
EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w{2,}$")
PHONE_REGEX = re.compile(r"^(\+?91|0)?[6-9]\d{9}$")
CREDIT_CARD_REGEX = re.compile(r"^\b(?:\d{4}[-\s]?){3}\d{4}\b$")


def detect_pii(df: pd.DataFrame) -> Dict[str, Any]:
    """Detect PII (Personal Identifiable Information) columns and provide masking."""
    pii_columns = []
    
    for col in df.columns:
        s = df[col].dropna().astype(str).str.strip()
        if len(s) == 0:
            continue
        
        sample = s.head(50)
        col_lower = col.lower()
        pii_type = None

        if "email" in col_lower or sample.apply(lambda x: bool(EMAIL_REGEX.match(x))).mean() > 0.4:
            pii_type = "Email Address"
        elif "phone" in col_lower or "mobile" in col_lower or sample.apply(lambda x: bool(PHONE_REGEX.match(x))).mean() > 0.4:
            pii_type = "Phone Number"
        elif "pan" in col_lower or sample.apply(lambda x: bool(PAN_REGEX.match(x.upper()))).mean() > 0.4:
            pii_type = "PAN Card Number"
        elif "aadhaar" in col_lower or "aadhar" in col_lower or sample.apply(lambda x: bool(AADHAAR_REGEX.match(x))).mean() > 0.4:
            pii_type = "Aadhaar Number (UID)"
        elif "card" in col_lower and sample.apply(lambda x: bool(CREDIT_CARD_REGEX.match(x))).mean() > 0.3:
            pii_type = "Credit / Debit Card"
        elif "name" in col_lower and ("customer" in col_lower or "user" in col_lower or "employee" in col_lower):
            pii_type = "Personal Name"

        if pii_type:
            pii_columns.append({
                "column": col,
                "pii_type": pii_type,
                "sample_masked": mask_value(str(s.iloc[0]), pii_type) if len(s) > 0 else "",
            })

    return {
        "pii_columns": pii_columns,
        "has_pii": len(pii_columns) > 0,
        "total_pii_columns": len(pii_columns),
    }


def mask_value(val: str, pii_type: str) -> str:
    """Mask sensitive string based on type."""
    if not val or val == "nan":
        return val
    if pii_type == "Email Address" and "@" in val:
        parts = val.split("@")
        return f"{parts[0][0]}****@{parts[1]}"
    elif pii_type == "Phone Number":
        clean = re.sub(r"\D", "", val)
        return f"{'*' * max(0, len(clean) - 4)}{clean[-4:]}"
    elif pii_type in ["Aadhaar Number (UID)", "Credit / Debit Card"]:
        clean = re.sub(r"\D", "", val)
        return f"XXXX-XXXX-{clean[-4:]}"
    elif pii_type == "PAN Card Number":
        return f"XXXXX{val[-4:]}"
    else:  # Name
        words = val.split()
        return " ".join([f"{w[0]}***" if len(w) > 1 else w for w in words])

