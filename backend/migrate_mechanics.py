import psycopg2
import os

DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db')

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

try:
    # Add image_url to workshop_vehicles
    cur.execute("ALTER TABLE workshop_vehicles ADD COLUMN IF NOT EXISTS image_url TEXT")
    print("OK: image_url added to workshop_vehicles")

    # Add mechanic_name and assistant_names to workshop_orders
    cur.execute("ALTER TABLE workshop_orders ADD COLUMN IF NOT EXISTS mechanic_name VARCHAR(255)")
    print("OK: mechanic_name added to workshop_orders")

    cur.execute("ALTER TABLE workshop_orders ADD COLUMN IF NOT EXISTS assistant_names TEXT")
    print("OK: assistant_names added to workshop_orders")

    # Create workshop_mechanics table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS workshop_mechanics (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            phone VARCHAR(20),
            specialty VARCHAR(255),
            is_active BOOLEAN DEFAULT TRUE,
            company_id INTEGER REFERENCES companies(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("OK: workshop_mechanics table created")

    conn.commit()
    print("\nMigration complete!")

except Exception as e:
    conn.rollback()
    print(f"Error: {e}")
finally:
    cur.close()
    conn.close()
