from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from openpyxl import Workbook
from io import BytesIO
from fastapi.responses import StreamingResponse
from ..database import get_db
from ..models import Client, Equipment, Product, Sale, Maintenance, Repair, Warranty, User
from ..auth import get_current_user

router = APIRouter()


@router.get("/sales")
async def report_sales(
    start_date: date = None,
    end_date: date = None,
    client_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Sale).filter(Sale.company_id == current_user.company_id)
    
    if start_date:
        query = query.filter(Sale.sale_date >= start_date)
    if end_date:
        query = query.filter(Sale.sale_date <= end_date)
    if client_id:
        query = query.filter(Sale.client_id == client_id)
    
    sales = query.order_by(Sale.sale_date.desc()).all()
    
    total = sum(s.total for s in sales)
    
    return {
        "total": total,
        "count": len(sales),
        "sales": [{
            "id": s.id,
            "client": s.client.name if s.client else None,
            "total": s.total,
            "date": s.sale_date,
            "status": s.status
        } for s in sales]
    }


@router.get("/maintenance")
async def report_maintenance(
    start_date: date = None,
    end_date: date = None,
    technician_id: int = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Maintenance).filter(Maintenance.company_id == current_user.company_id)
    
    if start_date:
        query = query.filter(Maintenance.start_date >= start_date)
    if end_date:
        query = query.filter(Maintenance.start_date <= end_date)
    if technician_id:
        query = query.filter(Maintenance.technician_id == technician_id)
    if status:
        query = query.filter(Maintenance.status == status)
    
    maintenance = query.order_by(Maintenance.start_date.desc()).all()
    
    return {
        "count": len(maintenance),
        "maintenance": [{
            "id": m.id,
            "equipment": f"{m.equipment.brand} {m.equipment.model}" if m.equipment else None,
            "client": m.equipment.client.name if m.equipment and m.equipment.client else None,
            "technician": m.technician.name if m.technician else None,
            "description": m.description,
            "start_date": m.start_date,
            "end_date": m.end_date,
                "status": m.status if m.status else None
        } for m in maintenance]
    }


@router.get("/repairs")
async def report_repairs(
    start_date: date = None,
    end_date: date = None,
    technician_id: int = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Repair).filter(Repair.company_id == current_user.company_id)
    
    if start_date:
        query = query.filter(Repair.start_date >= start_date)
    if end_date:
        query = query.filter(Repair.start_date <= end_date)
    if technician_id:
        query = query.filter(Repair.technician_id == technician_id)
    if status:
        query = query.filter(Repair.status == status)
    
    repairs = query.order_by(Repair.start_date.desc()).all()
    
    total_cost = sum(r.total_cost for r in repairs)
    
    return {
        "total_cost": total_cost,
        "count": len(repairs),
        "repairs": [{
            "id": r.id,
            "equipment": f"{r.equipment.brand} {r.equipment.model}" if r.equipment else None,
            "client": r.equipment.client.name if r.equipment and r.equipment.client else None,
            "technician": r.technician.name if r.technician else None,
            "diagnosis": r.diagnosis,
            "total_cost": r.total_cost,
            "start_date": r.start_date,
            "end_date": r.end_date,
                "status": r.status if r.status else None
        } for r in repairs]
    }


@router.get("/inventory")
async def report_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    products = db.query(Product).filter(Product.is_active == True, Product.company_id == current_user.company_id).order_by(Product.name).all()
    
    low_stock = [p for p in products if p.stock <= p.stock_min]
    
    return {
        "total_products": len(products),
        "low_stock_count": len(low_stock),
        "low_stock": [{
            "id": p.id,
            "name": p.name,
            "stock": p.stock,
            "stock_min": p.stock_min,
            "price": p.price
        } for p in low_stock],
        "products": [{
            "id": p.id,
            "name": p.name,
            "stock": p.stock,
            "stock_min": p.stock_min,
            "price": p.price,
            "category": p.category.name if p.category else None
        } for p in products]
    }


@router.get("/clients/inactive")
async def report_inactive_clients(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cutoff_date = datetime.now().date() - relativedelta(months=months)
    
    active_client_ids = db.query(Equipment.client_id).filter(
        Equipment.company_id == current_user.company_id,
        Equipment.created_at >= cutoff_date
    ).distinct().all()
    active_ids = [c[0] for c in active_client_ids]
    
    if active_ids:
        clients = db.query(Client).filter(
            Client.is_active == True,
            Client.company_id == current_user.company_id,
            ~Client.id.in_(active_ids)
        ).order_by(Client.created_at.desc()).all()
    else:
        clients = db.query(Client).filter(
            Client.is_active == True,
            Client.company_id == current_user.company_id
        ).order_by(Client.created_at.desc()).all()
    
    return {
        "count": len(clients),
        "months_threshold": months,
        "clients": [{
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "email": c.email,
            "created_at": c.created_at
        } for c in clients]
    }


@router.get("/equipment/{client_id}/history")
async def report_equipment_history(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    equipment = db.query(Equipment).filter(
        Equipment.client_id == client_id,
        Equipment.company_id == current_user.company_id
    ).all()
    
    client = db.query(Client).filter(Client.id == client_id).first()
    
    result = []
    for eq in equipment:
        maintenance = db.query(Maintenance).filter(
            Maintenance.equipment_id == eq.id
        ).order_by(Maintenance.start_date.desc()).all()
        
        repairs = db.query(Repair).filter(
            Repair.equipment_id == eq.id
        ).order_by(Repair.start_date.desc()).all()
        
        result.append({
            "id": eq.id,
            "type_name": eq.type_name,
            "brand": eq.brand,
            "model": eq.model,
            "serial_number": eq.serial_number,
            "arrival_date": eq.arrival_date,
            "status": eq.status if eq.status else None,
            "maintenance": [{
                "id": m.id,
                "description": m.description,
                "start_date": m.start_date,
                "end_date": m.end_date,
            "status": m.status if m.status else None
            } for m in maintenance],
            "repairs": [{
                "id": r.id,
                "diagnosis": r.diagnosis,
                "solution": r.solution,
                "total_cost": r.total_cost,
                "start_date": r.start_date,
                "end_date": r.end_date,
            "status": r.status if r.status else None
            } for r in repairs]
        })
    
    return {
        "client": {
            "id": client.id,
            "name": client.name,
            "phone": client.phone
        } if client else None,
        "equipment": result
    }


@router.get("/export/{report_type}")
async def export_report(
    report_type: str,
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    wb = Workbook()
    ws = wb.active
    
    if report_type == "sales":
        query = db.query(Sale).filter(Sale.company_id == current_user.company_id)
        if start_date:
            query = query.filter(Sale.sale_date >= start_date)
        if end_date:
            query = query.filter(Sale.sale_date <= end_date)
        sales = query.all()
        
        ws.append(["ID", "Cliente", "Total", "Fecha", "Estado"])
        for s in sales:
            ws.append([s.id, s.client.name if s.client else "", s.total, str(s.sale_date), s.status])
    
    elif report_type == "inventory":
        products = db.query(Product).filter(Product.is_active == True, Product.company_id == current_user.company_id).all()
        ws.append(["ID", "Producto", "Stock", "Stock Mínimo", "Precio"])
        for p in products:
            ws.append([p.id, p.name, p.stock, p.stock_min, p.price])
    
    elif report_type == "maintenance":
        query = db.query(Maintenance).filter(Maintenance.company_id == current_user.company_id)
        if start_date:
            query = query.filter(Maintenance.start_date >= start_date)
        if end_date:
            query = query.filter(Maintenance.start_date <= end_date)
        maintenance = query.all()
        
        ws.append(["ID", "Equipo", "Cliente", "Técnico", "Descripción", "Fecha Inicio", "Fecha Fin", "Estado"])
        for m in maintenance:
            ws.append([
                m.id,
                f"{m.equipment.brand} {m.equipment.model}" if m.equipment else "",
                m.equipment.client.name if m.equipment and m.equipment.client else "",
                m.technician.name if m.technician else "",
                m.description,
                str(m.start_date) if m.start_date else "",
                str(m.end_date) if m.end_date else "",
                m.status if m.status else ""
            ])
    
    elif report_type == "repairs":
        query = db.query(Repair).filter(Repair.company_id == current_user.company_id)
        if start_date:
            query = query.filter(Repair.start_date >= start_date)
        if end_date:
            query = query.filter(Repair.start_date <= end_date)
        repairs = query.all()
        
        ws.append(["ID", "Equipo", "Cliente", "Técnico", "Diagnóstico", "Solución", "Costo", "Fecha Inicio", "Fecha Fin", "Estado"])
        for r in repairs:
            ws.append([
                r.id,
                f"{r.equipment.brand} {r.equipment.model}" if r.equipment else "",
                r.equipment.client.name if r.equipment and r.equipment.client else "",
                r.technician.name if r.technician else "",
                r.diagnosis,
                r.solution,
                r.total_cost,
                str(r.start_date) if r.start_date else "",
                str(r.end_date) if r.end_date else "",
                r.status if r.status else ""
            ])
    
    elif report_type == "clients":
        clients = db.query(Client).filter(Client.is_active == True, Client.company_id == current_user.company_id).all()
        ws.append(["ID", "Nombre", "Teléfono", "Email", "Dirección"])
        for c in clients:
            ws.append([c.id, c.name, c.phone, c.email or "", c.address or ""])
    
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={report_type}_report.xlsx"}
    )
