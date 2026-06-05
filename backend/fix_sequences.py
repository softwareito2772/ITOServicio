import psycopg2

RENDER_DB_URL = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"
conn = psycopg2.connect(RENDER_DB_URL)
conn.autocommit = True
cur = conn.cursor()

# 1. Fix is_active NULL on companies
print("=== Fix companies is_active ===")
cur.execute("UPDATE companies SET is_active = true WHERE is_active IS NULL")
print(f"  Fixed {cur.rowcount} rows")

# 2. Fix all sequences
tables = [
    ("clients", "clients_id_seq"),
    ("categories", "categories_id_seq"),
    ("products", "products_id_seq"),
    ("equipment", "equipment_id_seq"),
    ("sales", "sales_id_seq"),
    ("sale_items", "sale_items_id_seq"),
    ("maintenance", "maintenance_id_seq"),
    ("repairs", "repairs_id_seq"),
    ("warranties", "warranties_id_seq"),
    ("users", "users_id_seq"),
    ("companies", "companies_id_seq"),
    ("company_modules", "company_modules_id_seq"),
    ("inventory_movements", "inventory_movements_id_seq"),
    ("maintenance_images", "maintenance_images_id_seq"),
    ("repair_images", "repair_images_id_seq"),
    ("equipment_arrival_statuses", "equipment_arrival_statuses_id_seq"),
]

print("\n=== Fix sequences ===")
for table, seq in tables:
    try:
        cur.execute(f"SELECT setval('{seq}', (SELECT COALESCE(MAX(id), 1) FROM {table}))")
        print(f"  {seq} -> {cur.fetchone()[0]}")
    except Exception as e:
        print(f"  {seq}: {e}")

# 3. Also fix is_active on ALL tables where it might be NULL
print("\n=== Fix is_active NULLs ===")
for t in ["users", "clients", "categories", "products", "companies"]:
    try:
        cur.execute(f"UPDATE {t} SET is_active = true WHERE is_active IS NULL")
        if cur.rowcount > 0:
            print(f"  Fixed {cur.rowcount} NULL is_active in {t}")
    except:
        pass

cur.close()
conn.close()
print("\nDone!")
