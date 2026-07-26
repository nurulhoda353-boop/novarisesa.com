from fastapi import APIRouter

from app.api.routes import auth, cms, health, public

api_router = APIRouter()
api_router.include_router(health.router, tags=["system"])
api_router.include_router(public.router, tags=["website"])
api_router.include_router(auth.router, tags=["authentication"])
api_router.include_router(cms.router, tags=["cms"])
