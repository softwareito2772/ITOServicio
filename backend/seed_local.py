"""
Script para crear la DB local con soporte multi-tenant.
Ejecutar una vez: python seed_local.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, Base, SessionLocal
from app.models import (
    User, UserRole, Client, Category, Product, Equipment,
    Maintenance, Repair, Warranty, Sale, SaleItem,
    InventoryMovement, EquipmentArrivalStatus,
    Company, CompanyModule, AVAILABLE_MODULES
)
from app.auth import hash_password
from datetime import date, datetime

def seed():
    print("=== Creando tablas locales ===")
    Base.metadata.create_all(bind=engine)
    print("   Tablas creadas OK")

    db = SessionLocal()

    # Verificar si ya hay datos
    if db.query(User).first():
        print("   DB ya tiene datos, saltando seed")
        db.close()
        return

    # Crear empresa ITO
    print("1. Creando empresa ITO...")
    company = Company(
        name="ITO Servicios",
        slug="ito",
        email_domain="ito.com",
        primary_color="#7C9CBF",
        secondary_color="#B4C7E7",
        description="Empresa de servicios de paneles solares, mantenimiento y reparaciones",
    )
    db.add(company)
    db.flush()

    # Habilitar módulos
    print("2. Habilitando módulos...")
    for mod in AVAILABLE_MODULES:
        db.add(CompanyModule(company_id=company.id, module_name=mod, is_enabled=True))

    # Crear super admin
    print("3. Creando super admin...")
    super_admin = User(
        email="superadmin@itoservicio.com",
        password_hash=hash_password("$Jafet2213$"),
        name="Super Admin",
        role=UserRole.SUPER_ADMIN,
        company_id=None,
    )
    db.add(super_admin)

    # Crear admin ITO
    print("4. Creando admin ITO...")
    admin = User(
        email="admin@ito.com",
        password_hash=hash_password("admin123"),
        name="Admin ITO",
        role=UserRole.ADMIN,
        company_id=company.id,
    )
    db.add(admin)

    # Crear técnicos
    print("5. Creando técnicos...")
    t1 = User(
        email="tecnico1@ito.com",
        password_hash=hash_password("tecnico123"),
        name="Técnico 1",
        role=UserRole.USER,
        company_id=company.id,
    )
    t2 = User(
        email="tecnico2@ito.com",
        password_hash=hash_password("tecnico123"),
        name="Técnico 2",
        role=UserRole.USER,
        company_id=company.id,
    )
    db.add_all([t1, t2])

    # Crear clientes
    print("6. Creando clientes...")
    clients = [
        Client(name="Juan Pérez", phone="555-0101", email="juan@email.com", company_id=company.id),
        Client(name="María López", phone="555-0102", email="maria@email.com", company_id=company.id),
        Client(name="Carlos García", phone="555-0103", company_id=company.id),
    ]
    db.add_all(clients)
    db.flush()

    # Crear categorías
    print("7. Creando categorías...")
    cats = [
        Category(name="Paneles Solares", type="equipment", company_id=company.id),
        Category(name="Herramientas", type="equipment", company_id=company.id),
        Category(name="Electrónica", type="product", company_id=company.id),
    ]
    db.add_all(cats)
    db.flush()

    db.commit()
    db.close()
    print()
    print("=== DB LOCAL CREADA ===")
    print("Credenciales:")
    print("  Super Admin: superadmin@itoservicio.com / $Jafet2213$")
    print("  Admin ITO:   admin@ito.com / admin123")
    print("  Técnico 1:   tecnico1@ito.com / tecnico123")

if __name__ == "__main__":
    seed()
