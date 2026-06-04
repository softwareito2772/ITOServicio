"""
Migración multi-tenant - Paso 2: Fix enum + super admin + migración de datos
"""
import psycopg2
import hashlib
import os

DATABASE_URL = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"

def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    hash_obj = hashlib.sha256((password + salt).encode())
    return f"{salt}${hash_obj.hexdigest()}"

def migrate():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    print("=== PASO 6a: Agregar 'super_admin' al enum userrole ===")
    cur.execute("SELECT enum_range(NULL::userrole)")
    current = cur.fetchone()[0]
    print(f"   Valores actuales: {current}")
    if 'super_admin' not in current:
        cur.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'super_admin';")
        print("   'super_admin' agregado al enum")
    else:
        print("   'super_admin' ya existe")

    print()
    print("=== PASO 6b: Crear super admin ===")
    superadmin_hash = hash_password("$Jafet2213$")
    cur.execute("SELECT id FROM users WHERE email = 'superadmin@itoservicio.com'")
    if not cur.fetchone():
        cur.execute("""
            INSERT INTO users (email, password_hash, name, role, company_id)
            VALUES ('superadmin@itoservicio.com', %s, 'Super Admin', 'super_admin', NULL);
        """, (superadmin_hash,))
        print("   Super admin creado: superadmin@itoservicio.com")
    else:
        print("   Super admin ya existe")

    print()
    print("=== PASO 7: Migrar datos existentes a company_id=1 ===")
    tables = [
        "users", "clients", "categories", "products",
        "inventory_movements", "sales", "sale_items",
        "equipment", "maintenance", "repairs",
        "warranties", "equipment_arrival_statuses"
    ]
    for table in tables:
        cur.execute(f"UPDATE {table} SET company_id = 1 WHERE company_id IS NULL")
        count = cur.rowcount
        print(f"   {table}: {count} registros migrados")

    print()
    print("=== VERIFICACIÓN FINAL ===")
    cur.execute("SELECT id, name, slug FROM companies")
    for row in cur.fetchall():
        print(f"   Empresa: id={row[0]}, name={row[1]}, slug={row[2]}")

    cur.execute("SELECT email, role, company_id FROM users")
    for row in cur.fetchall():
        print(f"   Usuario: {row[0]}, role={row[1]}, company_id={row[2]}")

    for table in ["clients", "categories", "products", "equipment", "maintenance", "repairs", "sales", "warranties"]:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        total = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {table} WHERE company_id = 1")
        with_company = cur.fetchone()[0]
        print(f"   {table}: {with_company}/{total} con company_id=1")

    print()
    print("=== MIGRACIÓN COMPLETADA ===")

    cur.close()
    conn.close()

if __name__ == "__main__":
    migrate()
