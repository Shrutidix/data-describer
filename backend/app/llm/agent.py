import re
from typing import Dict, Any, Optional
import pandas as pd
from app.llm.client import query_ollama
from app.llm.prompts import CODE_WRITER_SYSTEM_PROMPT, EXPLAINER_SYSTEM_PROMPT
from app.llm.context import build_compact_dataset_context
from app.llm.sandbox import execute_sandboxed_code
from app.config import settings


def extract_code_block(text: str) -> str:
    """Extract code between ```python ... ``` or return text if raw code."""
    match = re.search(r"```(?:python)?\s*([\s\S]*?)```", text)
    if match:
        return match.group(1).strip()
    return text.strip()


async def run_data_agent(df: pd.DataFrame, question: str, filename: str = "dataset") -> Dict[str, Any]:
    """
    Run the plan -> code -> run -> explain loop with up to 2 retries on runtime errors.
    """
    context = build_compact_dataset_context(df, filename)
    code_prompt = f"User Question: {question}\nWrite python code assigning answer to `result` (and `fig` if chart helps)."
    system = CODE_WRITER_SYSTEM_PROMPT.format(context=context)

    attempts = 0
    max_attempts = 2
    last_error: Optional[str] = None
    generated_code = ""
    result = None
    fig_json = None

    while attempts < max_attempts:
        attempts += 1
        try:
            curr_prompt = code_prompt
            if last_error:
                curr_prompt += f"\nPrevious attempt failed with error:\n{last_error}\nPlease fix the code."

            # Query Ollama code model
            llm_reply = await query_ollama(
                prompt=curr_prompt,
                system=system,
                model=settings.CODE_MODEL,
                temperature=0.1
            )
            generated_code = extract_code_block(llm_reply)

            # Run in sandbox
            res, fig, err = execute_sandboxed_code(generated_code, df)
            if err:
                last_error = err
                continue
            
            result = res
            fig_json = fig
            last_error = None
            break

        except Exception as e:
            last_error = str(e)

    # Fallback if Ollama offline or code generation failed: deterministic heuristics
    if result is None:
        generated_code, result, fig_json = heuristic_fallback_answer(df, question)

    # Explanation step
    explanation = ""
    try:
        explainer_sys = EXPLAINER_SYSTEM_PROMPT.format(question=question, result=str(result))
        explanation = await query_ollama(
            prompt="Explain the result concisely.",
            system=explainer_sys,
            model=settings.CHAT_MODEL,
            temperature=0.3
        )
    except Exception:
        # If Ollama offline, format clean deterministic explanation
        explanation = f"Analysis computed: {format_result_summary(result)}"

    return {
        "question": question,
        "code": generated_code,
        "result": result,
        "figure": fig_json,
        "explanation": explanation,
        "attempts": attempts,
    }


def format_result_summary(result: Any) -> str:
    if isinstance(result, dict):
        if result.get("type") == "scalar":
            return f"Result: {result.get('value')}"
        elif result.get("type") == "dataframe":
            return f"Found {result.get('total_rows')} matching records."
    return str(result)


def heuristic_fallback_answer(df: pd.DataFrame, question: str):
    """Safe heuristic answer when Ollama is offline."""
    q = question.lower()
    code = "# Heuristic computation\n"

    # Top categories query (e.g. "top cities", "by revenue")
    cat_cols = [c for c in df.columns if df[c].dtype == object]
    num_cols = df.select_dtypes(include=["number"]).columns.tolist()

    if "top" in q or "highest" in q or "most" in q or "sabse" in q:
        # Match category and metric
        target_cat = cat_cols[0] if len(cat_cols) > 0 else df.columns[0]
        for c in cat_cols:
            if c.lower() in q:
                target_cat = c
                break

        target_num = num_cols[0] if len(num_cols) > 0 else None
        for n in num_cols:
            if n.lower() in q or ("sales" in q and "revenue" in n.lower()) or ("amount" in n.lower()):
                target_num = n
                break

        if target_num:
            code += f"result = df.groupby('{target_cat}')['{target_num}'].sum().reset_index().sort_values(by='{target_num}', ascending=False).head(5)\n"
            code += f"fig = px.bar(result, x='{target_cat}', y='{target_num}', title='Top {target_cat} by {target_num}')"
        else:
            code += f"result = df['{target_cat}'].value_counts().reset_index().head(5)\n"
            code += f"fig = px.bar(result, x='{target_cat}', y='count', title='Top {target_cat}')"
    else:
        code += "result = df.describe().reset_index()\nfig = None"

    res, fig, _ = execute_sandboxed_code(code, df)
    return code, res, fig

