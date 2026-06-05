from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from dateutil.relativedelta import relativedelta
from ..database import get_db
from ..models import Warranty, Equipment, User
from ..schemas import WarrantyCreate, WarrantyUpdate, WarrantyResponse
from ..auth import get_current_user

router = APIRouter()


def calculate_end_date(start_date: date, warranty_type: str) -> date:
    months_map = {
        "1 mes": 1,
        "3 meses": 3,
        "6 meses": 6,
        "1 año": 12,
        "2 años": 24,
        "5 años": 60,
        "7 años": 84,
        "10 años": 120
    }
    months = months_map.get(warranty_type, 1)
    
    if months >= 24:
        return start_date + relativedelta(years=months // 12)
    return start_date + relativedelta(months=months)


@router.get("/", response_model=List[WarrantyResponse])
async def get_warranties(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Warranty).filter(Warranty.company_id == current_user.company_id)
    
    if status == "active":
        query = query.filter(Warranty.status == "active", Warranty.end_date >= date.today())
    elif status == "expiring":
        cutoff = date.today() + relativedelta(days=30)
        query = query.filter(
            Warranty.status == "active",
            Warranty.end_date <= cutoff,
            Warranty.end_date >= date.today()
        )
    elif status == "expired":
        query = query.filter(Warranty.end_date < date.today())
    
    warranties = query.order_by(Warranty.end_date.desc()).offset(skip).limit(limit).all()
    return warranties


@router.get("/{warranty_id}", response_model=WarrantyResponse)
async def get_warranty(
    warranty_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    warranty = db.query(Warranty).filter(Warranty.id == warranty_id).first()
    if not warranty:
        raise HTTPException(status_code=404, detail="Garantía no encontrada")
    if current_user.company_id and warranty.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    return warranty


@router.post("/", response_model=WarrantyResponse)
async def create_warranty(
    warranty: WarrantyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    equipment = db.query(Equipment).filter(Equipment.id == warranty.equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    end_date = warranty.end_date
    if not end_date:
        end_date = calculate_end_date(warranty.start_date or date.today(), warranty.warranty_type)
    
    db_warranty = Warranty(
        equipment_id=warranty.equipment_id,
        repair_id=warranty.repair_id,
        warranty_type=warranty.warranty_type,
        start_date=warranty.start_date or date.today(),
        end_date=end_date,
        notes=warranty.notes,
        status="active",
        company_id=current_user.company_id
    )
    db.add(db_warranty)
    db.commit()
    db.refresh(db_warranty)
    return db_warranty


@router.put("/{warranty_id}", response_model=WarrantyResponse)
async def update_warranty(
    warranty_id: int,
    warranty_update: WarrantyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    warranty = db.query(Warranty).filter(Warranty.id == warranty_id).first()
    if not warranty:
        raise HTTPException(status_code=404, detail="Garantía no encontrada")
    if current_user.company_id and warranty.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    for key, value in warranty_update.model_dump(exclude_unset=True).items():
        setattr(warranty, key, value)
    
    db.commit()
    db.refresh(warranty)
    return warranty


@router.delete("/{warranty_id}")
async def delete_warranty(
    warranty_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    warranty = db.query(Warranty).filter(Warranty.id == warranty_id).first()
    if not warranty:
        raise HTTPException(status_code=404, detail="Garantía no encontrada")
    if current_user.company_id and warranty.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    db.delete(warranty)
    db.commit()
    return {"message": "Garantía eliminada correctamente"}


@router.get("/equipment/{equipment_id}")
async def get_warranties_by_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    warranties = db.query(Warranty).filter(
        Warranty.equipment_id == equipment_id,
        Warranty.company_id == current_user.company_id
    ).order_by(Warranty.created_at.desc()).all()
    return warranties
