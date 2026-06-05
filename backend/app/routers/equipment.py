from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from ..database import get_db
from ..models import Equipment, Client, User, EquipmentStatus
from ..schemas import EquipmentCreate, EquipmentUpdate, EquipmentResponse
from ..auth import get_current_user
from ..cloudinary_config import upload_image

router = APIRouter()


@router.get("/", response_model=List[EquipmentResponse])
async def get_equipment(
    skip: int = 0,
    limit: int = 100,
    client_id: int = None,
    category_id: int = None,
    status: EquipmentStatus = None,
    search: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Equipment).filter(Equipment.company_id == current_user.company_id)
    
    if client_id:
        query = query.filter(Equipment.client_id == client_id)
    if category_id:
        query = query.filter(Equipment.category_id == category_id)
    if status:
        query = query.filter(Equipment.status == status)
    if search:
        query = query.filter(
            (Equipment.serial_number.ilike(f"%{search}%")) |
            (Equipment.model.ilike(f"%{search}%")) |
            (Equipment.brand.ilike(f"%{search}%"))
        )
    
    equipment = query.order_by(Equipment.created_at.desc()).offset(skip).limit(limit).all()
    return equipment


@router.get("/{equipment_id}", response_model=EquipmentResponse)
async def get_equipment_by_id(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if current_user.company_id and equipment.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    return equipment


@router.post("/", response_model=EquipmentResponse)
async def create_equipment(
    equipment: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    client = db.query(Client).filter(Client.id == equipment.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    db_equipment = Equipment(**equipment.model_dump(), company_id=current_user.company_id)
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment


@router.put("/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(
    equipment_id: int,
    equipment_update: EquipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if current_user.company_id and equipment.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    for key, value in equipment_update.model_dump(exclude_unset=True).items():
        setattr(equipment, key, value)
    
    db.commit()
    db.refresh(equipment)
    return equipment


@router.delete("/{equipment_id}")
async def delete_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if current_user.company_id and equipment.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    equipment.status = EquipmentStatus.DELIVERED
    db.commit()
    return {"message": "Equipo eliminado correctamente"}


@router.get("/client/{client_id}/history")
async def get_client_equipment_history(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from .maintenance import get_maintenance_by_equipment
    from .repairs import get_repair_by_equipment
    
    equipment = db.query(Equipment).filter(
        Equipment.client_id == client_id,
        Equipment.company_id == current_user.company_id
    ).all()
    
    result = []
    for eq in equipment:
        result.append({
            "id": eq.id,
            "type_name": eq.type_name,
            "brand": eq.brand,
            "model": eq.model,
            "serial_number": eq.serial_number,
            "status": eq.status,
            "arrival_date": eq.arrival_date,
            "created_at": eq.created_at
        })
    
    return result
