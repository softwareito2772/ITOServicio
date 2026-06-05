from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from ..database import get_db
from ..models import Repair, RepairImage, Equipment, Warranty, User
from ..schemas import RepairResponse
from ..auth import get_current_user
from ..cloudinary_config import upload_image

router = APIRouter()


@router.get("/", response_model=List[RepairResponse])
async def get_repairs(
    skip: int = 0,
    limit: int = 100,
    equipment_id: int = None,
    technician_id: int = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Repair).filter(Repair.company_id == current_user.company_id)
    
    if equipment_id:
        query = query.filter(Repair.equipment_id == equipment_id)
    if technician_id:
        query = query.filter(Repair.technician_id == technician_id)
    if status:
        query = query.filter(Repair.status == status)
    
    repairs = query.order_by(Repair.created_at.desc()).offset(skip).limit(limit).all()
    return repairs


@router.get("/{repair_id}", response_model=RepairResponse)
async def get_repair_by_id(
    repair_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repair = db.query(Repair).filter(Repair.id == repair_id).first()
    if not repair:
        raise HTTPException(status_code=404, detail="Reparacion no encontrada")
    if current_user.company_id and repair.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    return repair


@router.post("/", response_model=RepairResponse)
async def create_repair(
    equipment_id: int = Form(...),
    arrival_condition: str = Form(...),
    arrival_condition_other: Optional[str] = Form(None),
    diagnosis: Optional[str] = Form(None),
    solution: Optional[str] = Form(None),
    parts_used: Optional[str] = Form(None),
    total_cost: float = Form(0),
    service_location: str = Form("local"),
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    status: str = Form("pending"),
    warranty_months: Optional[str] = Form(None),
    arrival_images: List[UploadFile] = File(default=[]),
    departure_images: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    start = date.today()
    if start_date:
        start = date.fromisoformat(start_date)
    
    end = None
    if end_date:
        end = date.fromisoformat(end_date)
    
    db_repair = Repair(
        equipment_id=equipment_id,
        technician_id=current_user.id,
        arrival_condition=arrival_condition,
        arrival_condition_other=arrival_condition_other,
        diagnosis=diagnosis,
        solution=solution,
        parts_used=parts_used,
        total_cost=total_cost,
        service_location=service_location,
        start_date=start,
        end_date=end,
        status=status,
        company_id=current_user.company_id
    )
    db.add(db_repair)
    db.flush()
    
    if warranty_months:
        months = int(warranty_months)
        warranty_type_map = {
            1: "1 mes",
            3: "3 meses",
            6: "6 meses",
            12: "1 año",
            24: "2 años",
            60: "5 años",
            84: "7 años",
            120: "10 años"
        }
        warranty_type_str = warranty_type_map.get(months, "1 mes")
        
        if months >= 24:
            end_warranty = start + relativedelta(years=months // 12)
        else:
            end_warranty = start + relativedelta(months=months)
        
        db_warranty = Warranty(
            equipment_id=equipment_id,
            repair_id=db_repair.id,
            warranty_type=warranty_type_str,
            start_date=start,
            end_date=end_warranty,
            status="active"
        )
        db.add(db_warranty)
    
    async def save_images(img_list, img_type):
        for img in img_list:
            if img.filename:
                contents = await img.read()
                result = upload_image(contents, folder="ito/repairs")
                if result:
                    db_image = RepairImage(
                        repair_id=db_repair.id,
                        image_url=result["url"],
                        image_type=img_type,
                        caption=""
                    )
                    db.add(db_image)
    
    await save_images(arrival_images, "before")
    await save_images(departure_images, "after")
    
    db.commit()
    db.refresh(db_repair)
    return db_repair


@router.put("/{repair_id}", response_model=RepairResponse)
async def update_repair(
    repair_id: int,
    equipment_id: Optional[int] = Form(None),
    arrival_condition: Optional[str] = Form(None),
    arrival_condition_other: Optional[str] = Form(None),
    diagnosis: Optional[str] = Form(None),
    solution: Optional[str] = Form(None),
    parts_used: Optional[str] = Form(None),
    total_cost: Optional[float] = Form(None),
    service_location: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    warranty_months: Optional[str] = Form(None),
    arrival_images: List[UploadFile] = File(default=[]),
    departure_images: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repair = db.query(Repair).filter(Repair.id == repair_id).first()
    if not repair:
        raise HTTPException(status_code=404, detail="Reparacion no encontrada")
    if current_user.company_id and repair.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    if equipment_id:
        repair.equipment_id = equipment_id
    if arrival_condition:
        repair.arrival_condition = arrival_condition
    if arrival_condition_other is not None:
        repair.arrival_condition_other = arrival_condition_other
    if diagnosis is not None:
        repair.diagnosis = diagnosis
    if solution is not None:
        repair.solution = solution
    if parts_used is not None:
        repair.parts_used = parts_used
    if total_cost is not None:
        repair.total_cost = total_cost
    if service_location:
        repair.service_location = service_location
    if end_date:
        repair.end_date = date.fromisoformat(end_date)
    if status:
        repair.status = status
    
    async def save_images(img_list, img_type):
        for img in img_list:
            if img.filename:
                contents = await img.read()
                result = upload_image(contents, folder="ito/repairs")
                if result:
                    db_image = RepairImage(
                        repair_id=repair_id,
                        image_url=result["url"],
                        image_type=img_type,
                        caption=""
                    )
                    db.add(db_image)
    
    await save_images(arrival_images, "before")
    await save_images(departure_images, "after")
    
    if warranty_months and not repair.warranty:
        months = int(warranty_months)
        warranty_type_map = {
            1: "1 mes",
            3: "3 meses",
            6: "6 meses",
            12: "1 año",
            24: "2 años",
            60: "5 años",
            84: "7 años",
            120: "10 años"
        }
        warranty_type_str = warranty_type_map.get(months, "1 mes")
        start = repair.start_date or date.today()
        if months >= 24:
            end_warranty = start + relativedelta(years=months // 12)
        else:
            end_warranty = start + relativedelta(months=months)
        db_warranty = Warranty(
            equipment_id=repair.equipment_id,
            repair_id=repair_id,
            warranty_type=warranty_type_str,
            start_date=start,
            end_date=end_warranty,
            status="active"
        )
        db.add(db_warranty)
    
    db.commit()
    db.refresh(repair)
    return repair


@router.delete("/{repair_id}")
async def delete_repair(
    repair_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repair = db.query(Repair).filter(Repair.id == repair_id).first()
    if not repair:
        raise HTTPException(status_code=404, detail="Reparacion no encontrada")
    if current_user.company_id and repair.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    db.delete(repair)
    db.commit()
    return {"message": "Reparacion eliminada correctamente"}


@router.post("/{repair_id}/images")
async def add_repair_image(
    repair_id: int,
    image_url: str,
    image_type: str = "before",
    caption: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repair = db.query(Repair).filter(Repair.id == repair_id).first()
    if not repair:
        raise HTTPException(status_code=404, detail="Reparacion no encontrada")
    if current_user.company_id and repair.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    db_image = RepairImage(
        repair_id=repair_id,
        image_url=image_url,
        image_type=image_type,
        caption=caption
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image