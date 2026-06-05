from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import settings
from .database import engine, Base
from .routers import auth, users, clients, categories, products, inventory, sales, equipment, maintenance, repairs, warranties, reports, dashboard, arrival_statuses, companies

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="API para el sistema de servicios ITO",
    version="2.1.0"
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__, "trace": traceback.format_exc()[-500:]}
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


@app.get("/")
async def root():
    return {"message": "ITO Servicios API", "version": "2.1.0"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
