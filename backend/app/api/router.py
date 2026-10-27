from fastapi import APIRouter

from app.api.routes import (
    app_releases,
    auth,
    cms,
    health,
    mail,
    novafin,
    novafin_accounting,
    novafin_admin,
    novafin_banking,
    novafin_corrections,
    novafin_hr,
    novafin_projects,
    novafin_purchasing,
    novafin_reports,
    novafin_sales,
    novafin_vat,
    public,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["system"])
api_router.include_router(public.router, tags=["website"])
api_router.include_router(auth.router, tags=["authentication"])
api_router.include_router(mail.router, tags=["mail"])
api_router.include_router(cms.router, tags=["cms"])
api_router.include_router(novafin.router, tags=["novafin"])
api_router.include_router(novafin_sales.router, tags=["novafin"])
api_router.include_router(novafin_purchasing.router, tags=["novafin"])
api_router.include_router(novafin_banking.router, tags=["novafin"])
api_router.include_router(novafin_accounting.router, tags=["novafin"])
api_router.include_router(novafin_hr.router, tags=["novafin"])
api_router.include_router(novafin_corrections.router, tags=["novafin"])
api_router.include_router(novafin_projects.router, tags=["novafin"])
api_router.include_router(novafin_reports.router, tags=["novafin"])
api_router.include_router(novafin_admin.router, tags=["novafin"])
api_router.include_router(novafin_vat.router, tags=["novafin"])
api_router.include_router(app_releases.router, tags=["app-releases"])
