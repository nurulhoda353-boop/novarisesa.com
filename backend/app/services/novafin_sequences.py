"""Race-free, gapless document numbering for NovaFin.

The old `count(*) + 1` approach hands two simultaneous saves the same number
(one then dies on the unique constraint) and reuses numbers after a delete.
Here each prefix owns one row in `novafin_sequences`; the row is locked while
the next number is taken, and the increment rolls back with the caller's
transaction, so a failed save never burns a number.
"""

import re

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import NovaFinSequence


def _highest_existing_number(db: Session, model: type, prefix: str) -> int:
    pattern = re.compile(rf"^{re.escape(prefix)}-(\d+)$")
    highest = 0
    for (code,) in db.execute(select(model.code).where(model.code.like(f"{prefix}-%"))):
        match = pattern.match(code or "")
        if match:
            highest = max(highest, int(match.group(1)))
    return highest


def next_code(db: Session, model: type, prefix: str) -> str:
    """Returns e.g. 'INV-0413'. `model` is only consulted the first time a prefix
    is used, to continue after the highest code that already exists."""
    sequence = db.scalar(select(NovaFinSequence).where(NovaFinSequence.prefix == prefix).with_for_update())
    if sequence is None:
        try:
            with db.begin_nested():
                db.add(NovaFinSequence(prefix=prefix, last_number=_highest_existing_number(db, model, prefix)))
        except IntegrityError:
            pass  # another request created it first; lock and use theirs
        sequence = db.scalar(select(NovaFinSequence).where(NovaFinSequence.prefix == prefix).with_for_update())
    sequence.last_number += 1
    db.flush()
    return f"{prefix}-{sequence.last_number:04d}"
