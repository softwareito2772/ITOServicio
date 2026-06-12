from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from ..database import get_db
from ..models import (
    Client, Equipment, Product, Sale, Maintenance, Repair, Warranty,
    WorkshopOrder, WorkshopInvoice, CompanyModule, User
)
from ..schemas import DashboardStats
from ..auth import get_current_user

router = APIRouter()


def _get_company_modules(db: Session, company_id: int) -> list[str]:
    return [m.module_name for m in db.query(CompanyModule).filter(
        CompanyModule.company_id == company_id,
        CompanyModule.is_enabled == True
    ).all()]


@router.get("/", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    modules = _get_company_modules(db, current_user.company_id)
    cid = current_user.company_id
    first_day_of_month = date.today().replace(day=1)

    total_clients = 0
    total_equipment = 0
    total_products = 0
    low_stock_products = 0
    total_sales = 0
    sales_this_month = 0
    total_maintenance_cost = 0
    total_repair_cost = 0
    maintenance_cost_this_month = 0
    repair_cost_this_month = 0
    pending_maintenance = 0
    pending_repairs = 0
    active_warranties = 0
    inactive_clients_6_months = 0
    workshop_data = None

    if "clientes" in modules:
        total_clients = db.query(Client).filter(
            Client.is_active == True, Client.company_id == cid
        ).count()

        cutoff_date = datetime.now().date() - relativedelta(months=6)
        active_client_ids = db.query(Equipment.client_id).filter(
            Equipment.company_id == cid,
            Equipment.created_at >= cutoff_date
        ).distinct().all()
        active_ids = [c[0] for c in active_client_ids]
        if active_ids:
            inactive_clients_6_months = db.query(Client).filter(
                Client.is_active == True, Client.company_id == cid,
                ~Client.id.in_(active_ids)
            ).count()
        else:
            inactive_clients_6_months = total_clients

    if "equipos" in modules:
        total_equipment = db.query(Equipment).filter(
            Equipment.company_id == cid
        ).count()

    if "productos" in modules:
        total_products = db.query(Product).filter(
            Product.is_active == True, Product.company_id == cid
        ).count()
        low_stock_products = db.query(Product).filter(
            Product.is_active == True, Product.company_id == cid,
            Product.stock <= Product.stock_min
        ).count()

    if "ventas" in modules:
        total_sales = db.query(func.coalesce(func.sum(Sale.total), 0)).filter(
            Sale.company_id == cid
        ).scalar()
        sales_this_month = db.query(func.coalesce(func.sum(Sale.total), 0)).filter(
            Sale.company_id == cid, Sale.sale_date >= first_day_of_month
        ).scalar()

    if "mantenimiento" in modules:
        total_maintenance_cost = db.query(func.coalesce(func.sum(Maintenance.cost), 0)).filter(
            Maintenance.company_id == cid
        ).scalar()
        maintenance_cost_this_month = db.query(func.coalesce(func.sum(Maintenance.cost), 0)).filter(
            Maintenance.company_id == cid, Maintenance.start_date >= first_day_of_month
        ).scalar()
        pending_maintenance = db.query(Maintenance).filter(
            Maintenance.company_id == cid,
            Maintenance.status.in_(["pending", "in_progress"])
        ).count()

    if "reparaciones" in modules:
        total_repair_cost = db.query(func.coalesce(func.sum(Repair.total_cost), 0)).filter(
            Repair.company_id == cid
        ).scalar()
        repair_cost_this_month = db.query(func.coalesce(func.sum(Repair.total_cost), 0)).filter(
            Repair.company_id == cid, Repair.start_date >= first_day_of_month
        ).scalar()
        pending_repairs = db.query(Repair).filter(
            Repair.company_id == cid,
            Repair.status.in_(["pending", "in_progress"])
        ).count()

    if "garantias" in modules:
        active_warranties = db.query(Warranty).filter(
            Warranty.company_id == cid,
            Warranty.status == "active",
            Warranty.end_date >= date.today()
        ).count()

    total_combined_this_month = float(sales_this_month) + float(maintenance_cost_this_month) + float(repair_cost_this_month)

    if "taller" in modules:
        today = date.today()
        active_orders = db.query(WorkshopOrder).filter(
            WorkshopOrder.company_id == cid,
            WorkshopOrder.status.in_(["pending", "in_progress", "waiting_parts", "completed"])
        ).count()

        completed_today = db.query(WorkshopOrder).filter(
            WorkshopOrder.company_id == cid,
            WorkshopOrder.status == "delivered",
            func.date(WorkshopOrder.exit_datetime) == today
        ).count()

        pending_pickup = db.query(WorkshopOrder).filter(
            WorkshopOrder.company_id == cid,
            WorkshopOrder.status == "completed"
        ).count()

        from ..models import WorkshopVehicle
        avg_days = 0
        completed_orders_with_dates = db.query(WorkshopOrder).filter(
            WorkshopOrder.company_id == cid,
            WorkshopOrder.exit_datetime.isnot(None),
            WorkshopOrder.entry_datetime.isnot(None)
        ).all()
        if completed_orders_with_dates:
            total_days = sum((o.exit_datetime - o.entry_datetime).days for o in completed_orders_with_dates)
            avg_days = round(total_days / len(completed_orders_with_dates), 1)

        total_revenue = db.query(func.coalesce(func.sum(WorkshopInvoice.total), 0)).filter(
            WorkshopInvoice.company_id == cid,
            WorkshopInvoice.status.in_(["paid", "partially_paid"])
        ).scalar()

        pending_invoices = db.query(WorkshopInvoice).filter(
            WorkshopInvoice.company_id == cid,
            WorkshopInvoice.status == "pending"
        ).count()

        workshop_data = {
            "active_orders": active_orders,
            "completed_today": completed_today,
            "pending_pickup": pending_pickup,
            "avg_days_in_shop": round(float(avg_days), 1),
            "total_revenue": float(total_revenue),
            "pending_invoices": pending_invoices,
        }

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
        inactive_clients_6_months=inactive_clients_6_months,
        workshop=workshop_data,
    )


@router.get("/recent-activity")
async def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    modules = _get_company_modules(db, current_user.company_id)
    cid = current_user.company_id
    result = {}

    if "equipos" in modules:
        recent_equipment = db.query(Equipment).filter(
            Equipment.company_id == cid
        ).order_by(Equipment.created_at.desc()).limit(5).all()
        result["equipment"] = [{
            "id": e.id,
            "type": e.type_name,
            "model": f"{e.brand} {e.model}" if e.brand else e.model,
            "client": e.client.name if e.client else None,
            "status": e.status if e.status else None,
            "created_at": e.created_at
        } for e in recent_equipment]

    if "mantenimiento" in modules:
        recent_maintenance = db.query(Maintenance).filter(
            Maintenance.company_id == cid
        ).order_by(Maintenance.created_at.desc()).limit(5).all()
        result["maintenance"] = [{
            "id": m.id,
            "equipment": f"{m.equipment.brand} {m.equipment.model}" if m.equipment else None,
            "status": m.status if m.status else None,
            "created_at": m.created_at
        } for m in recent_maintenance]

    if "reparaciones" in modules:
        recent_repairs = db.query(Repair).filter(
            Repair.company_id == cid
        ).order_by(Repair.created_at.desc()).limit(5).all()
        result["repairs"] = [{
            "id": r.id,
            "equipment": f"{r.equipment.brand} {r.equipment.model}" if r.equipment else None,
            "status": r.status if r.status else None,
            "created_at": r.created_at
        } for r in recent_repairs]

    if "taller" in modules:
        recent_orders = db.query(WorkshopOrder).filter(
            WorkshopOrder.company_id == cid
        ).order_by(WorkshopOrder.created_at.desc()).limit(5).all()
        result["workshop"] = [{
            "id": o.id,
            "vehicle": f"{o.vehicle.brand} {o.vehicle.model}" if o.vehicle else None,
            "plate": o.vehicle.plate_number if o.vehicle else None,
            "status": o.status,
            "type": o.type,
            "created_at": o.created_at
        } for o in recent_orders]

    return result
