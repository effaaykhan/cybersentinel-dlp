"""
CyberSentinel DLP - Main FastAPI Application
Enterprise-grade Data Loss Prevention Platform
"""

import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app
import structlog

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.database import init_databases, close_databases
from app.core.cache import init_cache, close_cache
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.api.v1 import api_router

# Setup structured logging
setup_logging()
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Application lifespan manager for startup and shutdown events
    """
    # Startup
    logger.info("Starting CyberSentinel DLP Server", version=settings.VERSION)

    try:
        # Initialize databases
        await init_databases()
        logger.info("Databases initialized successfully")

        # Initialize cache
        await init_cache()
        logger.info("Cache initialized successfully")

        # Additional startup tasks
        logger.info("Server startup complete",
                   environment=settings.ENVIRONMENT,
                   debug=settings.DEBUG)

        yield

    finally:
        # Shutdown
        logger.info("Shutting down CyberSentinel DLP Server")

        await close_cache()
        await close_databases()

        logger.info("Server shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
    redirect_slashes=False,  # Disable automatic trailing slash redirects to prevent CORS issues
)


# Middleware Configuration
# ========================

# Request ID tracking
app.add_middleware(RequestIDMiddleware)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# Rate limiting
app.add_middleware(
    RateLimitMiddleware,
    max_requests=settings.RATE_LIMIT_REQUESTS,
    window_seconds=settings.RATE_LIMIT_WINDOW,
)

# CORS - Allow all origins for agent connections
# Convert settings.CORS_ORIGINS to list if needed
cors_origins = settings.CORS_ORIGINS
if isinstance(cors_origins, str):
    cors_origins = ["*"] if cors_origins == "*" else [cors_origins]
elif not isinstance(cors_origins, list):
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,  # Allow all origins - agents can connect from anywhere
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Trusted hosts - Skip for agent endpoints to allow connections from anywhere
# Only apply in production and skip for public agent endpoints
if not settings.DEBUG:
    from starlette.middleware.trustedhost import TrustedHostMiddleware as THM
    
    class SelectiveTrustedHostMiddleware(THM):
        async def dispatch(self, request, call_next):
            # Skip trusted host check for agent registration and event endpoints
            if request.url.path.startswith("/api/v1/agents/") or \
               request.url.path.startswith("/api/v1/agents") or \
               request.url.path.startswith("/api/v1/events/") or \
               request.url.path.startswith("/api/v1/events"):
                return await call_next(request)
            # Apply trusted host check for other endpoints
            return await super().dispatch(request, call_next)
    
    app.add_middleware(
        SelectiveTrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )


# Exception Handlers
# ==================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for unhandled exceptions
    """
    logger.error(
        "Unhandled exception",
        exc_info=exc,
        path=request.url.path,
        method=request.method,
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred. Please contact support.",
            "request_id": request.state.request_id if hasattr(request.state, 'request_id') else None,
        },
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """
    Handler for validation errors
    """
    logger.warning(
        "Validation error",
        error=str(exc),
        path=request.url.path,
    )

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Validation error",
            "message": str(exc),
        },
    )


# API Routes
# ==========

@app.get("/", tags=["Root"])
async def root() -> dict:
    """
    Root endpoint - Health check
    """
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """
    Health check endpoint for load balancers and monitoring
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


@app.get("/ready", tags=["Health"])
async def readiness_check() -> dict:
    """
    Readiness check endpoint for Kubernetes
    """
    # TODO: Add database connection checks
    return {
        "status": "ready",
        "database": "connected",
        "cache": "connected",
    }


# Include API routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
        access_log=True,
    )
