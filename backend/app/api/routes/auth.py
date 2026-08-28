from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.auth import LoginRequest, LoginResponse
from app.db.models import User, Center
from app.core.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    center = db.query(Center).filter(Center.code == req.center_code).first()
    if not center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Center code not found"
        )

    user = db.query(User).filter(
        User.username == req.username,
        User.center_id == center.id
    ).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    access_token = create_access_token(
        subject=user.username,
        role=user.role,
        center_id=center.id,
        center_name=center.name
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        center_id=center.id,
        center_name=center.name
    )
