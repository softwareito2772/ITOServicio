import psycopg2

RENDER_DB_URL = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"

conn = psycopg2.connect(RENDER_DB_URL)
conn.autocommit = True
cur = conn.cursor()

cur.execute("UPDATE companies SET created_at = NOW() WHERE created_at IS NULL")
print(f"Fixed companies: {cur.rowcount} rows")

cur.execute("SELECT id, name, created_at FROM companies")
for row in cur.fetchall():
    print(f"Company {row[0]}: {row[1]} created_at={row[2]}")

cur.close()
conn.close()
