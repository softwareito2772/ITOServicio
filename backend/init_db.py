import os
import sys

def init_db():
    from app.database import engine, Base
    from app.models import User, Client, Category, Product, Equipment, Maintenance, Repair, Warranty, EquipmentArrivalStatus

    print("Creando tablas...")
    Base.metadata.create_all(bind=engine)
    print("[OK] Tablas creadas")

def seed_data():
    from app.database import SessionLocal
    from app.models import User, Client, Category, Product, Equipment, EquipmentStatus, ServiceLocation, WarrantyType, EquipmentArrivalStatus
    from app.auth import hash_password
    from datetime import date, timedelta
    import random

    db = SessionLocal()

    print("Verificando datos existentes...")
    if db.query(User).first():
        print("Ya existen datos. Saltando...")
        db.close()
        return

    print("Creando usuario admin...")
    admin = User(
        email="admin@ito.com",
        password_hash=hash_password("admin123"),
        name="Administrador",
        role="admin"
    )
    db.add(admin)

    print("Creando usuarios de prueba...")
    users = [
        User(email="tecnico1@ito.com", password_hash=hash_password("tecnico123"), name="Carlos Lopez", role="user"),
        User(email="tecnico2@ito.com", password_hash=hash_password("tecnico123"), name="Maria Garcia", role="user"),
    ]
    for u in users:
        db.add(u)

    print("Creando categorias...")
    categories = [
        Category(name="Laptop", type="equipment", description="Equipos portatiles"),
        Category(name="Celular", type="equipment", description="Telefonos moviles"),
        Category(name="Desktop", type="equipment", description="Computadoras de escritorio"),
        Category(name="Bomba de agua", type="equipment", description="Bombas y sistemas de agua"),
        Category(name="Panel solar", type="equipment", description="Paneles y equipos solares"),
        Category(name="Repuestos", type="product", description="Repuestos y componentes"),
        Category(name="Accesorios", type="product", description="Accesorios varios"),
    ]
    for c in categories:
        db.add(c)

    print("Creando clientes de prueba...")
    test_clients = [
        Client(name="Juan Perez", phone="555-1234", email="juan@email.com", address="Av. Principal 123"),
        Client(name="Maria Lopez", phone="555-5678", email="maria@email.com", address="Calle 2 #45"),
        Client(name="Pedro Garcia", phone="555-9012", email="pedro@email.com", address="Blvd. Central 78"),
        Client(name="Ana Martinez", phone="555-3456", email="ana@email.com", address="Av. Norte 90"),
        Client(name="Luis Rodriguez", phone="555-7890", email="luis@email.com", address="Calle Sur 12"),
    ]
    for c in test_clients:
        db.add(c)

    db.flush()

    print("Creando productos de prueba...")
    test_products = [
        Product(name="Pantalla LCD 15.6", price=1500, stock=5, stock_min=3, category_id=categories[5].id),
        Product(name="Bateria Laptop", price=800, stock=2, stock_min=5, category_id=categories[5].id),
        Product(name="Teclado USB", price=350, stock=8, stock_min=3, category_id=categories[6].id),
        Product(name="Mouse Inalambrico", price=250, stock=0, stock_min=5, category_id=categories[6].id),
        Product(name="Cargador Universal", price=450, stock=3, stock_min=2, category_id=categories[5].id),
        Product(name="Disco SSD 256GB", price=1200, stock=4, stock_min=3, category_id=categories[5].id),
        Product(name="Memoria RAM 8GB", price=600, stock=6, stock_min=3, category_id=categories[5].id),
        Product(name="Cable HDMI 2m", price=150, stock=10, stock_min=5, category_id=categories[6].id),
        Product(name="Funda Laptop 15", price=300, stock=2, stock_min=3, category_id=categories[6].id),
        Product(name="Hub USB", price=400, stock=1, stock_min=3, category_id=categories[6].id),
    ]
    for p in test_products:
        db.add(p)

    db.flush()

    print("Creando equipos de prueba...")
    test_equipment = [
        Equipment(client_id=test_clients[0].id, category_id=categories[0].id, type_name="Laptop", brand="Dell", model="Inspiron 15", serial_number="DL2024001", service_location=ServiceLocation.LOCAL, status=EquipmentStatus.PENDING, purchase_date=date.today() - timedelta(days=30)),
        Equipment(client_id=test_clients[1].id, category_id=categories[1].id, type_name="Celular", brand="Samsung", model="Galaxy A54", serial_number="SM2024002", service_location=ServiceLocation.SITIO, status=EquipmentStatus.IN_PROGRESS, purchase_date=date.today() - timedelta(days=60)),
        Equipment(client_id=test_clients[2].id, category_id=categories[2].id, type_name="Desktop", brand="HP", model="Pavilion", serial_number="HP2024003", service_location=ServiceLocation.LOCAL, status=EquipmentStatus.COMPLETED, purchase_date=date.today() - timedelta(days=90)),
        Equipment(client_id=test_clients[3].id, category_id=categories[3].id, type_name="Bomba de agua", brand="Rotoplas", model="1/2 HP", serial_number="RP2024004", service_location=ServiceLocation.SITIO, status=EquipmentStatus.PENDING),
        Equipment(client_id=test_clients[4].id, category_id=categories[0].id, type_name="Laptop", brand="Lenovo", model="ThinkPad E14", serial_number="LN2024005", service_location=ServiceLocation.LOCAL, status=EquipmentStatus.IN_PROGRESS, purchase_date=date.today() - timedelta(days=45)),
        Equipment(client_id=test_clients[0].id, category_id=categories[1].id, type_name="Celular", brand="iPhone", model="12", serial_number="AP2024006", service_location=ServiceLocation.SITIO, status=EquipmentStatus.PENDING, manufacturer_warranty="AppleCare+"),
        Equipment(client_id=test_clients[1].id, category_id=categories[4].id, type_name="Panel solar", brand="Canadian Solar", model="400W", serial_number="CS2024007", service_location=ServiceLocation.SITIO, status=EquipmentStatus.COMPLETED),
        Equipment(client_id=test_clients[2].id, category_id=categories[0].id, type_name="Laptop", brand="ASUS", model="VivoBook 15", serial_number="AS2024008", service_location=ServiceLocation.LOCAL, status=EquipmentStatus.DELIVERED),
        Equipment(client_id=test_clients[3].id, category_id=categories[3].id, type_name="Bomba de agua", brand="Pedrollo", model="0.75 HP", serial_number="PD2024009", service_location=ServiceLocation.LOCAL, status=EquipmentStatus.PENDING),
        Equipment(client_id=test_clients[4].id, category_id=categories[1].id, type_name="Celular", brand="Xiaomi", model="Redmi Note 12", serial_number="XM2024010", service_location=ServiceLocation.SITIO, status=EquipmentStatus.IN_PROGRESS),
    ]
    for e in test_equipment:
        db.add(e)

    db.flush()

    print("Creando estados de llegada...")
    arrival_statuses = [
        EquipmentArrivalStatus(name="Danado severo", description="Equipo no enciende o falla critica", is_default=True),
        EquipmentArrivalStatus(name="Danado moderado", description="Funciona parcialmente", is_default=True),
        EquipmentArrivalStatus(name="Funcionando parcialmente", description="Enciende pero con problemas", is_default=True),
        EquipmentArrivalStatus(name="Pantalla rota", description="Solo problema de pantalla", is_default=True),
        EquipmentArrivalStatus(name="Sin arranque", description="No inicia el sistema operativo", is_default=True),
        EquipmentArrivalStatus(name="Otros", description="Otra condicion no especificada", is_default=True),
    ]
    for s in arrival_statuses:
        db.add(s)

    db.commit()
    print("[OK] Datos de prueba creados exitosamente!")
    print("")
    print("Credenciales de prueba:")
    print("   Admin: admin@ito.com / admin123")
    print("   Tecnico 1: tecnico1@ito.com / tecnico123")
    print("   Tecnico 2: tecnico2@ito.com / tecnico123")

    db.close()

def delete_demo_data():
    from app.database import SessionLocal, engine
    from sqlalchemy import text

    db = SessionLocal()
    print("Eliminando datos de prueba...")

    tables = ['inventory_movements', 'maintenance_images', 'repair_images', 'warranties', 'repairs', 'maintenance', 'sale_items', 'sales', 'equipment', 'products', 'categories', 'clients', 'users', 'equipment_arrival_statuses']

    for table in tables:
        try:
            db.execute(text(f"DELETE FROM {table}"))
            print(f"  [OK] {table}")
        except:
            pass

    db.commit()
    db.close()
    print("[OK] Datos eliminados")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "delete":
        delete_demo_data()
    else:
        init_db()
        seed_data()
