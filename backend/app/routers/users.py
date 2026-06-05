from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserUpdate, UserResponse
from ..auth import get_current_user, get_current_admin_user, get_current_super_admin, hash_password, _role_str

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    if _role_str(current_user) == "super_admin":
        users = db.query(User).offset(skip).limit(limit).all()
    else:
        users = db.query(User).filter(
            User.company_id == current_user.company_id
        ).offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if _role_str(current_user) != "super_admin" and user.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    return user


@router.post("/", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    if _role_str(current_user) == "super_admin":
        company_id = None
    else:
        company_id = current_user.company_id

    db_user = User(
        email=user.email,
        password_hash=hash_password(user.password),
        name=user.name,
        role=user.role,
        company_id=company_id,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if _role_str(current_user) != "super_admin" and user.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    if user_update.name is not None:
        user.name = user_update.name
    if user_update.email is not None:
        user.email = user_update.email
    if user_update.password is not None:
        user.password_hash = hash_password(user_update.password)
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.avatar is not None:
        user.avatar = user_update.avatar

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if _role_str(current_user) != "super_admin" and user.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")

    user.is_active = False
    db.commit()
    return {"message": "Usuario eliminado correctamente"}
