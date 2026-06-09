from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date, timedelta
from ..database import get_db
from ..models import (
    WorkshopVehicle, WorkshopOrder, WorkshopChecklist,
    WorkshopChecklistTemplate, WorkshopPartsUsed,
    Client, User, Product, InventoryMovement
)
from ..schemas import (
    WorkshopVehicleCreate, WorkshopVehicleUpdate, WorkshopVehicleResponse,
    WorkshopOrderCreate, WorkshopOrderUpdate, WorkshopOrderResponse,
    WorkshopChecklistResponse, WorkshopChecklistTemplateCreate,
    WorkshopChecklistTemplateResponse, WorkshopPartsUsedResponse
)
from ..auth import get_current_user

router = APIRouter()


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
        ("Rotación de llantas", "llantas", 18),
        ("Estado de rin", "llantas", 19),
        ("Luces delanteras", "luces", 20),
        ("Luces traseras", "luces", 21),
        ("Direccional(es)", "luces", 22),
        ("Luces de freno", "luces", 23),
        ("Luces de reversa", "luces", 24),
        ("Amortiguadores", "suspension", 25),
        ("Rótulas", "suspension", 26),
        ("Brazos de control", "suspension", 27),
        ("Batería", "electrico", 28),
        ("Alternador", "electrico", 29),
        ("Sistema de carga", "electrico", 30),
        ("Embrague", "transmision", 31),
        ("Escape", "transmision", 32),
        ("Aire acondicionado", "transmision", 33),
        ("Dirección", "transmision", 34),
        ("Nivel de odómetro", "general", 35),
        ("Documentación del vehículo", "general", 36),
        ("Limpieza interior", "general", 37),
    ]

    pickup_extra = [
        ("Estado de la caja", "carga", 38),
        ("Bisagras de tapa", "carga", 39),
        ("Piso de carga", "carga", 40),
        ("Ballestas/resortes traseros", "suspension", 41),
        ("Barra estabilizadora", "suspension", 42),
        ("Diferencial", "transmision", 43),
        ("Cardán", "transmision", 44),
    ]

    items = sedan_items
    if vehicle_type == "pickup":
        items = sedan_items + pickup_extra

    for name, cat, order in items:
        db.add(WorkshopChecklistTemplate(
            vehicle_type=vehicle_type,
            item_name=name,
            item_category=cat,
            sort_order=order,
            is_active=True,
            company_id=company_id
        ))
    db.flush()


@router.get("/vehicles", response_model=List[WorkshopVehicleResponse])
async def get_workshop_vehicles(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    vehicle_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(WorkshopVehicle).filter(WorkshopVehicle.company_id == current_user.company_id)
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


@router.get("/", response_model=List[WorkshopOrderResponse])
async def get_workshop_orders(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    order_type: str = None,
    technician_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(WorkshopOrder).filter(WorkshopOrder.company_id == current_user.company_id)
    if status:
        query = query.filter(WorkshopOrder.status == status)
    if order_type:
        query = query.filter(WorkshopOrder.type == order_type)
    if technician_id:
        query = query.filter(WorkshopOrder.technician_id == technician_id)
    return query.order_by(WorkshopOrder.created_at.desc()).offset(skip).limit(limit).all()


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
        technician_id=current_user.id,
        assistant_name=data.assistant_name,
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
        product = db.query(Product).filter(Product.id == part.product_id).first()
        if product:
            if product.stock >= part.quantity:
                product.stock -= part.quantity
                db.add(InventoryMovement(
                    product_id=part.product_id,
                    quantity=part.quantity,
                    movement_type="salida",
                    reason=f"Taller Orden #{order.id}",
                    created_by=current_user.id,
                    company_id=current_user.company_id
                ))
            part_total = part.unit_price * part.quantity
            cost_parts += part_total
            db.add(WorkshopPartsUsed(
                order_id=order.id,
                product_id=part.product_id,
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
            setattr(order, key, value)

    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}")
async def delete_workshop_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(WorkshopOrder).filter(WorkshopOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    db.delete(order)
    db.commit()
    return {"message": "Orden eliminada"}


@router.get("/summary/stats")
async def get_workshop_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    base = db.query(WorkshopOrder).filter(WorkshopOrder.company_id == current_user.company_id)

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
