import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.api.router import api_router
from app.core.config import settings
from app.core.storage import media_root
from app.services.mail_snooze import snooze_scheduler_loop


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if (
            request.method not in {"GET", "HEAD", "OPTIONS"}
            and request.url.path.startswith(
                (
                    f"{settings.API_V1_PREFIX}/cms",
                    f"{settings.API_V1_PREFIX}/auth",
                    f"{settings.API_V1_PREFIX}/mail",
                )
            )
        ):
            origin = request.headers.get("origin")
            if origin and origin not in settings.CORS_ORIGINS:
                from starlette.responses import JSONResponse

                return JSONResponse({"detail": "Origin is not allowed"}, status_code=403)
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.headers.setdefault("X-Permitted-Cross-Domain-Policies", "none")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), geolocation=(), microphone=()",
        )
        path = request.url.path
        if path.startswith(
            (
                f"{settings.API_V1_PREFIX}/cms",
                f"{settings.API_V1_PREFIX}/auth",
                f"{settings.API_V1_PREFIX}/mail",
            )
        ):
            response.headers["Cache-Control"] = "no-store"
            response.headers["Pragma"] = "no-cache"
        elif path.startswith("/media/"):
            response.headers.setdefault(
                "Cache-Control", "public, max-age=31536000, immutable"
            )
        if settings.is_production:
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=63072000; includeSubDomains; preload",
            )
        return response


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    media_root()
    scheduler_task = asyncio.create_task(snooze_scheduler_loop())
    try:
        yield
    finally:
        scheduler_task.cancel()
        with suppress(asyncio.CancelledError):
            await scheduler_task


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.TRUSTED_HOSTS)
app.add_middleware(SecurityHeadersMiddleware)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.mount("/media", StaticFiles(directory=str(media_root())), name="media")


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {"service": settings.APP_NAME, "health": f"{settings.API_V1_PREFIX}/health"}
