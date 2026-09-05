import uuid
from datetime import datetime

from pydantic import BaseModel


class AppReleaseResponse(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    version: str
    platform: str
    file_url: str
    file_size: int
    release_notes: str | None
    updated_at: datetime
