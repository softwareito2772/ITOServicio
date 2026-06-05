import psycopg2

RENDER_DB_URL = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"
conn = psycopg2.connect(RENDER_DB_URL)
conn.autocommit = True
cur = conn.cursor()

enum_types = ["equipmentstatus", "servicelocation", "arrivalcondition", "inventorymovementtype", "warrantytype"]
for et in enum_types:
    try:
        cur.execute(f"DROP TYPE IF EXISTS {et} CASCADE")
        print(f"Dropped: {et}")
    except Exception as e:
        print(f"Note: {et} - {e}")

cur.close()
conn.close()
