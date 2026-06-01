"""
Script para migrar datos de SQLite a PostgreSQL.

Uso:
    python migrate_data.py sqlite_path postgres_url

Ejemplo:
    python migrate_data.py servicios.db "postgresql://user:pass@host:5432/dbname"
"""

import sys
import sqlite3
import json
from datetime import datetime, date
from pathlib import Path

def serialize_value(val):
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, bytes):
        return val.decode('utf-8', errors='replace')
    if isinstance(val, bool):
        return val
    return val

def export_sqlite(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    tables = [row[0] for row in cursor.fetchall()]

    data = {}
    for table in tables:
        cursor.execute(f"SELECT * FROM [{table}]")
        rows = cursor.fetchall()
        data[table] = [dict(row) for row in rows]
        print(f"  Exportadas {len(rows)} filas de {table}")

    conn.close()
    return data

def import_postgresql(data, postgres_url):
    from sqlalchemy import create_engine, text, inspect
    
    engine = create_engine(postgres_url)
    
    table_order = [
        'users', 'clients', 'categories', 'products', 'inventory_movements',
        'sales', 'sale_items', 'equipment', 'maintenance', 'maintenance_images',
        'repairs', 'repair_images', 'warranties', 'equipment_arrival_statuses'
    ]
    
    tables_in_data = [t for t in table_order if t in data]
    
    with engine.connect() as conn:
        for table in tables_in_data:
            rows = data[table]
            if not rows:
                print(f"  Saltando {table} (vacía)")
                continue
            
            for row in rows:
                columns = list(row.keys())
                values = [serialize_value(row[col]) for col in columns]
                placeholders = ', '.join([f':{col}' for col in columns])
                cols_str = ', '.join([f'"{col}"' for col in columns])
                
                try:
                    sql = text(f'INSERT INTO "{table}" ({cols_str}) VALUES ({placeholders})')
                    conn.execute(sql, dict(zip(columns, values)))
                except Exception as e:
                    print(f"  Error en {table}: {e}")
                    continue
            
            conn.commit()
            print(f"  Importadas {len(rows)} filas en {table}")
    
    engine.dispose()

def main():
    if len(sys.argv) < 3:
        print("Uso: python migrate_data.py <sqlite_path> <postgres_url>")
        print("Ejemplo: python migrate_data.py servicios.db 'postgresql://user:pass@host:5432/dbname'")
        sys.exit(1)
    
    sqlite_path = sys.argv[1]
    postgres_url = sys.argv[2]
    
    if not Path(sqlite_path).exists():
        print(f"Error: No se encuentra {sqlite_path}")
        sys.exit(1)
    
    print(f"Exportando datos de {sqlite_path}...")
    data = export_sqlite(sqlite_path)
    
    print(f"\nImportando datos en PostgreSQL...")
    import_postgresql(data, postgres_url)
    
    print("\nMigración completada!")

if __name__ == "__main__":
    main()
