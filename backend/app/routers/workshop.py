from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date, timedelta
from io import BytesIO
import logging
from ..database import get_db
from ..models import (
    WorkshopVehicle, WorkshopOrder, WorkshopChecklist,
    WorkshopChecklistTemplate, WorkshopPartsUsed, WorkshopMechanic,
    WorkshopInspection, WorkshopInspectionImage,
    WorkshopOrderImage, WorkshopInventory, WorkshopInvoice,
    Client, User, Product, InventoryMovement, Company
)
from ..schemas import (
    WorkshopVehicleCreate, WorkshopVehicleUpdate, WorkshopVehicleResponse,
    WorkshopOrderCreate, WorkshopOrderUpdate, WorkshopOrderResponse,
    WorkshopChecklistResponse, WorkshopChecklistTemplateCreate,
    WorkshopChecklistTemplateResponse,     WorkshopPartsUsedResponse, WorkshopPartsUsedCreate,
    WorkshopMechanicCreate, WorkshopMechanicUpdate, WorkshopMechanicResponse,
    WorkshopInspectionCreate, WorkshopInspectionResponse,
    WorkshopInspectionImageCreate, WorkshopInspectionImageResponse,
    WorkshopOrderImageCreate, WorkshopOrderImageResponse,
    WorkshopInventoryCreate, WorkshopInventoryUpdate, WorkshopInventoryResponse,
    WorkshopInvoiceCreate, WorkshopInvoiceUpdate
)
from ..auth import get_current_user
from ..models import CompanyModule

router = APIRouter()
logger = logging.getLogger(__name__)


def _require_taller_module(db: Session, company_id: int):
    if not company_id:
        return
    has = db.query(CompanyModule).filter(
        CompanyModule.company_id == company_id,
        CompanyModule.module_name == "taller",
        CompanyModule.is_enabled == True
    ).first()
    if not has:
        raise HTTPException(status_code=403, detail="Esta empresa no tiene habilitado el módulo de Taller")


def _seed_checklist_template(db: Session, vehicle_type: str, company_id: int):
    existing = db.query(WorkshopChecklistTemplate).filter(
        WorkshopChecklistTemplate.vehicle_type == vehicle_type,
        WorkshopChecklistTemplate.company_id == company_id
    ).first()
    if existing:
        return

    sedan_items = [
        ("Aceite del motor", "motor", 1),
        ("Filtro de aceite", "motor", 2),
        ("Filtro de aire", "motor", 3),
        ("Filtro de habitáculo", "motor", 4),
        ("Filtro de gasolina", "motor", 5),
        ("Correas del motor", "motor", 6),
        ("Líquido de refrigeración", "motor", 7),
        ("Mangueras del radiador", "motor", 8),
        ("Aceite de transmisión", "motor", 9),
        ("Bujías", "motor", 10),
        ("Pastillas de freno delanteras", "frenos", 11),
        ("Pastillas de freno traseras", "frenos", 12),
        ("Discos de freno", "frenos", 13),
        ("Líquido de frenos", "frenos", 14),
        ("Línea de frenos", "frenos", 15),
        ("Presión de llantas", "llantas", 16),
        ("Desgaste de llantas", "llantas", 17),
        ("Alineación", "llantas", 18),
        ("Luces delanteras", "luces", 19),
        ("Luces traseras", "luces", 20),
        ("Direccionales", "luces", 21),
        ("Luces de freno", "luces", 22),
        ("Freno de mano", "frenos", 23),
        ("Amortiguadores", "suspension", 24),
        ("Brazos de suspensión", "suspension", 25),
        ("Rotulas", "suspension", 26),
        ("Batería", "electrico", 27),
        ("Cables de batería", "electrico", 28),
        ("Alternador", "electrico", 29),
        ("Marcha", "electrico", 30),
        ("Aceite de caja", "transmision", 31),
        ("Embrague", "transmision", 32),
        ("Fugas generales", "general", 33),
        ("Parabrisas", "general", 34),
        ("Espejos", "general", 35),
        ("Cinturones", "general", 36),
        ("Funcionamiento general del motor", "general", 37),
    ]

    pickup_extra = [
        ("Diferencial", "transmision", 38),
        ("Caja de transferencia", "transmision", 39),
        ("Sistema 4x4", "transmision", 40),
        ("Línea de aceite del motor", "motor", 41),
        ("Capacidad de carga", "carga", 42),
        ("Sistema de frenos de aire", "frenos", 43),
    ]

    suv_extra = [
        ("Diferencial", "transmision", 38),
        ("Suspensión neumática", "suspension", 39),
    ]

    items = list(sedan_items)
    if vehicle_type == "pickup":
        items.extend(pickup_extra)
    elif vehicle_type == "suv":
        items.extend(suv_extra)

    for item_name, cat, order_idx in items:
        db.add(WorkshopChecklistTemplate(
            vehicle_type=vehicle_type,
            item_name=item_name,
            item_category=cat,
            sort_order=order_idx,
            company_id=company_id
        ))
    db.commit()


@router.get("/vehicles", response_model=List[WorkshopVehicleResponse])
async def list_workshop_vehicles(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    vehicle_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_taller_module(db, current_user.company_id)
    query = db.query(WorkshopVehicle).filter(WorkshopVehicle.is_active == True)
    if current_user.company_id:
        query = query.filter(WorkshopVehicle.company_id == current_user.company_id)
    if search:
        query = query.filter(
            (WorkshopVehicle.plate_number.ilike(f"%{search}%")) |
            (WorkshopVehicle.brand.ilike(f"%{search}%")) |
            (WorkshopVehicle.model.ilike(f"%{search}%"))
        )
    if vehicle_type:
        query = query.filter(WorkshopVehicle.vehicle_type == vehicle_type)
    return query.order_by(WorkshopVehicle.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/vehicles/{vehicle_id}", response_model=WorkshopVehicleResponse)
async def get_workshop_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vehicle = db.query(WorkshopVehicle).filter(WorkshopVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return vehicle


@router.post("/vehicles", response_model=WorkshopVehicleResponse)
async def create_workshop_vehicle(
    data: WorkshopVehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_taller_module(db, current_user.company_id)
    client = db.query(Client).filter(Client.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    vehicle = WorkshopVehicle(**data.model_dump(), company_id=current_user.company_id)
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.put("/vehicles/{vehicle_id}", response_model=WorkshopVehicleResponse)
async def update_workshop_vehicle(
    vehicle_id: int,
    data: WorkshopVehicleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vehicle = db.query(WorkshopVehicle).filter(WorkshopVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(vehicle, key, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete("/vehicles/{vehicle_id}")
async def delete_workshop_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vehicle = db.query(WorkshopVehicle).filter(WorkshopVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    vehicle.is_active = False
    db.commit()
    return {"message": "Vehículo desactivado"}


@router.get("/checklist-templates/{vehicle_type}")
async def get_checklist_template(
    vehicle_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _seed_checklist_template(db, vehicle_type, current_user.company_id)
    db.commit()
    items = db.query(WorkshopChecklistTemplate).filter(
        WorkshopChecklistTemplate.vehicle_type == vehicle_type,
        WorkshopChecklistTemplate.is_active == True,
        WorkshopChecklistTemplate.company_id == current_user.company_id
    ).order_by(WorkshopChecklistTemplate.sort_order).all()
    return items


@router.post("/checklist-templates")
async def create_checklist_template(
    data: WorkshopChecklistTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = WorkshopChecklistTemplate(**data.model_dump(), company_id=current_user.company_id)
    db.add(item)
    db.commit()
    return {"message": "Ítem agregado"}


@router.delete("/checklist-templates/{template_id}")
async def delete_checklist_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(WorkshopChecklistTemplate).filter(WorkshopChecklistTemplate.id == template_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
    item.is_active = False
    db.commit()
    return {"message": "Ítem desactivado"}


@router.get("/mechanics", response_model=List[WorkshopMechanicResponse])
async def list_mechanics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(WorkshopMechanic).filter(WorkshopMechanic.is_active == True)
    if current_user.company_id:
        query = query.filter(WorkshopMechanic.company_id == current_user.company_id)
    return query.order_by(WorkshopMechanic.name).all()


@router.post("/mechanics", response_model=WorkshopMechanicResponse)
async def create_mechanic(
    data: WorkshopMechanicCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mechanic = WorkshopMechanic(**data.model_dump(), company_id=current_user.company_id)
    db.add(mechanic)
    db.commit()
    db.refresh(mechanic)
    return mechanic


@router.put("/mechanics/{mechanic_id}", response_model=WorkshopMechanicResponse)
async def update_mechanic(
    mechanic_id: int,
    data: WorkshopMechanicUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mechanic = db.query(WorkshopMechanic).filter(WorkshopMechanic.id == mechanic_id).first()
    if not mechanic:
        raise HTTPException(status_code=404, detail="Mecánico no encontrado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(mechanic, key, value)
    db.commit()
    db.refresh(mechanic)
    return mechanic


@router.delete("/mechanics/{mechanic_id}")
async def delete_mechanic(
    mechanic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mechanic = db.query(WorkshopMechanic).filter(WorkshopMechanic.id == mechanic_id).first()
    if not mechanic:
        raise HTTPException(status_code=404, detail="Mecánico no encontrado")
    mechanic.is_active = False
    db.commit()
    return {"message": "Mecánico desactivado"}


@router.get("/inspections/{order_id}", response_model=List[WorkshopInspectionResponse])
async def get_order_inspections(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspections = db.query(WorkshopInspection).filter(
        WorkshopInspection.order_id == order_id
    ).all()
    return inspections


@router.post("/inspections", response_model=WorkshopInspectionResponse)
async def create_inspection(
    data: WorkshopInspectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspection = WorkshopInspection(**data.model_dump(), company_id=current_user.company_id)
    db.add(inspection)
    db.commit()
    db.refresh(inspection)
    return inspection


@router.post("/inspections/{inspection_id}/images", response_model=WorkshopInspectionImageResponse)
async def add_inspection_image(
    inspection_id: int,
    data: WorkshopInspectionImageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspection = db.query(WorkshopInspection).filter(WorkshopInspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspección no encontrada")
    image = WorkshopInspectionImage(inspection_id=inspection_id, **data.model_dump())
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@router.delete("/inspections/{inspection_id}")
async def delete_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inspection = db.query(WorkshopInspection).filter(WorkshopInspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspección no encontrada")
    db.delete(inspection)
    db.commit()
    return {"message": "Inspección eliminada"}


# ==================== INSPECTION PDF ====================

@router.get("/inspections/{order_id}/pdf")
async def get_inspection_pdf(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    order = db.query(WorkshopOrder).filter(WorkshopOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    inspections = db.query(WorkshopInspection).filter(WorkshopInspection.order_id == order_id).all()

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    elements = []

    title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], fontSize=16, spaceAfter=6)
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=10, textColor=colors.grey, spaceAfter=12)
    header_style = ParagraphStyle('Header', parent=styles['Heading2'], fontSize=12, spaceAfter=6, spaceBefore=12)
    normal_style = ParagraphStyle('NormalCustom', parent=styles['Normal'], fontSize=9, leading=12)

    elements.append(Paragraph("Reporte de Inspección Vehicular", title_style))
    elements.append(Paragraph(f"Orden #{order.id} | {order.vehicle.brand if order.vehicle else ''} {order.vehicle.model if order.vehicle else ''} | Placa: {order.vehicle.plate_number if order.vehicle else ''}", subtitle_style))
    elements.append(Paragraph(f"Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M')}", subtitle_style))
    elements.append(Spacer(1, 12))

    if inspections:
        elements.append(Paragraph("Daños Registrados", header_style))

        damage_data = [['Zona', 'Tipo de Daño', 'Severidad', 'Notas', 'Inspectado por']]
        for insp in inspections:
            zone_labels = {
                'front_bumper': 'Defensa Del.', 'hood': 'Capó', 'windshield': 'Parabrisas',
                'left_headlight': 'Faros Izq.', 'right_headlight': 'Faros Der.',
                'rear_bumper': 'Defensa Tras.', 'trunk': 'Maletero', 'rear_window': 'Vidrio Tras.',
                'left_taillight': 'Luces Tras. Izq.', 'right_taillight': 'Luces Tras. Der.',
                'left_front_door': 'Puerta Del. Izq.', 'right_front_door': 'Puerta Del. Der.',
                'left_rear_door': 'Puerta Tras. Izq.', 'right_rear_door': 'Puerta Tras. Der.',
                'left_front_tire': 'Llanta Del. Izq.', 'right_front_tire': 'Llanta Del. Der.',
                'left_rear_tire': 'Llanta Tras. Izq.', 'right_rear_tire': 'Llanta Tras. Der.',
                'left_mirror': 'Espejo Izq.', 'right_mirror': 'Espejo Der.',
                'left_fender': 'Guardabrisas Izq.', 'right_fender': 'Guardabrisas Der.',
                'grille': 'Parrilla', 'license_plate_rear': 'Placa Tras.',
                'left_rear_fender': 'Guarda Tras. Izq.', 'right_rear_fender': 'Guarda Tras. Der.',
            }
            damage_data.append([
                zone_labels.get(insp.zone, insp.zone),
                insp.damage_type.replace('_', ' ').title(),
                insp.severity.title(),
                insp.notes or '-',
                insp.inspected_by or '-',
            ])

        damage_table = Table(damage_data, colWidths=[1.3*inch, 1.1*inch, 0.9*inch, 1.8*inch, 1.1*inch])
        damage_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(damage_table)
    else:
        elements.append(Paragraph("No se registraron daños. Todas las zonas están en buen estado.", header_style))

    elements.append(Spacer(1, 12))
    elements.append(Paragraph("Firma del inspector: ________________________", normal_style))

    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=inspeccion-orden-{order_id}.pdf"})


# ==================== ORDER IMAGES (Fase 2) ====================

@router.get("/orders/{order_id}/images", response_model=List[WorkshopOrderImageResponse])
async def get_order_images(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(WorkshopOrderImage).filter(WorkshopOrderImage.order_id == order_id).all()


@router.post("/orders/{order_id}/images", response_model=WorkshopOrderImageResponse)
async def add_order_image(
    order_id: int,
    data: WorkshopOrderImageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    image = WorkshopOrderImage(order_id=order_id, company_id=current_user.company_id, **data.model_dump())
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@router.delete("/orders/images/{image_id}")
async def delete_order_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    image = db.query(WorkshopOrderImage).filter(WorkshopOrderImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    db.delete(image)
    db.commit()
    return {"message": "Imagen eliminada"}


# ==================== WORKSHOP INVENTORY (Fase 3) ====================

@router.get("/inventory", response_model=List[WorkshopInventoryResponse])
async def get_workshop_inventory(
    skip: int = 0, limit: int = 100,
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_taller_module(db, current_user.company_id)
    q = db.query(WorkshopInventory)
    if current_user.role not in ['super_admin', 'admin']:
        q = q.filter(WorkshopInventory.company_id == current_user.company_id)
    if search:
        q = q.filter(WorkshopInventory.name.ilike(f"%{search}%"))
    if category:
        q = q.filter(WorkshopInventory.category == category)
    if low_stock:
        q = q.filter(WorkshopInventory.current_stock <= WorkshopInventory.min_stock)
    return q.order_by(WorkshopInventory.name).offset(skip).limit(limit).all()


@router.post("/inventory", response_model=WorkshopInventoryResponse)
async def create_workshop_inventory(
    data: WorkshopInventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = WorkshopInventory(**data.model_dump(), company_id=current_user.company_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/inventory/{item_id}", response_model=WorkshopInventoryResponse)
async def update_workshop_inventory(
    item_id: int,
    data: WorkshopInventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(WorkshopInventory).filter(WorkshopInventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/inventory/{item_id}")
async def delete_workshop_inventory(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(WorkshopInventory).filter(WorkshopInventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    db.delete(item)
    db.commit()
    return {"message": "Item eliminado"}


@router.get("/inventory/stats")
async def get_inventory_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(WorkshopInventory)
    if current_user.role not in ['super_admin', 'admin']:
        q = q.filter(WorkshopInventory.company_id == current_user.company_id)
    total = q.count()
    low_stock = q.filter(WorkshopInventory.current_stock <= WorkshopInventory.min_stock).count()
    total_value = db.query(func.sum(WorkshopInventory.current_stock * WorkshopInventory.unit_cost)).filter(
        WorkshopInventory.company_id == current_user.company_id
    ).scalar() or 0
    categories = db.query(WorkshopInventory.category, func.count()).filter(
        WorkshopInventory.company_id == current_user.company_id
    ).group_by(WorkshopInventory.category).all()
    return {
        "total_items": total,
        "low_stock_count": low_stock,
        "total_value": float(total_value),
        "categories": {c[0] or "Sin categoría": c[1] for c in categories}
    }


@router.get("/inventory/search")
async def search_inventory(
    q: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(WorkshopInventory).filter(WorkshopInventory.is_active == True)
    if current_user.role not in ['super_admin', 'admin']:
        query = query.filter(WorkshopInventory.company_id == current_user.company_id)
    if q:
        query = query.filter(WorkshopInventory.name.ilike(f"%{q}%"))
    items = query.order_by(WorkshopInventory.name).limit(20).all()
    return [{"id": i.id, "name": i.name, "current_stock": i.current_stock, "unit_price": i.unit_price, "unit_cost": i.unit_cost, "sku": i.sku} for i in items]


# ==================== WORKSHOP INVOICES (Fase 4) ====================

@router.get("/invoices")
async def get_invoices(
    skip: int = 0, limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_taller_module(db, current_user.company_id)
    q = db.query(WorkshopInvoice)
    if current_user.role not in ['super_admin', 'admin']:
        q = q.filter(WorkshopInvoice.company_id == current_user.company_id)
    if status:
        q = q.filter(WorkshopInvoice.status == status)
    invoices = q.order_by(WorkshopInvoice.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for inv in invoices:
        result.append({
            "id": inv.id, "order_id": inv.order_id, "client_id": inv.client_id,
            "invoice_number": inv.invoice_number, "subtotal": inv.subtotal,
            "tax": inv.tax, "discount": inv.discount, "total": inv.total,
            "status": inv.status, "paid_amount": inv.paid_amount,
            "payment_method": inv.payment_method, "payment_date": inv.payment_date,
            "notes": inv.notes, "work_summary": getattr(inv, 'work_summary', None),
            "company_id": inv.company_id,
            "created_at": str(inv.created_at) if inv.created_at else None,
            "updated_at": str(inv.updated_at) if inv.updated_at else None,
        })
    return result


@router.post("/invoices")
async def create_invoice(
    data: WorkshopInvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(WorkshopInvoice).filter(
        WorkshopInvoice.order_id == data.order_id,
        WorkshopInvoice.status != 'cancelled'
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"La orden ya tiene la factura {existing.invoice_number}")

    count = db.query(WorkshopInvoice).filter(WorkshopInvoice.company_id == current_user.company_id).count()
    invoice_number = f"FT-{(count + 1):04d}"
    invoice = WorkshopInvoice(
        **data.model_dump(),
        invoice_number=invoice_number,
        company_id=current_user.company_id
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return {
        "id": invoice.id,
        "order_id": invoice.order_id,
        "invoice_number": invoice.invoice_number,
        "subtotal": invoice.subtotal,
        "tax": invoice.tax,
        "discount": invoice.discount,
        "total": invoice.total,
        "status": invoice.status,
        "paid_amount": invoice.paid_amount,
        "payment_method": invoice.payment_method,
        "payment_date": invoice.payment_date,
        "notes": invoice.notes,
        "work_summary": getattr(invoice, 'work_summary', None),
        "company_id": invoice.company_id,
        "created_at": str(invoice.created_at) if invoice.created_at else None,
        "updated_at": str(invoice.updated_at) if invoice.updated_at else None,
    }


@router.put("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: int,
    data: WorkshopInvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(WorkshopInvoice).filter(WorkshopInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(invoice, key, value)
    db.commit()
    db.refresh(invoice)
    return {
        "id": invoice.id, "order_id": invoice.order_id, "invoice_number": invoice.invoice_number,
        "subtotal": invoice.subtotal, "tax": invoice.tax, "discount": invoice.discount,
        "total": invoice.total, "status": invoice.status, "paid_amount": invoice.paid_amount,
        "payment_method": invoice.payment_method, "notes": invoice.notes,
    }


@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(WorkshopInvoice).filter(WorkshopInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    db.delete(invoice)
    db.commit()
    return {"message": "Factura eliminada"}


@router.get("/invoices/stats")
async def get_invoice_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(WorkshopInvoice)
    if current_user.role not in ['super_admin', 'admin']:
        q = q.filter(WorkshopInvoice.company_id == current_user.company_id)
    total_invoiced = q.filter(WorkshopInvoice.status != 'cancelled').count()
    total_paid = q.filter(WorkshopInvoice.status == 'paid').count()
    total_pending = q.filter(WorkshopInvoice.status.in_(['pending', 'partially_paid'])).count()
    total_amount = db.query(func.sum(WorkshopInvoice.total)).filter(WorkshopInvoice.status != 'cancelled').scalar() or 0
    total_paid_amount = db.query(func.sum(WorkshopInvoice.paid_amount)).scalar() or 0
    return {
        "total_invoiced": total_invoiced,
        "total_paid": total_paid,
        "total_pending": total_pending,
        "total_amount": float(total_amount),
        "total_paid_amount": float(total_paid_amount),
        "pending_amount": float(total_amount) - float(total_paid_amount)
    }


@router.get("/daily-report")
async def get_daily_report(
    report_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_taller_module(db, current_user.company_id)
    target_date = date.fromisoformat(report_date) if report_date else date.today()
    start = datetime.combine(target_date, datetime.min.time())
    end = datetime.combine(target_date, datetime.max.time())
    q = db.query(WorkshopOrder).filter(WorkshopOrder.company_id == current_user.company_id)

    worked_today = q.filter(
        WorkshopOrder.status == "delivered",
        func.date(WorkshopOrder.picked_up_datetime) == target_date
    ).all()

    waiting = q.filter(
        WorkshopOrder.status.in_(["in_progress", "waiting_parts", "pending"]),
    ).all()

    ready_not_picked = q.filter(
        WorkshopOrder.status == "completed",
    ).all()

    total_revenue = sum(o.total_cost or 0 for o in worked_today)

    return {
        "date": str(target_date),
        "worked_today": [{
            "id": o.id,
            "vehicle": f"{o.vehicle.brand} {o.vehicle.model}" if o.vehicle else "N/A",
            "plate": o.vehicle.plate_number if o.vehicle else "N/A",
            "client": o.client.name if o.client else "N/A",
            "mechanic": o.mechanic_name or "N/A",
            "type": o.type,
            "total_cost": o.total_cost or 0,
            "picked_up_by": o.picked_up_by or "N/A",
            "days_in_shop": (o.picked_up_datetime - o.entry_datetime).days if o.picked_up_datetime and o.entry_datetime else 0,
        } for o in worked_today],
        "waiting_count": len(waiting),
        "ready_not_picked": [{
            "id": o.id,
            "vehicle": f"{o.vehicle.brand} {o.vehicle.model}" if o.vehicle else "N/A",
            "plate": o.vehicle.plate_number if o.vehicle else "N/A",
            "client": o.client.name if o.client else "N/A",
        } for o in ready_not_picked],
        "total_revenue": total_revenue,
    }


@router.get("/", response_model=List[WorkshopOrderResponse])
async def get_workshop_orders(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    order_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_taller_module(db, current_user.company_id)
    query = db.query(WorkshopOrder)
    if current_user.company_id:
        query = query.filter(WorkshopOrder.company_id == current_user.company_id)
    if status:
        query = query.filter(WorkshopOrder.status == status)
    if order_type:
        query = query.filter(WorkshopOrder.type == order_type)
    return query.order_by(WorkshopOrder.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/daily-report")
async def get_daily_report(
    report_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_date = date.fromisoformat(report_date) if report_date else date.today()
    query = db.query(WorkshopOrder)
    if current_user.company_id:
        query = query.filter(WorkshopOrder.company_id == current_user.company_id)

    worked_today = query.filter(
        WorkshopOrder.status == "delivered",
        func.date(WorkshopOrder.picked_up_datetime) == target_date
    ).all()

    waiting = query.filter(
        WorkshopOrder.status.in_(["in_progress", "waiting_parts", "pending"]),
    ).all()

    ready_not_picked = query.filter(
        WorkshopOrder.status == "completed",
    ).all()

    total_revenue = sum(o.total_cost or 0 for o in worked_today)
    total_worked = len(worked_today)

    return {
        "date": str(target_date),
        "worked_today": [{
            "id": o.id,
            "vehicle": f"{o.vehicle.brand} {o.vehicle.model}" if o.vehicle else "N/A",
            "plate": o.vehicle.plate_number if o.vehicle else "N/A",
            "client": o.client.name if o.client else "N/A",
            "mechanic": o.mechanic_name or "N/A",
            "type": o.type,
            "total_cost": o.total_cost or 0,
            "picked_up_by": o.picked_up_by or "N/A",
            "days_in_shop": (o.picked_up_datetime - o.entry_datetime).days if o.picked_up_datetime and o.entry_datetime else 0,
        } for o in worked_today],
        "waiting": [{
            "id": o.id,
            "vehicle": f"{o.vehicle.brand} {o.vehicle.model}" if o.vehicle else "N/A",
            "plate": o.vehicle.plate_number if o.vehicle else "N/A",
            "client": o.client.name if o.client else "N/A",
            "mechanic": o.mechanic_name or "N/A",
            "status": o.status,
            "days_in_shop": (datetime.now() - o.entry_datetime).days if o.entry_datetime else 0,
        } for o in waiting],
        "ready_not_picked": [{
            "id": o.id,
            "vehicle": f"{o.vehicle.brand} {o.vehicle.model}" if o.vehicle else "N/A",
            "plate": o.vehicle.plate_number if o.vehicle else "N/A",
            "client": o.client.name if o.client else "N/A",
            "days_waiting": (datetime.now() - o.exit_datetime).days if o.exit_datetime else 0,
            "total_cost": o.total_cost or 0,
        } for o in ready_not_picked],
        "summary": {
            "total_worked": total_worked,
            "total_revenue": total_revenue,
            "total_waiting": len(waiting),
            "total_ready_not_picked": len(ready_not_picked),
        }
    }


@router.get("/summary/stats")
async def get_workshop_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_taller_module(db, current_user.company_id)
    base = db.query(WorkshopOrder)
    if current_user.company_id:
        base = base.filter(WorkshopOrder.company_id == current_user.company_id)

    active = base.filter(WorkshopOrder.status.in_(["pending", "in_progress", "waiting_parts"])).count()
    completed_today = base.filter(
        WorkshopOrder.status == "completed",
        func.date(WorkshopOrder.exit_datetime) == date.today()
    ).count()
    completed_month = base.filter(
        WorkshopOrder.status == "completed",
        func.date(WorkshopOrder.exit_datetime) >= date.today().replace(day=1)
    ).count()
    delivered_pending = base.filter(WorkshopOrder.status == "completed").count()

    avg_days = 0
    completed_orders = base.filter(WorkshopOrder.exit_datetime.isnot(None)).all()
    if completed_orders:
        days = [(o.exit_datetime - o.entry_datetime).days for o in completed_orders if o.entry_datetime]
        avg_days = round(sum(days) / len(days), 1) if days else 0

    total_revenue = base.filter(WorkshopOrder.status == "delivered").with_entities(
        func.sum(WorkshopOrder.total_cost)
    ).scalar() or 0

    avg_cost = 0
    delivered = base.filter(WorkshopOrder.status == "delivered").all()
    if delivered:
        avg_cost = round(total_revenue / len(delivered), 2)

    return {
        "active_orders": active,
        "completed_today": completed_today,
        "completed_this_month": completed_month,
        "pending_pickup": delivered_pending,
        "avg_days_in_shop": avg_days,
        "total_revenue": total_revenue,
        "avg_cost_per_order": avg_cost
    }


@router.get("/vehicles/{vehicle_id}/history")
async def get_vehicle_history(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vehicle = db.query(WorkshopVehicle).filter(WorkshopVehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    orders = db.query(WorkshopOrder).filter(
        WorkshopOrder.vehicle_id == vehicle_id
    ).order_by(WorkshopOrder.created_at.desc()).all()
    return {"vehicle": vehicle, "orders": orders}


@router.get("/{order_id}", response_model=WorkshopOrderResponse)
async def get_workshop_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(WorkshopOrder).filter(WorkshopOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return order


@router.post("/", response_model=WorkshopOrderResponse)
async def create_workshop_order(
    data: WorkshopOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _require_taller_module(db, current_user.company_id)
    vehicle = db.query(WorkshopVehicle).filter(WorkshopVehicle.id == data.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    client = db.query(Client).filter(Client.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    entry_dt = datetime.now()
    est_completion = None
    if data.estimated_completion:
        est_completion = datetime.fromisoformat(data.estimated_completion)

    next_maint = None
    if data.next_maintenance_date:
        next_maint = date.fromisoformat(data.next_maintenance_date)

    order = WorkshopOrder(
        vehicle_id=data.vehicle_id,
        client_id=data.client_id,
        mechanic_name=data.mechanic_name,
        assistant_names=data.assistant_names,
        type=data.type,
        description=data.description,
        diagnosis=data.diagnosis,
        solution=data.solution,
        status="pending",
        entry_km=data.entry_km or vehicle.mileage,
        entry_datetime=entry_dt,
        estimated_completion=est_completion,
        cost_labor=data.cost_labor,
        mechanic_observations=data.mechanic_observations,
        recommendations=data.recommendations,
        urgent_issues=data.urgent_issues,
        customer_notes=data.customer_notes,
        next_maintenance_date=next_maint,
        next_maintenance_km=data.next_maintenance_km,
        company_id=current_user.company_id
    )
    db.add(order)
    db.flush()

    for item in data.checklist:
        db.add(WorkshopChecklist(
            order_id=order.id,
            item_name=item.item_name,
            item_category=item.item_category,
            status=item.status,
            notes=item.notes,
            needs_replacement=item.needs_replacement
        ))

    cost_parts = 0
    for part in data.parts_used:
        part_total = part.unit_price * part.quantity
        cost_parts += part_total

        if part.workshop_inventory_id:
            inv_item = db.query(WorkshopInventory).filter(WorkshopInventory.id == part.workshop_inventory_id).first()
            if inv_item and inv_item.current_stock >= part.quantity:
                inv_item.current_stock -= part.quantity
            db.add(WorkshopPartsUsed(
                order_id=order.id,
                workshop_inventory_id=part.workshop_inventory_id,
                custom_name=part.custom_name,
                quantity=part.quantity,
                unit_cost=part.unit_cost,
                unit_price=part.unit_price
            ))
        elif part.product_id:
            product = db.query(Product).filter(Product.id == part.product_id).first()
            if product and product.stock >= part.quantity:
                product.stock -= part.quantity
                db.add(InventoryMovement(
                    product_id=part.product_id,
                    quantity=part.quantity,
                    movement_type="salida",
                    reason=f"Taller Orden #{order.id}",
                    created_by=current_user.id,
                    company_id=current_user.company_id
                ))
            db.add(WorkshopPartsUsed(
                order_id=order.id,
                product_id=part.product_id,
                quantity=part.quantity,
                unit_cost=part.unit_cost,
                unit_price=part.unit_price
            ))
        else:
            db.add(WorkshopPartsUsed(
                order_id=order.id,
                custom_name=part.custom_name or "Otro",
                quantity=part.quantity,
                unit_cost=part.unit_cost,
                unit_price=part.unit_price
            ))

    order.cost_parts = cost_parts
    order.total_cost = order.cost_labor + cost_parts
    db.commit()
    db.refresh(order)
    return order


@router.put("/{order_id}", response_model=WorkshopOrderResponse)
async def update_workshop_order(
    order_id: int,
    data: WorkshopOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(WorkshopOrder).filter(WorkshopOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    new_status = None
    for key, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            if key in ("estimated_completion",) and isinstance(value, str):
                value = datetime.fromisoformat(value) if value else None
            elif key in ("next_maintenance_date",) and isinstance(value, str):
                value = date.fromisoformat(value) if value else None
            elif key == "status" and value == "completed":
                order.exit_datetime = datetime.now()
            elif key == "status" and value == "delivered":
                order.picked_up_datetime = datetime.now()
                new_status = "delivered"
            setattr(order, key, value)

    total_parts = sum(p.unit_price * p.quantity for p in order.parts_used)
    order.cost_parts = total_parts
    order.total_cost = (order.cost_labor or 0) + total_parts

    if new_status == "delivered":
        try:
            existing = db.query(WorkshopInvoice).filter(WorkshopInvoice.order_id == order.id).first()
            if not existing:
                count = db.query(WorkshopInvoice).filter(WorkshopInvoice.company_id == current_user.company_id).count()
                invoice_number = f"FT-{(count + 1):04d}"

                parts_detail = ""
                for p in order.parts_used:
                    name = p.custom_name or (p.product.name if p.product else f"Inv#{p.workshop_inventory_id}")
                    parts_detail += f"- {name} x{p.quantity}: ${p.unit_price * p.quantity:.2f}\n"

                checklist_detail = ""
                for c in order.checklist:
                    if c.status != 'na':
                        checklist_detail += f"- {c.item_name}: {c.status}\n"

                work_summary = f"ORDEN #{order.id}\n"
                work_summary += f"Vehiculo: {order.vehicle.brand if order.vehicle else ''} {order.vehicle.model if order.vehicle else ''} ({order.vehicle.plate_number if order.vehicle else ''})\n"
                work_summary += f"Tipo: {order.type}\n"
                if order.description:
                    work_summary += f"Descripcion: {order.description}\n"
                if order.diagnosis:
                    work_summary += f"Diagnostico: {order.diagnosis}\n"
                if order.solution:
                    work_summary += f"Solucion: {order.solution}\n"
                if checklist_detail:
                    work_summary += f"\nCHECKLIST:\n{checklist_detail}"
                if parts_detail:
                    work_summary += f"\nPIEZAS UTILIZADAS:\n{parts_detail}"

                invoice = WorkshopInvoice(
                    order_id=order.id,
                    client_id=order.client_id,
                    invoice_number=invoice_number,
                    subtotal=order.total_cost,
                    tax=0,
                    discount=0,
                    total=order.total_cost,
                    status="pending",
                    company_id=current_user.company_id
                )
                try:
                    invoice.work_summary = work_summary
                except:
                    pass
                db.add(invoice)
        except Exception as e:
            logger.error(f"Error auto-factura: {e}")

    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/parts")
async def add_parts_to_order(
    order_id: int,
    parts: List[WorkshopPartsUsedCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(WorkshopOrder).filter(WorkshopOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    for part in parts:
        part_total = part.unit_price * part.quantity

        if part.workshop_inventory_id:
            inv_item = db.query(WorkshopInventory).filter(WorkshopInventory.id == part.workshop_inventory_id).first()
            if inv_item and inv_item.current_stock >= part.quantity:
                inv_item.current_stock -= part.quantity
            db.add(WorkshopPartsUsed(
                order_id=order.id,
                workshop_inventory_id=part.workshop_inventory_id,
                custom_name=part.custom_name,
                quantity=part.quantity,
                unit_cost=part.unit_cost,
                unit_price=part.unit_price
            ))
        elif part.product_id:
            product = db.query(Product).filter(Product.id == part.product_id).first()
            if product and product.stock >= part.quantity:
                product.stock -= part.quantity
                db.add(InventoryMovement(
                    product_id=part.product_id,
                    quantity=part.quantity,
                    movement_type="salida",
                    reason=f"Taller Orden #{order.id}",
                    created_by=current_user.id,
                    company_id=current_user.company_id
                ))
            db.add(WorkshopPartsUsed(
                order_id=order.id,
                product_id=part.product_id,
                quantity=part.quantity,
                unit_cost=part.unit_cost,
                unit_price=part.unit_price
            ))
        else:
            db.add(WorkshopPartsUsed(
                order_id=order.id,
                custom_name=part.custom_name or "Otro",
                quantity=part.quantity,
                unit_cost=part.unit_cost,
                unit_price=part.unit_price
            ))

    total_parts = sum(p.unit_price * p.quantity for p in order.parts_used)
    order.cost_parts = total_parts
    order.total_cost = (order.cost_labor or 0) + total_parts
    db.commit()
    db.refresh(order)
    return {"message": f"{len(parts)} pieza(s) agregada(s)"}


@router.delete("/parts/{part_id}")
async def delete_part_used(
    part_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    part = db.query(WorkshopPartsUsed).filter(WorkshopPartsUsed.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Pieza no encontrada")

    if part.workshop_inventory_id:
        inv = db.query(WorkshopInventory).filter(WorkshopInventory.id == part.workshop_inventory_id).first()
        if inv:
            inv.current_stock += part.quantity

    order = db.query(WorkshopOrder).filter(WorkshopOrder.id == part.order_id).first()
    if order:
        order.cost_parts = max(0, (order.cost_parts or 0) - (part.unit_price * part.quantity))
        order.total_cost = (order.cost_labor or 0) + order.cost_parts

    db.delete(part)
    db.commit()
    return {"message": "Pieza eliminada. Stock devuelto."}


@router.post("/{order_id}/checklist")
async def add_checklist_items(
    order_id: int,
    items: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(WorkshopOrder).filter(WorkshopOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    for item in items:
        db.add(WorkshopChecklist(
            order_id=order_id,
            item_name=item.get("item_name", ""),
            item_category=item.get("item_category", ""),
            status=item.get("status", "ok"),
            notes=item.get("notes", ""),
            needs_replacement=item.get("needs_replacement", False)
        ))

    db.commit()
    return {"message": f"{len(items)} ítems agregados"}


@router.delete("/{order_id}")
async def delete_workshop_order(
    order_id: int,
    cancel_reason: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(WorkshopOrder).filter(WorkshopOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    if order.status == "cancelled":
        raise HTTPException(status_code=400, detail="La orden ya está cancelada")
    if order.status == "delivered":
        raise HTTPException(status_code=400, detail="No se puede cancelar una orden ya entregada")

    if not cancel_reason:
        raise HTTPException(status_code=400, detail="Debes indicar el motivo de cancelación")

    parts = db.query(WorkshopPartsUsed).filter(WorkshopPartsUsed.order_id == order_id).all()
    for part in parts:
        if part.workshop_inventory_id:
            inv_item = db.query(WorkshopInventory).filter(WorkshopInventory.id == part.workshop_inventory_id).first()
            if inv_item:
                inv_item.current_stock += part.quantity
        elif part.product_id:
            product = db.query(Product).filter(Product.id == part.product_id).first()
            if product:
                product.stock += part.quantity
                db.add(InventoryMovement(
                    product_id=part.product_id,
                    quantity=part.quantity,
                    movement_type="entrada",
                    reason=f"Devolución - Orden Taller #{order.id} cancelada",
                    created_by=current_user.id,
                    company_id=current_user.company_id
                ))

    order.status = "cancelled"
    order.cancel_reason = cancel_reason
    order.cancelled_at = datetime.now()
    db.commit()
    return {"message": "Orden cancelada. Stock devuelto."}


@router.get("/{order_id}/checklist-pdf")
async def generate_checklist_pdf(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(WorkshopOrder).filter(WorkshopOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    except ImportError:
        raise HTTPException(status_code=500, detail="ReportLab no instalado")

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    elements = []

    company = None
    if current_user.company_id:
        company = db.query(Company).filter(Company.id == current_user.company_id).first()

    title_style = ParagraphStyle('Title2', parent=styles['Heading1'], fontSize=16, spaceAfter=6)
    subtitle_style = ParagraphStyle('Subtitle2', parent=styles['Heading2'], fontSize=12, spaceAfter=4)
    normal_style = ParagraphStyle('Normal2', parent=styles['Normal'], fontSize=9, spaceAfter=2)
    small_style = ParagraphStyle('Small2', parent=styles['Normal'], fontSize=8)

    elements.append(Paragraph(company.name if company else "Taller", title_style))
    elements.append(Paragraph(f"Orden de Trabajo #{order.id}", subtitle_style))
    elements.append(Paragraph(f"Fecha: {order.created_at.strftime('%d/%m/%Y') if order.created_at else 'N/A'}", normal_style))
    elements.append(Paragraph(f"Tipo: {'Mantenimiento' if order.type == 'mantenimiento' else 'Reparación'}", normal_style))
    elements.append(Spacer(1, 12))

    client_obj = db.query(Client).filter(Client.id == order.client_id).first()

    v = order.vehicle
    if v:
        elements.append(Paragraph("VEHÍCULO", subtitle_style))
        veh_data = [
            ['Placa:', v.plate_number, 'Marca:', f"{v.brand or ''} {v.model}"],
            ['Color:', v.color or 'N/A', 'Tipo:', v.vehicle_type],
            ['Año:', str(v.year or 'N/A'), 'Km:', str(v.mileage or 'N/A')],
            ['Asignado a:', v.assigned_to or 'N/A', '', ''],
        ]
        t = Table(veh_data, colWidths=[1.2*inch, 2*inch, 1.2*inch, 2*inch])
        t.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONT', (2, 0), (2, -1), 'Helvetica-Bold'),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 12))

    if order.description:
        elements.append(Paragraph(f"<b>Descripción:</b> {order.description}", normal_style))

    if order.checklist:
        elements.append(Paragraph("CHECKLIST DE INGRESO", subtitle_style))
        cat_names = {'motor': 'Motor', 'frenos': 'Frenos', 'llantas': 'Llantas', 'luces': 'Luces',
                     'suspension': 'Suspensión', 'electrico': 'Eléctrico', 'transmision': 'Transmisión',
                     'general': 'General', 'carga': 'Carga'}
        grouped = {}
        for item in order.checklist:
            if item.status != "na":
                if item.item_category not in grouped:
                    grouped[item.item_category] = []
                grouped[item.item_category].append(item)

        for cat, items in grouped.items():
            if not items:
                continue
            elements.append(Paragraph(f"<b>{cat_names.get(cat, cat)}</b>", normal_style))
            data = [['Estado', 'Ítem', 'Notas']]
            for item in items:
                data.append([item.status.upper(), item.item_name, item.notes or ''])
            t = Table(data, colWidths=[1*inch, 3.5*inch, 2.5*inch])
            t.setStyle(TableStyle([
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f0f0')),
                ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(t)
            elements.append(Spacer(1, 8))
        elements.append(Spacer(1, 8))

    sections = [
        ('OBSERVACIONES DEL MECÁNICO', order.mechanic_observations),
        ('RECOMENDACIONES', order.recommendations),
        ('PROBLEMAS URGENTES', order.urgent_issues),
        ('NOTAS DEL CLIENTE', order.customer_notes),
    ]
    for title, content in sections:
        if content:
            elements.append(Paragraph(f"<b>{title}</b>", normal_style))
            elements.append(Paragraph(content, small_style))
            elements.append(Spacer(1, 6))

    if order.parts_used:
        elements.append(Paragraph("PIEZAS UTILIZADAS", subtitle_style))
        data = [['Pieza', 'Cant', 'Costo', 'Precio']]
        total_parts = 0
        for part in order.parts_used:
            if part.custom_name:
                name = part.custom_name
            elif part.workshop_inventory_id:
                inv = db.query(WorkshopInventory).filter(WorkshopInventory.id == part.workshop_inventory_id).first()
                name = inv.name if inv else 'N/A'
            elif part.product_id:
                product = db.query(Product).filter(Product.id == part.product_id).first()
                name = product.name if product else 'N/A'
            else:
                name = 'N/A'
            data.append([name, str(part.quantity), f"${part.unit_cost:.2f}", f"${part.unit_price:.2f}"])
            total_parts += part.unit_price * part.quantity
        data.append(['', '', 'Total:', f"${total_parts:.2f}"])
        t = Table(data, colWidths=[3*inch, 0.8*inch, 1.2*inch, 1.2*inch])
        t.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f0f0')),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONT', (-2, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 12))

    elements.append(Paragraph("COSTOS", subtitle_style))
    cost_data = [
        ['Mano de obra:', f"${order.cost_labor:.2f}"],
        ['Piezas:', f"${order.cost_parts:.2f}"],
        ['TOTAL:', f"${order.total_cost:.2f}"],
    ]
    t = Table(cost_data, colWidths=[4*inch, 2*inch])
    t.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONT', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))

    mech_name = order.mechanic_name or "______________________"
    client_name = client_obj.name if client_obj else "______________________"
    assistants = order.assistant_names or ""
    line = f"Mecánico: {mech_name}    Cliente: {client_name}"
    if assistants:
        line += f"    Ayudantes: {assistants}"
    elements.append(Paragraph(line, normal_style))

    if order.status == "delivered" and order.picked_up_by:
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(f"Retirado por: {order.picked_up_by}    Fecha: {order.picked_up_datetime.strftime('%d/%m/%Y %H:%M') if order.picked_up_datetime else 'N/A'}", normal_style))

    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=checklist-orden-{order.id}.pdf"}
    )
