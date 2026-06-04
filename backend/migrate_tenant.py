"""
Migración multi-tenant para Render PostgreSQL
Ejecutar una sola vez para agregar company_id a todas las tablas
"""
import psycopg2
import os
from datetime import datetime
from passlib.context import CryptContext

DATABASE_URL = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def migrate():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    print("=== MIGRACIÓN MULTI-TENANT ===")
    print(f"Fecha: {datetime.now()}")
    print()

    # Paso 1: Crear tabla companies
    print("1. Creando tabla 'companies'...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(50) UNIQUE NOT NULL,
            logo_url TEXT,
            email_domain VARCHAR(100),
            primary_color VARCHAR(7) DEFAULT '#7C9CBF',
            secondary_color VARCHAR(7) DEFAULT '#B4C7E7',
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    print("   OK")

    # Paso 2: Crear tabla company_modules
    print("2. Creando tabla 'company_modules'...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS company_modules (
            id SERIAL PRIMARY KEY,
            company_id INTEGER REFERENCES companies(id) NOT NULL,
            module_name VARCHAR(50) NOT NULL,
            is_enabled BOOLEAN DEFAULT TRUE
        );
    """)
    print("   OK")

    # Paso 3: Agregar company_id a tablas existentes (si no existe)
    tables_needing_company_id = [
        "users", "clients", "categories", "products",
        "inventory_movements", "sales", "sale_items",
        "equipment", "maintenance", "repairs",
        "warranties", "equipment_arrival_statuses"
    ]

    print("3. Agregando columnas 'company_id'...")
    for table in tables_needing_company_id:
        cur.execute(f"""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = '{table}' AND column_name = 'company_id';
        """)
        if not cur.fetchone():
            cur.execute(f"""
                ALTER TABLE {table}
                ADD COLUMN company_id INTEGER REFERENCES companies(id);
            """)
            print(f"   + {table}.company_id")
        else:
            print(f"   ~ {table}.company_id (ya existe)")

    # Paso 4: Crear empresa ITO
    print()
    print("4. Creando empresa ITO (company_id=1)...")
    cur.execute("SELECT id FROM companies WHERE slug = 'ito'")
    if not cur.fetchone():
        cur.execute("""
            INSERT INTO companies (name, slug, email_domain, primary_color, secondary_color, description)
            VALUES ('ITO Servicios', 'ito', 'ito.com', '#7C9CBF', '#B4C7E7', 'Empresa de servicios de paneles solares, mantenimiento y reparaciones')
            RETURNING id;
        """)
        company_id = cur.fetchone()[0]
        print(f"   Creada empresa ITO con id={company_id}")
    else:
        cur.execute("SELECT id FROM companies WHERE slug = 'ito'")
        company_id = cur.fetchone()[0]
        print(f"   Empresa ITO ya existe con id={company_id}")

    # Paso 5: Habilitar todos los módulos para ITO
    print("5. Habilitando módulos para ITO...")
    modules = ["ventas", "mantenimiento", "reparaciones", "equipos", "productos", "clientes", "garantias", "reportes", "inventario"]
    for mod in modules:
        cur.execute("""
            INSERT INTO company_modules (company_id, module_name, is_enabled)
            VALUES (%s, %s, TRUE)
            ON CONFLICT DO NOTHING;
        """, (company_id, mod))
    print(f"   {len(modules)} módulos habilitados")

    # Paso 6: Crear super admin
    print("6. Creando super admin...")
    superadmin_hash = pwd_context.hash("$Jafet2213$")
    cur.execute("SELECT id FROM users WHERE email = 'superadmin@itoservicio.com'")
    if not cur.fetchone():
        cur.execute("""
            INSERT INTO users (email, password_hash, name, role, company_id)
            VALUES ('superadmin@itoservicio.com', %s, 'Super Admin', 'super_admin', NULL);
        """, (superadmin_hash,))
        print("   Super admin creado: superadmin@itoservicio.com")
    else:
        print("   Super admin ya existe")

    # Paso 7: Migrar datos existentes a company_id=1
    print("7. Migrando datos existentes a company_id=1...")
    for table in tables_needing_company_id:
        if table == "users":
            # Los usuarios existentes (sin super_admin) van a ITO
            cur.execute(f"""
                UPDATE {table} SET company_id = {company_id}
                WHERE company_id IS NULL;
            """)
        else:
            cur.execute(f"""
                UPDATE {table} SET company_id = {company_id}
                WHERE company_id IS NULL;
            """)
        count = cur.rowcount
        print(f"   {table}: {count} registros migrados")

    # Paso 8: Asignar company_id a usuarios basándose en sus registros
    print("8. Asignando company_id a usuarios basándose en datos...")
    cur.execute("""
        UPDATE users u SET company_id = (
            SELECT DISTINCT s.company_id FROM sales s WHERE s.created_by = u.id
            UNION
            SELECT DISTINCT m.company_id FROM maintenance m WHERE m.technician_id = u.id
            UNION
            SELECT DISTINCT r.company_id FROM repairs r WHERE r.technician_id = u.id
            LIMIT 1
        )
        WHERE u.company_id IS NULL AND u.role != 'super_admin';
    """)
    count = cur.rowcount
    print(f"   {count} usuarios actualizados")

    # Paso 9: Verificación final
    print()
    print("=== VERIFICACIÓN ===")
    cur.execute("SELECT COUNT(*) FROM companies")
    print(f"Empresas: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM company_modules WHERE company_id = %s", (company_id,))
    print(f"Módulos ITO: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM users WHERE role = 'super_admin'")
    print(f"Super admins: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM users WHERE company_id = %s", (company_id,))
    print(f"Usuarios ITO: {cur.fetchone()[0]}")
    for table in ["clients", "categories", "products", "equipment", "maintenance", "repairs", "sales", "warranties"]:
        cur.execute(f"SELECT COUNT(*) FROM {table} WHERE company_id = %s", (company_id,))
        print(f"  {table}: {cur.fetchone()[0]}")

    print()
    print("=== MIGRACIÓN COMPLETADA ===")

    cur.close()
    conn.close()

if __name__ == "__main__":
    migrate()
