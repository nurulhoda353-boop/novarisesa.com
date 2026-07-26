from pydantic import BaseModel, EmailStr, Field


class WebsiteRequest(BaseModel):
    website: str = Field(default="", max_length=0)
    locale: str = Field(default="en", pattern="^(en|ar)$")


class ContactCreate(WebsiteRequest):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    company: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=40)
    subject: str | None = Field(default=None, max_length=255)
    message: str = Field(min_length=10, max_length=5000)


class RFQCreate(WebsiteRequest):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    company: str = Field(min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=40)
    service: str = Field(min_length=2, max_length=180)
    location: str | None = Field(default=None, max_length=255)
    budget: str | None = Field(default=None, max_length=120)
    timeline: str | None = Field(default=None, max_length=120)
    scope: str = Field(min_length=20, max_length=5000)


class NewsletterCreate(WebsiteRequest):
    email: EmailStr


class RequirementApplicationCreate(WebsiteRequest):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr | None = None
    phone: str = Field(min_length=6, max_length=40)
    iqama_number: str | None = Field(default=None, max_length=40)
    experience: str = Field(min_length=1, max_length=80)
    message: str | None = Field(default=None, max_length=2000)
