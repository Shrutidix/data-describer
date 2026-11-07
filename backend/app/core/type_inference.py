import re
from typing import Dict, Any
import pandas as pd
import numpy as np

# Regex patterns for semantic types
EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w{2,}$")
PHONE_REGEX = re.compile(r"^(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$")
URL_REGEX = re.compile(r"^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$")
PINCODE_REGEX = re.compile(r"^\b\d{5,6}\b$")
CURRENCY_REGEX = re.compile(r"^[$€£₹¥]?\s*[\d,]+(\.\d{1,2})?\s*[$€£₹¥]?$")
PERCENTAGE_REGEX = re.compile(r"^-?\d+(\.\d+)?%$")


def infer_semantic_type(series: pd.Series, col_name: str) -> str:
    """
    Infer semantic type: email, phone, url, date, currency, percentage, pincode, id, category, numeric, text, boolean.
    """
    clean_s = series.dropna().astype(str).str.strip()
    if len(clean_s) == 0:
        return "empty"

    col_lower = col_name.lower()

    # 1. Check ID indicators
    if ("id" in col_lower or "code" in col_lower or "key" in col_lower or "uuid" in col_lower) and series.nunique() > len(series) * 0.9:
        return "id"

    # 2. Check Boolean
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    unique_vals = set(clean_s.str.lower().unique())
    if unique_vals.issubset({"true", "false", "0", "1", "yes", "no", "y", "n"}):
        return "boolean"

    # 3. Sample check for string patterns
    sample = clean_s.head(50)
    
    # Currency
    if sample.apply(lambda x: bool(CURRENCY_REGEX.match(x))).mean() > 0.6:
        return "currency"

    # Percentage
    if sample.apply(lambda x: bool(PERCENTAGE_REGEX.match(x))).mean() > 0.6:
        return "percentage"

    # Email
    if sample.apply(lambda x: bool(EMAIL_REGEX.match(x))).mean() > 0.6 or "email" in col_lower:
        if sample.apply(lambda x: bool(EMAIL_REGEX.match(x))).mean() > 0.3:
            return "email"

    # Phone
    if sample.apply(lambda x: bool(PHONE_REGEX.match(x))).mean() > 0.6 or "phone" in col_lower or "mobile" in col_lower:
        if sample.apply(lambda x: bool(PHONE_REGEX.match(x))).mean() > 0.3:
            return "phone"

    # URL
    if sample.apply(lambda x: bool(URL_REGEX.match(x))).mean() > 0.6 or "url" in col_lower or "website" in col_lower:
        return "url"

    # Pincode / Zipcode
    if ("pin" in col_lower or "zip" in col_lower or "postal" in col_lower) and sample.apply(lambda x: bool(PINCODE_REGEX.match(x))).mean() > 0.6:
        return "pincode"

    # 4. Check Datetime
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"
    if "date" in col_lower or "time" in col_lower or "timestamp" in col_lower:
        try:
            pd.to_datetime(sample.head(10), errors="raise")
            return "datetime"
        except Exception:
            pass

    # 5. Check Numeric
    if pd.api.types.is_numeric_dtype(series):
        if series.nunique() <= 10 and series.nunique() < len(series) * 0.05:
            return "category"
        return "numeric"

    # Test if strings are numeric after removing commas
    try:
        sample_no_comma = sample.str.replace(",", "", regex=False)
        pd.to_numeric(sample_no_comma, errors="raise")
        return "numeric"
    except Exception:
        pass

    # 6. Categorical vs Text
    unique_ratio = series.nunique() / max(len(series), 1)
    if unique_ratio < 0.20 or series.nunique() <= 30:
        return "category"

    return "text"

