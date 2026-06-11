from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from sqlalchemy import text
from .config import settings
from .database import engine, Base
from .routers import auth, users, clients, categories, products, inventory, sales, equipment, maintenance, repairs, warranties, reports, dashboard, arrival_statuses, companies, workshop

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    cols = [
        ("workshop_parts_used", "workshop_inventory_id", "INTEGER"),
        ("workshop_parts_used", "custom_name", "VARCHAR(255)"),
    ]
    with engine.connect() as conn:
        for table, col, ctype in cols:
            try:
                result = conn.execute(text(
                    f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name='{col}'"
                ))
                if not result.fetchone():
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ctype}"))
                    conn.commit()
                    logger.info(f"Migration: added {table}.{col}")
                else:
                    logger.info(f"Migration: {table}.{col} already exists")
            except Exception as e:
                logger.error(f"Migration error {table}.{col}: {e}")

@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(bind=engine)
    run_migrations()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="API para el sistema de servicios ITO",
    version="3.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(companies.router, prefix="/api/companies", tags=["Empresas"])
app.include_router(users.router, prefix="/api/users", tags=["Usuarios"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clientes"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categorías"])
app.include_router(products.router, prefix="/api/products", tags=["Productos"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventario"])
app.include_router(sales.router, prefix="/api/sales", tags=["Ventas"])
app.include_router(equipment.router, prefix="/api/equipment", tags=["Equipos"])
app.include_router(maintenance.router, prefix="/api/maintenance", tags=["Mantenimiento"])
app.include_router(repairs.router, prefix="/api/repairs", tags=["Reparaciones"])
app.include_router(warranties.router, prefix="/api/warranties", tags=["Garantías"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reportes"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(arrival_statuses.router, prefix="/api/arrival-statuses", tags=["Estados de llegada"])
app.include_router(workshop.router, prefix="/api/workshop", tags=["Taller"])


@app.get("/")
async def root():
    return {"message": "ITO Servicios API", "version": "2.1.0"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
