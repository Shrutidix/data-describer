from pathlib import Path
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Data Describer"
    VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Server settings
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Ollama settings
    OLLAMA_URL: str = "http://localhost:11434"
    CHAT_MODEL: str = "qwen3:8b"
    CODE_MODEL: str = "qwen2.5-coder:7b"

    # Data limits
    MAX_UPLOAD_MB: int = 200
    SAMPLE_ROWS: int = 100_000
    DATA_DIR: str = "./data"
    DATABASE_URL: str = "sqlite:///./data/data_describer.db"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def data_path(self) -> Path:
        p = Path(self.DATA_DIR)
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()

