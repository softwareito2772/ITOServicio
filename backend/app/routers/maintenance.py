from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from dateutil.relativedelta import relativedelta
from ..database import get_db
from ..models import Maintenance, MaintenanceImage, Equipment, User, EquipmentStatus, Warranty, WarrantyType
from ..schemas import MaintenanceResponse
from ..auth import get_current_user
from ..cloudinary_config import upload_image

router = APIRouter()


@router.get("/", response_model=List[MaintenanceResponse])
async def get_maintenance_list(
    skip: int = 0,
    limit: int = 100,
    equipment_id: int = None,
    technician_id: int = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Maintenance).filter(Maintenance.company_id == current_user.company_id)
    
    if equipment_id:
        query = query.filter(Maintenance.equipment_id == equipment_id)
    if technician_id:
        query = query.filter(Maintenance.technician_id == technician_id)
    if status:
        query = query.filter(Maintenance.status == status)
    
    maintenance = query.order_by(Maintenance.created_at.desc()).offset(skip).limit(limit).all()
    return maintenance


@router.get("/{maintenance_id}", response_model=MaintenanceResponse)
async def get_maintenance_by_id(
    maintenance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    maintenance = db.query(Maintenance).filter(Maintenance.id == maintenance_id).first()
    if not maintenance:
        raise HTTPException(status_code=404, detail="Mantenimiento no encontrado")
    if current_user.company_id and maintenance.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    return maintenance


@router.post("/", response_model=MaintenanceResponse)
async def create_maintenance(
    equipment_id: int = Form(...),
    description: str = Form(...),
    technician_notes: Optional[str] = Form(None),
    service_location: str = Form("local"),
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    next_maintenance_date: Optional[str] = Form(None),
    cost: float = Form(0),
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
    
    next_date = None
    if next_maintenance_date:
        next_date = date.fromisoformat(next_maintenance_date)
    
    db_maintenance = Maintenance(
        equipment_id=equipment_id,
        technician_id=current_user.id,
        description=description,
        technician_notes=technician_notes,
        service_location=service_location,
        start_date=start,
        end_date=end,
        next_maintenance_date=next_date,
        cost=cost,
        status=EquipmentStatus(status),
        company_id=current_user.company_id
    )
    db.add(db_maintenance)
    db.flush()
    
    async def save_images(img_list: List[UploadFile], img_type: str):
        for img in img_list:
            if img.filename:
                contents = await img.read()
                result = upload_image(contents, folder="ito/maintenance")
                if result:
                    db_image = MaintenanceImage(
                        maintenance_id=db_maintenance.id,
                        image_url=result["url"],
                        image_type=img_type,
                        caption=""
                    )
                    db.add(db_image)
    
    await save_images(arrival_images, "before")
    await save_images(departure_images, "after")
    
    if warranty_months:
        months = int(warranty_months)
        warranty_type_map = {
            1: WarrantyType.ONE_MONTH,
            3: WarrantyType.THREE_MONTHS,
            6: WarrantyType.SIX_MONTHS,
            12: WarrantyType.ONE_YEAR,
            24: WarrantyType.TWO_YEARS,
            60: WarrantyType.FIVE_YEARS,
            84: WarrantyType.SEVEN_YEARS,
            120: WarrantyType.TEN_YEARS
        }
        warranty_type = warranty_type_map.get(months, WarrantyType.ONE_MONTH)
        
        if months >= 24:
            end_warranty = start + relativedelta(years=months // 12)
        else:
            end_warranty = start + relativedelta(months=months)
        
        db_warranty = Warranty(
            equipment_id=equipment_id,
            maintenance_id=db_maintenance.id,
            warranty_type=warranty_type,
            start_date=start,
            end_date=end_warranty,
            status="active"
        )
        db.add(db_warranty)
    
    db.commit()
    db.refresh(db_maintenance)
    return db_maintenance


@router.put("/{maintenance_id}", response_model=MaintenanceResponse)
async def update_maintenance(
    maintenance_id: int,
    equipment_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    technician_notes: Optional[str] = Form(None),
    service_location: Optional[str] = Form(None),
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    next_maintenance_date: Optional[str] = Form(None),
    cost: Optional[float] = Form(None),
    status: Optional[str] = Form(None),
    warranty_months: Optional[str] = Form(None),
    arrival_images: List[UploadFile] = File(default=[]),
    departure_images: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    maintenance = db.query(Maintenance).filter(Maintenance.id == maintenance_id).first()
    if not maintenance:
        raise HTTPException(status_code=404, detail="Mantenimiento no encontrado")
    if current_user.company_id and maintenance.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    if equipment_id is not None:
        maintenance.equipment_id = equipment_id
    if description is not None:
        maintenance.description = description
    if technician_notes is not None:
        maintenance.technician_notes = technician_notes
    if service_location is not None:
        maintenance.service_location = service_location
    if start_date is not None:
        maintenance.start_date = date.fromisoformat(start_date)
    if end_date is not None:
        maintenance.end_date = date.fromisoformat(end_date)
    if next_maintenance_date is not None:
        maintenance.next_maintenance_date = date.fromisoformat(next_maintenance_date)
    if cost is not None:
        maintenance.cost = cost
    if status is not None:
        maintenance.status = EquipmentStatus(status)
    
    async def save_images(img_list: List[UploadFile], img_type: str):
        for img in img_list:
            if img.filename:
                contents = await img.read()
                result = upload_image(contents, folder="ito/maintenance")
                if result:
                    db_image = MaintenanceImage(
                        maintenance_id=maintenance_id,
                        image_url=result["url"],
                        image_type=img_type,
                        caption=""
                    )
                    db.add(db_image)
    
    await save_images(arrival_images, "before")
    await save_images(departure_images, "after")
    
    if warranty_months and not maintenance.warranty:
        months = int(warranty_months)
        warranty_type_map = {
            1: WarrantyType.ONE_MONTH,
            3: WarrantyType.THREE_MONTHS,
            6: WarrantyType.SIX_MONTHS,
            12: WarrantyType.ONE_YEAR,
            24: WarrantyType.TWO_YEARS,
            60: WarrantyType.FIVE_YEARS,
            84: WarrantyType.SEVEN_YEARS,
            120: WarrantyType.TEN_YEARS
        }
        warranty_type = warranty_type_map.get(months, WarrantyType.ONE_MONTH)
        start = maintenance.start_date or date.today()
        if months >= 24:
            end_warranty = start + relativedelta(years=months // 12)
        else:
            end_warranty = start + relativedelta(months=months)
        db_warranty = Warranty(
            equipment_id=maintenance.equipment_id,
            maintenance_id=maintenance_id,
            warranty_type=warranty_type,
            start_date=start,
            end_date=end_warranty,
            status="active"
        )
        db.add(db_warranty)
    
    db.commit()
    db.refresh(maintenance)
    return maintenance


@router.delete("/{maintenance_id}")
async def delete_maintenance(
    maintenance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    maintenance = db.query(Maintenance).filter(Maintenance.id == maintenance_id).first()
    if not maintenance:
        raise HTTPException(status_code=404, detail="Mantenimiento no encontrado")
    if current_user.company_id and maintenance.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    db.delete(maintenance)
    db.commit()
    return {"message": "Mantenimiento eliminado correctamente"}


@router.post("/{maintenance_id}/images")
async def add_maintenance_image(
    maintenance_id: int,
    image_url: str,
    image_type: str = "before",
    caption: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    maintenance = db.query(Maintenance).filter(Maintenance.id == maintenance_id).first()
    if not maintenance:
        raise HTTPException(status_code=404, detail="Mantenimiento no encontrado")
    if current_user.company_id and maintenance.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    db_image = MaintenanceImage(
        maintenance_id=maintenance_id,
        image_url=image_url,
        image_type=image_type,
        caption=caption
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image