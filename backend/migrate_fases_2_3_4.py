import os
import psycopg2

DATABASE_URL = os.environ.get('DATABASE_URL') or 'postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db'

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS workshop_order_images (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES workshop_orders(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type VARCHAR(20) NOT NULL,
    description TEXT,
    company_id INTEGER REFERENCES companies(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workshop_inventory (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    category VARCHAR(100),
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    unit_cost FLOAT DEFAULT 0,
    unit_price FLOAT DEFAULT 0,
    supplier VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    company_id INTEGER REFERENCES companies(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workshop_invoices (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES workshop_orders(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id),
    invoice_number VARCHAR(50) NOT NULL,
    subtotal FLOAT DEFAULT 0,
    tax FLOAT DEFAULT 0,
    discount FLOAT DEFAULT 0,
    total FLOAT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    paid_amount FLOAT DEFAULT 0,
    payment_method VARCHAR(50),
    payment_date TIMESTAMP,
    notes TEXT,
    company_id INTEGER REFERENCES companies(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_images_order ON workshop_order_images(order_id);
CREATE INDEX IF NOT EXISTS idx_wi_inventory_company ON workshop_inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_wi_inventory_category ON workshop_inventory(category);
CREATE INDEX IF NOT EXISTS idx_wi_invoices_order ON workshop_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_wi_invoices_company ON workshop_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_wi_invoices_status ON workshop_invoices(status);
""")

conn.commit()
print("Tablas workshop_order_images, workshop_inventory, workshop_invoices creadas correctamente")

cur.close()
conn.close()
