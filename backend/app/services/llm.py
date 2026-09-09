import json
import logging
from typing import Dict, Any, Optional
import httpx

from app.config import settings

logger = logging.getLogger("cyberscope.llm")

class OllamaServiceException(Exception):
    """Custom exception raised for Ollama communication or validation failures."""
    pass

class OllamaService:
    """
    Low-level service for interacting with the local Ollama API server.
    Ensures safe HTTP communication, timeout enforcement, failure isolation,
    and structured JSON output parsing.
    """

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None, timeout: Optional[float] = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip('/')
        self.model = model or settings.OLLAMA_MODEL
        self.timeout = timeout or settings.OLLAMA_TIMEOUT

    async def check_availability(self) -> Dict[str, Any]:
        """
        Queries the local Ollama server tags endpoint to check availability and model presence.
        Returns availability dictionary without raising exceptions.
        """
        if settings.LLM_MODE != "ollama":
            return {
                "available": False,
                "mode": settings.LLM_MODE,
                "model": self.model,
                "url": self.base_url,
                "reason": f"LLM_MODE is configured as '{settings.LLM_MODE}', not 'ollama'"
            }

        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    model_exists = any(self.model in m or m.startswith(self.model) for m in models)
                    return {
                        "available": True,
                        "mode": settings.LLM_MODE,
                        "model": self.model,
                        "url": self.base_url,
                        "models_installed": models,
                        "model_exists": model_exists,
                    }
                else:
                    return {
                        "available": False,
                        "mode": settings.LLM_MODE,
                        "model": self.model,
                        "url": self.base_url,
                        "reason": f"Ollama returned HTTP status {response.status_code}"
                    }
        except httpx.ConnectError:
            return {
                "available": False,
                "mode": settings.LLM_MODE,
                "model": self.model,
                "url": self.base_url,
                "reason": f"Could not connect to local Ollama server at {self.base_url}. Service may be offline."
            }
        except Exception as e:
            return {
                "available": False,
                "mode": settings.LLM_MODE,
                "model": self.model,
                "url": self.base_url,
                "reason": f"Ollama health check error: {str(e)}"
            }

    async def generate_structured_intelligence(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        """
        Sends structured prompt to local Ollama /api/generate endpoint requesting JSON output.
        Enforces timeout and returns parsed JSON dictionary.
        """
        if settings.LLM_MODE != "ollama":
            raise OllamaServiceException(f"LLM mode '{settings.LLM_MODE}' is disabled or unsupported.")

        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_prompt,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.2,
                "num_predict": 384,
                "num_ctx": 2048
            }
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                
                if response.status_code == 404:
                    raise OllamaServiceException(f"Configured Ollama model '{self.model}' was not found locally.")
                elif response.status_code != 200:
                    raise OllamaServiceException(f"Ollama returned HTTP {response.status_code}: {response.text[:200]}")

                result_data = response.json()
                raw_response = result_data.get("response", "").strip()

                if not raw_response:
                    raise OllamaServiceException("Ollama model returned an empty response payload.")

                try:
                    parsed_json = json.loads(raw_response)
                    if not isinstance(parsed_json, dict):
                        raise OllamaServiceException("Ollama output parsed into non-dictionary JSON structure.")
                    return parsed_json
                except json.JSONDecodeError as err:
                    logger.error(f"Malformed JSON returned by Ollama: {raw_response[:300]}")
                    raise OllamaServiceException(f"Failed to parse structured JSON output from Ollama: {str(err)}")

        except httpx.TimeoutException:
            raise OllamaServiceException(f"Local Ollama AI did not respond within the configured timeout ({self.timeout}s).")
        except httpx.ConnectError:
            raise OllamaServiceException(f"Connection refused connecting to local Ollama server at {self.base_url}.")
        except Exception as e:
            if isinstance(e, OllamaServiceException):
                raise
            raise OllamaServiceException(f"Ollama execution error: {str(e)}")

ollama_service = OllamaService()
