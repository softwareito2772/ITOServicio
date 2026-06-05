import psycopg2

RENDER_DB_URL = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"
conn = psycopg2.connect(RENDER_DB_URL)
conn.autocommit = True
cur = conn.cursor()

tables = ['clients','categories','products','inventory_movements','sales','sale_items','equipment','maintenance','maintenance_images','repairs','repair_images','warranties','equipment_arrival_statuses','users','companies','company_modules']

for t in tables:
    cur.execute("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name=%s AND column_name='created_at'", (t,))
    row = cur.fetchone()
    if row:
        print(f"{t}.created_at: nullable={row[1]} default={row[2]}")

# Add NOW() defaults to all tables missing them
print("\n--- Adding defaults ---")
for t in tables:
    cur.execute("SELECT column_name, column_default FROM information_schema.columns WHERE table_name=%s AND column_name='created_at'", (t,))
    row = cur.fetchone()
    if row and row[1] is None:
        cur.execute(f'ALTER TABLE {t} ALTER COLUMN created_at SET DEFAULT NOW()')
        print(f"  Added default to {t}.created_at")
    elif row:
        print(f"  {t}.created_at already has default: {row[1]}")

# Also fix updated_at
for t in tables:
    try:
        cur.execute("SELECT column_name, column_default FROM information_schema.columns WHERE table_name=%s AND column_name='updated_at'", (t,))
        row = cur.fetchone()
        if row and row[1] is None:
            cur.execute(f'ALTER TABLE {t} ALTER COLUMN updated_at SET DEFAULT NOW()')
            print(f"  Added default to {t}.updated_at")
    except Exception:
        pass

# Fix NULL created_at values
print("\n--- Fixing NULL values ---")
for t in tables:
    try:
        cur.execute(f"UPDATE {t} SET created_at = NOW() WHERE created_at IS NULL")
        if cur.rowcount > 0:
            print(f"  Fixed {cur.rowcount} NULL created_at in {t}")
    except Exception as e:
        pass

cur.close()
conn.close()
print("\nDone!")
