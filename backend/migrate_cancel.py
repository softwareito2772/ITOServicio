import psycopg2

DATABASE_URL = 'postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db'

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE workshop_orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT")
    print("OK: cancel_reason added")

    cur.execute("ALTER TABLE workshop_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP")
    print("OK: cancelled_at added")

    conn.commit()
    print("\nMigration complete!")

except Exception as e:
    conn.rollback()
    print(f"Error: {e}")
finally:
    cur.close()
    conn.close()
