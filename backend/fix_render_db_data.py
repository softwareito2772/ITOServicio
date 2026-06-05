import psycopg2

DATABASE_URL = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Fix warranty_type: old enum names -> display strings
cur.execute("UPDATE warranties SET warranty_type = '1 mes' WHERE warranty_type = 'one_month'")
print(f"Fixed warranties: {cur.rowcount} rows")

# Fix arrival_condition: old English enum names -> Spanish display strings
cur.execute("UPDATE repairs SET arrival_condition = 'Pantalla rota' WHERE arrival_condition = 'broken_screen'")
print(f"Fixed repairs arrival_condition 'broken_screen' -> 'Pantalla rota': {cur.rowcount} rows")

cur.execute("UPDATE repairs SET arrival_condition = 'Dañado severo' WHERE arrival_condition = 'severe_damage'")
print(f"Fixed repairs arrival_condition 'severe_damage': {cur.rowcount} rows")

cur.execute("UPDATE repairs SET arrival_condition = 'Dañado moderado' WHERE arrival_condition = 'moderate_damage'")
print(f"Fixed repairs arrival_condition 'moderate_damage': {cur.rowcount} rows")

cur.execute("UPDATE repairs SET arrival_condition = 'Funcionando parcialmente' WHERE arrival_condition = 'partial_working'")
print(f"Fixed repairs arrival_condition 'partial_working': {cur.rowcount} rows")

cur.execute("UPDATE repairs SET arrival_condition = 'Sin arranque' WHERE arrival_condition = 'no_boot'")
print(f"Fixed repairs arrival_condition 'no_boot': {cur.rowcount} rows")

cur.execute("UPDATE repairs SET arrival_condition = 'Otros' WHERE arrival_condition = 'other'")
print(f"Fixed repairs arrival_condition 'other': {cur.rowcount} rows")

# Fix arrival_statuses: normalize names (remove encoding issues)
cur.execute("UPDATE equipment_arrival_statuses SET name = 'Dañado severo' WHERE name LIKE '%anado severo%' AND name != 'Dañado severo'")
print(f"Fixed arrival_status 'Danado severo' -> 'Dañado severo': {cur.rowcount} rows")

cur.execute("UPDATE equipment_arrival_statuses SET name = 'Dañado moderado' WHERE name LIKE '%anado moderado%' AND name != 'Dañado moderado'")
print(f"Fixed arrival_status 'Danado moderado' -> 'Dañado moderado': {cur.rowcount} rows")

# Also update repair that has old-style name with encoding issue
cur.execute("UPDATE repairs SET arrival_condition = 'Dañado severo' WHERE arrival_condition LIKE '%anado severo%'")
print(f"Fixed repair arrival_conditions with encoding: {cur.rowcount} rows")

conn.commit()

# Verify fixes
cur.execute("SELECT id, warranty_type FROM warranties")
print("\n=== WARRANTIES AFTER FIX ===")
for r in cur.fetchall():
    print(f"  id={r[0]}, warranty_type='{r[1]}'")

cur.execute("SELECT id, arrival_condition FROM repairs")
print("\n=== REPAIRS AFTER FIX ===")
for r in cur.fetchall():
    print(f"  id={r[0]}, arrival_condition='{r[1]}'")

cur.execute("SELECT id, name FROM equipment_arrival_statuses")
print("\n=== ARRIVAL STATUSES AFTER FIX ===")
for r in cur.fetchall():
    print(f"  id={r[0]}, name='{r[1]}'")

conn.close()
