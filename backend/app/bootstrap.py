from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import engine
from app.core.security import hash_password
from app.models import (
    Permission,
    Requirement,
    RequirementContact,
    RequirementStatus,
    RequirementTranslation,
    Role,
    User,
)

CMS_PERMISSIONS = {
    "cms.view": "View the CMS dashboard",
    "cms.publish": "Publish website content",
    "cms.manage_content": "Create and edit website content",
    "cms.manage_media": "Upload and manage media assets",
    "cms.manage_inbox": "Manage contact, RFQ, and application submissions",
    "cms.manage_settings": "Manage website configuration",
    "cms.manage_users": "Manage dashboard users and roles",
}

INITIAL_REQUIREMENTS = [
    {
        "code": "6g-welder-madina",
        "position": "6G Welder",
        "headcount": 10,
        "location": "Madinah Region, KSA",
        "project_name": "Madina Aramco Project",
        "approval": "Aramco Approved",
        "documents": ["Valid Iqama", "Medical Insurance"],
    },
    {
        "code": "multi-welder-madina",
        "position": "Multi Welder",
        "headcount": 10,
        "location": "Madinah Region, KSA",
        "project_name": "Madina Aramco Project",
        "approval": "Aramco Approved",
        "documents": ["Valid Iqama", "Medical Insurance"],
    },
    {
        "code": "electrical-grounding-foreman-qassim",
        "position": "Electrical Grounding Foreman",
        "headcount": 2,
        "location": "Qassim Region, KSA",
        "project_name": "Qassim-1 Project",
        "approval": None,
        "documents": ["Valid Iqama"],
    },
]


def seed_requirements(db: Session) -> None:
    for seed in INITIAL_REQUIREMENTS:
        existing = db.scalar(
            select(Requirement).where(Requirement.code == seed["code"])
        )
        if existing is not None:
            continue
        item = Requirement(
            code=seed["code"],
            status=RequirementStatus.URGENT,
            headcount=seed["headcount"],
            location=seed["location"],
            project_name=seed["project_name"],
            rate_currency="SAR",
            rate_unit="hour",
        )
        db.add(item)
        db.flush()
        db.add(
            RequirementTranslation(
                requirement_id=item.id,
                locale="en",
                position=seed["position"],
                approval=seed["approval"],
                duration="Long Term",
                salary_cycle="Monthly",
                food="Provided by company",
                accommodation="Provided by company",
                documents=seed["documents"],
            )
        )
        for number in ("966578753016", "966569727122"):
            db.add(
                RequirementContact(
                    requirement_id=item.id,
                    display_phone=f"+{number}",
                    phone_e164=number,
                    has_whatsapp=True,
                )
            )


def bootstrap() -> None:
    with Session(engine) as db, db.begin():
        permissions: list[Permission] = []
        for code, description in CMS_PERMISSIONS.items():
            permission = db.scalar(select(Permission).where(Permission.code == code))
            if permission is None:
                permission = Permission(code=code, description=description)
                db.add(permission)
                db.flush()
            permissions.append(permission)

        owner = db.scalar(select(Role).where(Role.name == "owner"))
        if owner is None:
            owner = Role(
                name="owner",
                description="Full access to the NOVARISE website CMS",
                is_system=True,
            )
            db.add(owner)
            db.flush()
        owner.permissions = permissions

        editor = db.scalar(select(Role).where(Role.name == "editor"))
        if editor is None:
            editor = Role(
                name="editor",
                description="Create and publish website content and media",
                is_system=True,
            )
            db.add(editor)
            db.flush()
        editor_codes = {
            "cms.view",
            "cms.publish",
            "cms.manage_content",
            "cms.manage_media",
            "cms.manage_inbox",
        }
        editor.permissions = [item for item in permissions if item.code in editor_codes]
        seed_requirements(db)

        if not settings.INITIAL_ADMIN_EMAIL or not settings.INITIAL_ADMIN_PASSWORD:
            return

        admin = db.scalar(
            select(User).where(User.email == settings.INITIAL_ADMIN_EMAIL.lower())
        )
        if admin is None:
            admin = User(
                email=settings.INITIAL_ADMIN_EMAIL.lower(),
                password_hash=hash_password(settings.INITIAL_ADMIN_PASSWORD),
                full_name="NOVARISE Owner",
                is_active=True,
                is_verified=True,
            )
            db.add(admin)
            db.flush()
        if owner not in admin.roles:
            admin.roles.append(owner)


if __name__ == "__main__":
    bootstrap()
