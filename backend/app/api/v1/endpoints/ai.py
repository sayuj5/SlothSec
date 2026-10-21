from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.schemas.system import AIStatus
from backend.app.services.ai.ollama import ollama_client

router = APIRouter()

@router.get("/status", response_model=AIStatus)
def get_ai_status():
    ai_avail, ai_models, ai_err = ollama_client.check_status()
    return AIStatus(
        provider=settings.AI_PROVIDER,
        base_url=settings.OLLAMA_BASE_URL,
        configured_model=settings.OLLAMA_MODEL,
        available=ai_avail,
        installed_models=ai_models,
        error=ai_err
    )
