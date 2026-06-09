from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date, timedelta
from io import BytesIO
from ..database import get_db
from ..models import (
    WorkshopVehicle, WorkshopOrder, WorkshopChecklist,
    WorkshopChecklistTemplate, WorkshopPartsUsed, WorkshopMechanic,
    Client, User, Product, InventoryMovement, Company
)
from ..schemas import (
    WorkshopVehicleCreate, WorkshopVehicleUpdate, WorkshopVehicleResponse,
    WorkshopOrderCreate, WorkshopOrderUpdate, WorkshopOrderResponse,
    WorkshopChecklistResponse, WorkshopChecklistTemplateCreate,
    WorkshopChecklistTemplateResponse, WorkshopPartsUsedResponse,
    WorkshopMechanicCreate, WorkshopMechanicUpdate, WorkshopMechanicResponse
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


@router.get("/", response_model=List[WorkshopOrderResponse])
async def get_workshop_orders(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    order_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(WorkshopOrder)
    if current_user.company_id:
        query = query.filter(WorkshopOrder.company_id == current_user.company_id)
    if status:
        query = query.filter(WorkshopOrder.status == status)
    if order_type:
        query = query.filter(WorkshopOrder.type == order_type)
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

    company = db.query(Company).filter(Company.id == current_user.company_id).first() if current_user.company_id else None

    title_style = ParagraphStyle('Title2', parent=styles['Heading1'], fontSize=16, spaceAfter=6)
    subtitle_style = ParagraphStyle('Subtitle2', parent=styles['Heading2'], fontSize=12, spaceAfter=4)
    normal_style = ParagraphStyle('Normal2', parent=styles['Normal'], fontSize=9, spaceAfter=2)
    small_style = ParagraphStyle('Small2', parent=styles['Normal'], fontSize=8)

    elements.append(Paragraph(company.name if company else "Taller", title_style))
    elements.append(Paragraph(f"Orden de Trabajo #{order.id}", subtitle_style))
    elements.append(Paragraph(f"Fecha: {order.created_at.strftime('%d/%m/%Y') if order.created_at else 'N/A'}", normal_style))
    elements.append(Paragraph(f"Tipo: {'Mantenimiento' if order.type == 'mantenimiento' else 'Reparación'}", normal_style))
    elements.append(Spacer(1, 12))

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

    if order.checklist:
        elements.append(Paragraph("CHECKLIST DE INGRESO", subtitle_style))
        cat_names = {'motor': 'Motor', 'frenos': 'Frenos', 'llantas': 'Llantas', 'luces': 'Luces',
                     'suspension': 'Suspensión', 'electrico': 'Eléctrico', 'transmision': 'Transmisión',
                     'general': 'General', 'carga': 'Carga'}
        grouped = {}
        for item in order.checklist:
            if item.item_category not in grouped:
                grouped[item.item_category] = []
            grouped[item.item_category].append(item)

        for cat, items in grouped.items():
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
            name = part.product.name if part.product else 'N/A'
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
    client_name = client.name if client else "______________________"
    assistants = order.assistant_names or ""
    line = f"Mecánico: {mech_name}    Cliente: {client_name}"
    if assistants:
        line += f"    Ayudantes: {assistants}"
    elements.append(Paragraph(line, normal_style))

    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=checklist-orden-{order.id}.pdf"}
    )
