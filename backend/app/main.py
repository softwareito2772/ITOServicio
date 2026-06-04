from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base
from .models import User
from .routers import auth, users, clients, categories, products, inventory, sales, equipment, maintenance, repairs, warranties, reports, dashboard, arrival_statuses, companies

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="API para el sistema de gestión de servicios ITO",
    version="2.0.0"
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
    return {"message": "ITO Servicios API", "version": "2.0.0"}


@app.get("/api/debug/superadmin")
async def debug_superadmin():
    import traceback
    try:
        from .database import SessionLocal
        db = SessionLocal()
        user = db.query(User).filter(User.email == "superadmin@itoservicio.com").first()
        if not user:
            return {"error": "user not found"}
        
        role_raw = user.role
        role_type = type(role_raw).__name__
        role_value = role_raw.value if hasattr(role_raw, 'value') else str(role_raw)
        
        result = {
            "email": user.email,
            "role_type": role_type,
            "role_value": role_value,
            "company_id": user.company_id,
            "is_active": user.is_active,
        }
        
        from .auth import hash_password, verify_password
        test_hash = hash_password("test123")
        result["hash_works"] = verify_password("test123", test_hash)
        result["superadmin_password_works"] = verify_password("$Jafet2213$", user.password_hash)
        
        db.close()
        return result
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
