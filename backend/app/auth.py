import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db
from .models import User, Company, CompanyModule
from .schemas import TokenData

security = HTTPBearer()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hash_obj = hashlib.sha256((password + salt).encode())
    return f"{salt}${hash_obj.hexdigest()}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    try:
        salt, stored_hex = stored_hash.split("$")
        hash_obj = hashlib.sha256((plain_password + salt).encode())
        computed_hash = hash_obj.hexdigest()
        return stored_hex == computed_hash
    except:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido"
            )
        return TokenData(
            user_id=int(user_id_str),
            company_id=payload.get("company_id"),
            role=payload.get("role")
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )


def get_company_data(db: Session, company_id: int):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        return {}
    modules = [m.module_name for m in db.query(CompanyModule).filter(
        CompanyModule.company_id == company_id,
        CompanyModule.is_enabled == True
    ).all()]
    return {
        "company_name": company.name,
        "company_logo": company.logo_url,
        "company_primary_color": company.primary_color,
        "company_secondary_color": company.secondary_color,
        "company_modules": modules,
    }


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    token_data = decode_token(token)

    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo"
        )
    if user.company_id and _role_str(user) != "super_admin":
        company = db.query(Company).filter(Company.id == user.company_id).first()
        if company and company.is_suspended:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu empresa ha sido suspendida. Contacta al administrador."
            )
    return user


def _role_str(user) -> str:
    r = user.role
    val = r.value if hasattr(r, "value") else str(r)
    return val.lower()


async def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    role = _role_str(current_user)
    if role not in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere rol de administrador."
        )
    return current_user


async def get_current_super_admin(current_user: User = Depends(get_current_user)) -> User:
    role = _role_str(current_user)
    if role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere rol de super administrador."
        )
    return current_user
