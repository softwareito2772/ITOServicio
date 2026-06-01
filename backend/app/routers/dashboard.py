from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from ..database import get_db
from ..models import Client, Equipment, Product, Sale, Maintenance, Repair, Warranty, User, EquipmentStatus
from ..schemas import DashboardStats
from ..auth import get_current_user

router = APIRouter()


@router.get("/", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_clients = db.query(Client).filter(Client.is_active == True).count()
    
    total_equipment = db.query(Equipment).count()
    
    total_products = db.query(Product).filter(Product.is_active == True).count()
    low_stock_products = db.query(Product).filter(
        Product.is_active == True,
        Product.stock <= Product.stock_min
    ).count()
    
    total_sales = db.query(func.coalesce(func.sum(Sale.total), 0)).scalar()
    total_maintenance_cost = db.query(func.coalesce(func.sum(Maintenance.cost), 0)).scalar()
    total_repair_cost = db.query(func.coalesce(func.sum(Repair.total_cost), 0)).scalar()
    
    first_day_of_month = date.today().replace(day=1)
    sales_this_month = db.query(func.coalesce(func.sum(Sale.total), 0)).filter(
        Sale.sale_date >= first_day_of_month
    ).scalar()
    maintenance_cost_this_month = db.query(func.coalesce(func.sum(Maintenance.cost), 0)).filter(
        Maintenance.start_date >= first_day_of_month
    ).scalar()
    repair_cost_this_month = db.query(func.coalesce(func.sum(Repair.total_cost), 0)).filter(
        Repair.start_date >= first_day_of_month
    ).scalar()
    total_combined_this_month = float(sales_this_month) + float(maintenance_cost_this_month) + float(repair_cost_this_month)
    
    pending_maintenance = db.query(Maintenance).filter(
        Maintenance.status.in_([EquipmentStatus.PENDING, EquipmentStatus.IN_PROGRESS])
    ).count()
    
    pending_repairs = db.query(Repair).filter(
        Repair.status.in_([EquipmentStatus.PENDING, EquipmentStatus.IN_PROGRESS])
    ).count()
    
    active_warranties = db.query(Warranty).filter(
        Warranty.status == "active",
        Warranty.end_date >= date.today()
    ).count()
    
    cutoff_date = datetime.now().date() - relativedelta(months=6)
    active_client_ids = db.query(Equipment.client_id).filter(
        Equipment.created_at >= cutoff_date
    ).distinct().all()
    active_ids = [c[0] for c in active_client_ids]
    
    if active_ids:
        inactive_clients = db.query(Client).filter(
            Client.is_active == True,
            ~Client.id.in_(active_ids)
        ).count()
    else:
        inactive_clients = 0
    
    return DashboardStats(
        total_clients=total_clients,
        total_equipment=total_equipment,
        total_products=total_products,
        low_stock_products=low_stock_products,
        total_sales=float(total_sales),
        sales_this_month=float(sales_this_month),
        total_maintenance_cost=float(total_maintenance_cost),
        total_repair_cost=float(total_repair_cost),
        maintenance_cost_this_month=float(maintenance_cost_this_month),
        repair_cost_this_month=float(repair_cost_this_month),
        total_combined_this_month=total_combined_this_month,
        pending_maintenance=pending_maintenance,
        pending_repairs=pending_repairs,
        active_warranties=active_warranties,
        inactive_clients_6_months=inactive_clients
    )


@router.get("/recent-activity")
async def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recent_equipment = db.query(Equipment).order_by(
        Equipment.created_at.desc()
    ).limit(5).all()
    
    recent_maintenance = db.query(Maintenance).order_by(
        Maintenance.created_at.desc()
    ).limit(5).all()
    
    recent_repairs = db.query(Repair).order_by(
        Repair.created_at.desc()
    ).limit(5).all()
    
    return {
        "equipment": [{
            "id": e.id,
            "type": e.type_name,
            "model": f"{e.brand} {e.model}" if e.brand else e.model,
            "client": e.client.name if e.client else None,
            "status": e.status.value if e.status else None,
            "created_at": e.created_at
        } for e in recent_equipment],
        "maintenance": [{
            "id": m.id,
            "equipment": f"{m.equipment.brand} {m.equipment.model}" if m.equipment else None,
            "status": m.status.value if m.status else None,
            "created_at": m.created_at
        } for m in recent_maintenance],
        "repairs": [{
            "id": r.id,
            "equipment": f"{r.equipment.brand} {r.equipment.model}" if r.equipment else None,
            "status": r.status.value if r.status else None,
            "created_at": r.created_at
        } for r in recent_repairs]
    }
