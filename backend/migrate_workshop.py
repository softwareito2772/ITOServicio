import psycopg2
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db")

def migrate():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS workshop_vehicles (
            id SERIAL PRIMARY KEY,
            client_id INTEGER REFERENCES clients(id),
            plate_number VARCHAR(20) NOT NULL,
            color VARCHAR(30),
            vehicle_type VARCHAR(50) DEFAULT 'sedan',
            brand VARCHAR(100),
            model VARCHAR(100) NOT NULL,
            year INTEGER,
            mileage INTEGER DEFAULT 0,
            assigned_to VARCHAR(255),
            brought_by VARCHAR(255),
            brought_by_phone VARCHAR(20),
            is_active BOOLEAN DEFAULT TRUE,
            company_id INTEGER REFERENCES companies(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    print("OK: workshop_vehicles")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS workshop_orders (
            id SERIAL PRIMARY KEY,
            vehicle_id INTEGER REFERENCES workshop_vehicles(id),
            client_id INTEGER REFERENCES clients(id),
            technician_id INTEGER REFERENCES users(id),
            assistant_name VARCHAR(255),
            type VARCHAR(20) NOT NULL,
            description TEXT,
            diagnosis TEXT,
            solution TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            entry_km INTEGER,
            exit_km INTEGER,
            entry_datetime TIMESTAMP,
            exit_datetime TIMESTAMP,
            estimated_completion TIMESTAMP,
            cost_labor FLOAT DEFAULT 0,
            cost_parts FLOAT DEFAULT 0,
            total_cost FLOAT DEFAULT 0,
            mechanic_observations TEXT,
            recommendations TEXT,
            urgent_issues TEXT,
            customer_notes TEXT,
            picked_up_by VARCHAR(255),
            picked_up_signature TEXT,
            picked_up_datetime TIMESTAMP,
            next_maintenance_date DATE,
            next_maintenance_km INTEGER,
            company_id INTEGER REFERENCES companies(id),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    print("OK: workshop_orders")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS workshop_checklist (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES workshop_orders(id) ON DELETE CASCADE,
            item_name VARCHAR(100) NOT NULL,
            item_category VARCHAR(50) NOT NULL,
            status VARCHAR(20) DEFAULT 'ok',
            notes TEXT,
            needs_replacement BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    print("OK: workshop_checklist")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS workshop_checklist_templates (
            id SERIAL PRIMARY KEY,
            vehicle_type VARCHAR(50) NOT NULL,
            item_name VARCHAR(100) NOT NULL,
            item_category VARCHAR(50) NOT NULL,
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            company_id INTEGER REFERENCES companies(id),
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    print("OK: workshop_checklist_templates")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS workshop_parts_used (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES workshop_orders(id) ON DELETE CASCADE,
            product_id INTEGER REFERENCES products(id),
            quantity INTEGER DEFAULT 1,
            unit_cost FLOAT DEFAULT 0,
            unit_price FLOAT DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    print("OK: workshop_parts_used")

    cur.execute("""
        INSERT INTO company_modules (company_id, module_name, is_enabled)
        SELECT 2, 'taller', true
        WHERE NOT EXISTS (
            SELECT 1 FROM company_modules WHERE company_id = 2 AND module_name = 'taller'
        )
    """)
    print("OK: taller module enabled for Etech")

    conn.commit()
    cur.close()
    conn.close()
    print("Migracion completada!")

if __name__ == "__main__":
    migrate()
