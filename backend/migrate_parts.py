import os
import sys
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: Set DATABASE_URL environment variable")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    conn.execute(text("""
        ALTER TABLE workshop_parts_used 
        ADD COLUMN IF NOT EXISTS workshop_inventory_id INTEGER,
        ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255)
    """))
    conn.commit()
    print("OK: workshop_parts_used columns added")
