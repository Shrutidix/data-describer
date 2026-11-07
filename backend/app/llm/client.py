import httpx
from typing import Optional, Dict, Any
from app.config import settings


async def query_ollama(
    prompt: str,
    system: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.2,
) -> str:
    """Send generation request to local Ollama REST API."""
    target_model = model or settings.CHAT_MODEL
    url = f"{settings.OLLAMA_URL}/api/generate"
    
    payload: Dict[str, Any] = {
        "model": target_model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
        }
    }
    if system:
        payload["system"] = system

    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data.get("response", "").strip()

