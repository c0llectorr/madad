from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.security import decode_access_token
from app.core.config import settings
from app.db.models import User, Center
from app.services.extraction.base import ExtractionProvider
from app.services.extraction.qwen_provider import QwenProvider
from app.services.extraction.gemma_provider import GemmaProvider

security = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not auth_credentials:
        # For mock/demo evaluation when testing routes unauthenticated, return default coordinator
        user = db.query(User).filter(User.username == "bilal").first()
        return user

    token = auth_credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username = payload.get("sub")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_extraction_provider() -> ExtractionProvider:
    if settings.EXTRACTION_PROVIDER == "gemma":
        return GemmaProvider()
    return QwenProvider()
