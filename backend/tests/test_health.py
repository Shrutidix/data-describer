from unittest.mock import patch
import httpx
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint_offline():
    with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("Ollama offline")):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["app"] == "Data Describer"
        assert "version" in data
        assert data["ollama_connected"] is False


def test_health_endpoint_online():
    mock_resp = httpx.Response(status_code=200, json={"models": []})
    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["ollama_connected"] is True


def test_api_health_endpoint():
    with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("Ollama offline")):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


def test_llm_status_endpoint():
    mock_resp = httpx.Response(
        status_code=200,
        json={"models": [{"name": "qwen3:8b"}, {"name": "qwen2.5-coder:7b"}]}
    )
    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        response = client.get("/api/llm/status")
        assert response.status_code == 200
        data = response.json()
        assert data["connected"] is True
        assert "qwen3:8b" in data["models"]
        assert "qwen2.5-coder:7b" in data["models"]


def test_llm_models_endpoint():
    mock_resp = httpx.Response(
        status_code=200,
        json={"models": [{"name": "qwen3:8b"}]}
    )
    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        response = client.get("/api/llm/models")
        assert response.status_code == 200
        data = response.json()
        assert data["connected"] is True
        assert "default_chat_model" in data
        assert data["default_chat_model"] == "qwen3:8b"
