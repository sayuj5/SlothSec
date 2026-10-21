from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    system,
    ai,
    repositories,
    scans,
    findings,
    patches,
    reports,
    schedules,
    observability
)

api_router = APIRouter()

api_router.include_router(system.router, prefix="/system", tags=["System"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI"])
api_router.include_router(repositories.router, prefix="/repositories", tags=["Repositories"])
api_router.include_router(scans.router, prefix="/scans", tags=["Scans"])
api_router.include_router(findings.router, prefix="/findings", tags=["Findings"])
api_router.include_router(patches.router, prefix="/patches", tags=["Remediation"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["Schedules"])
api_router.include_router(observability.router, prefix="/observability", tags=["Observability"])
