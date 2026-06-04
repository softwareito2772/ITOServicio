from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
from ..models import User, UserRole, Company, CompanyModule
from ..schemas import UserCreate, UserResponse, UserLogin, Token
from ..auth import verify_password, hash_password, create_access_token, get_current_user, get_company_data
from ..config import settings

router = APIRouter()
security = HTTPBearer()


@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    hashed_password = hash_password(user.password)
    db_user = User(
        email=user.email,
        password_hash=hashed_password,
        name=user.name,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=Token)
async def login(user_login: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_login.email).first()
    if not user or not verify_password(user_login.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo"
        )

    company_data = {}
    if user.company_id:
        company_data = get_company_data(db, user.company_id)

    role_value = user.role.value if hasattr(user.role, 'value') else user.role
    company_id_value = user.company_id if user.company_id else None

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "company_id": company_id_value,
            "role": role_value,
        },
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_role": role_value,
        "company_id": company_id_value,
        **company_data
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    name: str = None,
    email: str = None,
    password: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if name:
        current_user.name = name
    if email:
        current_user.email = email
    if password:
        current_user.password_hash = hash_password(password)

    db.commit()
    db.refresh(current_user)
    return current_user
