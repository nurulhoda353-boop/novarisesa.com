import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class WebsiteRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    website: str = Field(default="", max_length=0)
    locale: str = Field(default="en", pattern="^(en|ar)$")

    @field_validator("website", mode="before")
    @classmethod
    def normalize_honeypot(cls, value: object) -> object:
        return "" if value is None else value


def _optional_text(value: object) -> object:
    if isinstance(value, str) and not value.strip():
        return None
    return value


def _phone(value: str | None) -> str | None:
    if value is not None and not re.fullmatch(r"[+()\d\s.-]{6,40}", value):
        raise ValueError("Enter a valid phone number")
    return value


class ContactCreate(WebsiteRequest):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    company: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=40)
    subject: str | None = Field(default=None, max_length=255)
    message: str = Field(min_length=10, max_length=5000)

    _empty_optionals = field_validator(
        "company", "phone", "subject", mode="before"
    )(_optional_text)
    _valid_phone = field_validator("phone")(_phone)


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

    _empty_optionals = field_validator(
        "phone", "location", "budget", "timeline", mode="before"
    )(_optional_text)
    _valid_phone = field_validator("phone")(_phone)


class NewsletterCreate(WebsiteRequest):
    email: EmailStr


class RequirementApplicationCreate(WebsiteRequest):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr | None = None
    phone: str = Field(min_length=6, max_length=40)
    iqama_number: str | None = Field(default=None, max_length=40)
    experience: str = Field(min_length=1, max_length=80)
    message: str | None = Field(default=None, max_length=2000)

    _empty_optionals = field_validator(
        "email", "iqama_number", "message", mode="before"
    )(_optional_text)
    _valid_phone = field_validator("phone")(_phone)

    @field_validator("iqama_number")
    @classmethod
    def valid_iqama(cls, value: str | None) -> str | None:
        if value is not None and not re.fullmatch(r"\d{6,20}", value):
            raise ValueError("Iqama / ID must contain digits only")
        return value
