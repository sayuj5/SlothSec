import time
from typing import Dict, Any, List, Tuple, Optional
import httpx
from backend.app.core.config import settings
from backend.app.core.logging import logger

class OllamaClient:
    def __init__(self, base_url: str = settings.OLLAMA_BASE_URL, default_model: str = settings.OLLAMA_MODEL):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model

    def check_status(self) -> Tuple[bool, List[str], Optional[str]]:
        """
        Queries Ollama /api/tags to verify daemon reachability and installed models.
        Returns (is_available, installed_models, error_message).
        """
        try:
            with httpx.Client(timeout=4.0) as client:
                res = client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    return True, models, None
                else:
                    return False, [], f"Ollama returned HTTP {res.status_code}"
        except httpx.ConnectError:
            return False, [], f"Cannot connect to Ollama daemon at {self.base_url}. Make sure Ollama is running."
        except Exception as e:
            return False, [], str(e)

    def generate(
        self,
        prompt: str,
        system: str = "",
        model: Optional[str] = None,
        timeout_seconds: int = 150
    ) -> Dict[str, Any]:
        """
        Calls Ollama generate endpoint with the specified prompt and options.
        Configured to utilize 6 CPU threads on Intel Core i5 and cap token generation.
        """
        target_model = model or self.default_model
        payload = {
            "model": target_model,
            "prompt": prompt,
            "system": system,
            "stream": False,
            "options": {
                "temperature": 0.1,
                "top_p": 0.9,
                "num_thread": 6,      # Utilize physical cores on CPU
                "num_predict": 700,   # Prevent infinite thinking loops
                "num_ctx": 4096       # Keep context window compact for fast CPU evaluation
            }
        }

        try:
            with httpx.Client(timeout=float(timeout_seconds)) as client:
                res = client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_response = data.get("response", "").strip()
                    # If thinking model placed response in thinking or response
                    if not raw_response and data.get("thinking"):
                        raw_response = data.get("thinking", "")
                    
                    return {
                        "success": True,
                        "response": raw_response,
                        "total_duration": data.get("total_duration", 0),
                        "model": target_model,
                        "error": None
                    }
                else:
                    return {
                        "success": False,
                        "response": "",
                        "model": target_model,
                        "error": f"Ollama HTTP error {res.status_code}: {res.text}"
                    }
        except httpx.TimeoutException:
            return {
                "success": False,
                "response": "",
                "model": target_model,
                "error": f"Ollama request timed out after {timeout_seconds} seconds. Model may be under heavy CPU load."
            }
        except Exception as e:
            return {
                "success": False,
                "response": "",
                "model": target_model,
                "error": str(e)
            }

ollama_client = OllamaClient()
