import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.telemetry import tracer
from backend.app.database.session import init_db
from backend.app.services.scheduling.scheduler import start_scheduler, stop_scheduler
from backend.app.api.v1.api import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting SlothSec engine...")
    init_db()
    logger.info("Database initialized.")
    start_scheduler()
    yield
    # Shutdown
    logger.info("Shutting down SlothSec engine...")
    stop_scheduler()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Privacy-first, local-first AI security maintenance platform.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenTelemetry HTTP Request Tracing Middleware
@app.middleware("http")
async def telemetry_middleware(request: Request, call_next):
    # Skip noisy static / docs from trace spam
    if request.url.path in ("/docs", "/openapi.json", "/redoc", "/favicon.ico"):
        return await call_next(request)

    start_time = time.time()
    with tracer.start_as_current_span(f"HTTP {request.method} {request.url.path}") as span:
        span.set_attribute("http.method", request.method)
        span.set_attribute("http.url", str(request.url))
        span.set_attribute("http.client_ip", request.client.host if request.client else "unknown")

        response = await call_next(request)

        duration_ms = (time.time() - start_time) * 1000
        span.set_attribute("http.status_code", response.status_code)
        span.set_attribute("http.duration_ms", duration_ms)
        return response

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }

# Mount API v1 router
app.include_router(api_router, prefix="/api/v1")
