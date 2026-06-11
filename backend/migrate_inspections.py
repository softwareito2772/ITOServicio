import os
import psycopg2

DATABASE_URL = os.environ.get('DATABASE_URL') or 'postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db'

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS workshop_inspections (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES workshop_orders(id) ON DELETE CASCADE,
    vehicle_id INTEGER NOT NULL REFERENCES workshop_vehicles(id) ON DELETE CASCADE,
    zone VARCHAR(100) NOT NULL,
    damage_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'leve',
    notes TEXT,
    inspected_by VARCHAR(100),
    company_id INTEGER REFERENCES companies(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workshop_inspection_images (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER NOT NULL REFERENCES workshop_inspections(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspections_order ON workshop_inspections(order_id);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON workshop_inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_insp_images_inspection ON workshop_inspection_images(inspection_id);
""")

conn.commit()
print("Tablas workshop_inspections y workshop_inspection_images creadas correctamente")

cur.close()
conn.close()
