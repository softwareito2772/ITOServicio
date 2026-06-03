from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import EquipmentArrivalStatus, User
from ..schemas import ArrivalStatusCreate, ArrivalStatusUpdate, ArrivalStatusResponse
from ..auth import get_current_user

router = APIRouter()

DEFAULT_STATUSES = [
    {"name": "Dañado severo", "description": "Equipo no enciende o falla crítica", "is_default": True},
    {"name": "Dañado moderado", "description": "Funciona parcialmente", "is_default": True},
    {"name": "Funcionando parcialmente", "description": "Enciende pero con problemas", "is_default": True},
    {"name": "Pantalla rota", "description": "Solo problema de pantalla", "is_default": True},
    {"name": "Sin arranque", "description": "No inicia el sistema operativo", "is_default": True},
    {"name": "Otros", "description": "Otra condición no especificada", "is_default": True}
]


def init_default_statuses(db: Session, company_id: int = None):
    query = db.query(EquipmentArrivalStatus)
    if company_id:
        query = query.filter(EquipmentArrivalStatus.company_id == company_id)
    existing = query.count()
    if existing == 0:
        for status in DEFAULT_STATUSES:
            db_status = EquipmentArrivalStatus(**status, company_id=company_id)
            db.add(db_status)
        db.commit()


@router.get("/", response_model=List[ArrivalStatusResponse])
async def get_arrival_statuses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    init_default_statuses(db, current_user.company_id)
    statuses = db.query(EquipmentArrivalStatus).filter(
        EquipmentArrivalStatus.is_active == True,
        EquipmentArrivalStatus.company_id == current_user.company_id
    ).order_by(EquipmentArrivalStatus.name).all()
    return statuses


@router.get("/{status_id}", response_model=ArrivalStatusResponse)
async def get_arrival_status(
    status_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    status = db.query(EquipmentArrivalStatus).filter(
        EquipmentArrivalStatus.id == status_id
    ).first()
    if not status:
        raise HTTPException(status_code=404, detail="Estado no encontrado")
    if current_user.company_id and status.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    return status


@router.post("/", response_model=ArrivalStatusResponse)
async def create_arrival_status(
    status: ArrivalStatusCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(EquipmentArrivalStatus).filter(
        EquipmentArrivalStatus.name == status.name,
        EquipmentArrivalStatus.company_id == current_user.company_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Este estado ya existe")
    
    db_status = EquipmentArrivalStatus(**status.model_dump(), company_id=current_user.company_id)
    db.add(db_status)
    db.commit()
    db.refresh(db_status)
    return db_status


@router.put("/{status_id}", response_model=ArrivalStatusResponse)
async def update_arrival_status(
    status_id: int,
    status_update: ArrivalStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    status = db.query(EquipmentArrivalStatus).filter(
        EquipmentArrivalStatus.id == status_id
    ).first()
    if not status:
        raise HTTPException(status_code=404, detail="Estado no encontrado")
    if current_user.company_id and status.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    for key, value in status_update.model_dump(exclude_unset=True).items():
        setattr(status, key, value)
    
    db.commit()
    db.refresh(status)
    return status


@router.delete("/{status_id}")
async def delete_arrival_status(
    status_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    status = db.query(EquipmentArrivalStatus).filter(
        EquipmentArrivalStatus.id == status_id
    ).first()
    if not status:
        raise HTTPException(status_code=404, detail="Estado no encontrado")
    if current_user.company_id and status.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    if status.is_default:
        raise HTTPException(status_code=400, detail="No se pueden eliminar los estados predefinidos")
    
    status.is_active = False
    db.commit()
    return {"message": "Estado eliminado correctamente"}
