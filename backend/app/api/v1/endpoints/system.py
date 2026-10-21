from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.schemas.system import SystemStatusResponse, ScannerStatus, AIStatus
from backend.app.services.scanners.runner import check_all_scanners
from backend.app.services.ai.ollama import ollama_client

router = APIRouter()

@router.get("/status", response_model=SystemStatusResponse)
def get_system_status():
    scanner_results = check_all_scanners()
    scanners_dict = {
        k: ScannerStatus(**v) for k, v in scanner_results.items()
    }

    ai_avail, ai_models, ai_err = ollama_client.check_status()
    ai_status = AIStatus(
        provider=settings.AI_PROVIDER,
        base_url=settings.OLLAMA_BASE_URL,
        configured_model=settings.OLLAMA_MODEL,
        available=ai_avail,
        installed_models=ai_models,
        error=ai_err
    )

    return SystemStatusResponse(
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        database_status="healthy",
        ai_status=ai_status,
        scanners=scanners_dict
    )
