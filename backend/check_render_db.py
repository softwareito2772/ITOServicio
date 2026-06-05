import os
import psycopg2

DATABASE_URL = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Check warranties
cur.execute("SELECT id, warranty_type, status, company_id FROM warranties LIMIT 10")
rows = cur.fetchall()
print("=== WARRANTIES ===")
for r in rows:
    print(f"  id={r[0]}, warranty_type='{r[1]}', status='{r[2]}', company_id={r[3]}")

# Check repairs arrival_condition
cur.execute("SELECT id, arrival_condition, status, company_id FROM repairs LIMIT 10")
rows = cur.fetchall()
print("\n=== REPAIRS ===")
for r in rows:
    print(f"  id={r[0]}, arrival_condition='{r[1]}', status='{r[2]}', company_id={r[3]}")

# Check maintenance status
cur.execute("SELECT id, status, company_id FROM maintenance LIMIT 10")
rows = cur.fetchall()
print("\n=== MAINTENANCE ===")
for r in rows:
    print(f"  id={r[0]}, status='{r[1]}', company_id={r[2]}")

# Check equipment arrival_statuses
cur.execute("SELECT id, name, company_id, is_active FROM equipment_arrival_statuses LIMIT 10")
rows = cur.fetchall()
print("\n=== ARRIVAL STATUSES ===")
for r in rows:
    print(f"  id={r[0]}, name='{r[1]}', company_id={r[2]}, is_active={r[3]}")

conn.close()
