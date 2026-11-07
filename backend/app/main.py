import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.config import settings
from app.db import init_db
from app.models.schemas import HealthResponse, OllamaStatusResponse
from app.api.routes import router as api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Data Describer backend...")
    init_db()
    logger.info(f"Database initialized at {settings.DATABASE_URL}")
    yield
    logger.info("Shutting down Data Describer backend...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Local, privacy-first CSV/Excel analyser with local LLM",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include main API router
app.include_router(api_router)


@app.get("/health", response_model=HealthResponse, tags=["System"])
@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            resp = await client.get(f"{settings.OLLAMA_URL}/api/tags")
            ollama_ok = resp.status_code == 200
    except Exception:
        ollama_ok = False

    return HealthResponse(
        status="ok",
        app=settings.APP_NAME,
        version=settings.VERSION,
        ollama_connected=ollama_ok,
        ollama_url=settings.OLLAMA_URL,
    )


@app.get("/api/llm/status", response_model=OllamaStatusResponse, tags=["LLM"])
async def llm_status():
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{settings.OLLAMA_URL}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name") for m in data.get("models", [])]
                return OllamaStatusResponse(
                    connected=True,
                    url=settings.OLLAMA_URL,
                    models=models,
                )
            return OllamaStatusResponse(
                connected=False,
                url=settings.OLLAMA_URL,
                error=f"Ollama returned status {resp.status_code}",
            )
    except Exception as e:
        return OllamaStatusResponse(
            connected=False,
            url=settings.OLLAMA_URL,
            error=str(e),
        )


@app.get("/api/llm/models", tags=["LLM"])
async def list_models():
    status_resp = await llm_status()
    return {
        "connected": status_resp.connected,
        "models": status_resp.models,
        "default_chat_model": settings.CHAT_MODEL,
        "default_code_model": settings.CODE_MODEL,
    }
