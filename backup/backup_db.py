"""
Backup semanal de PostgreSQL (Render) a carpeta local.
Guarda archivos como: backup_YYYY-MM-DD.dump
"""
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

BACKUP_DIR = Path(__file__).parent
PG_URL = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"

def get_pg_dump_path():
    candidates = [
        r"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
        r"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
        r"C:\Program Files\PostgreSQL\14\bin\pg_dump.exe",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None

def backup_with_pg_dump():
    pg_dump = get_pg_dump_path()
    if not pg_dump:
        print("pg_dump not found, using Python fallback")
        backup_with_python()
        return

    filename = f"backup_{datetime.now().strftime('%Y-%m-%d')}.dump"
    filepath = BACKUP_DIR / filename
    cmd = [
        pg_dump,
        PG_URL,
        "-F", "c",
        "-f", str(filepath)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        size = filepath.stat().st_size / 1024
        print(f"OK: {filename} ({size:.1f} KB)")
    else:
        print(f"Error: {result.stderr}")
        backup_with_python()

def backup_with_python():
    import sqlite3
    from sqlalchemy import create_engine, text, inspect

    filename = f"backup_{datetime.now().strftime('%Y-%m-%d')}.sql"
    filepath = BACKUP_DIR / filename

    engine = create_engine(PG_URL)
    inspector = inspect(engine)

    tables = inspector.get_table_names()
    table_order = ['users','clients','categories','products','inventory_movements',
                   'sales','sale_items','equipment','maintenance','maintenance_images',
                   'repairs','repair_images','warranties','equipment_arrival_statuses']
    tables = [t for t in table_order if t in tables]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f"-- Backup ITO Servicios - {datetime.now().isoformat()}\n\n")
        with engine.connect() as conn:
            for table in tables:
                result = conn.execute(text(f'SELECT * FROM "{table}"'))
                rows = result.fetchall()
                cols = list(result.keys())
                for row in rows:
                    values = []
                    for i, val in enumerate(row):
                        if val is None:
                            values.append("NULL")
                        elif isinstance(val, str):
                            values.append(f"'{val.replace(chr(39), chr(39)+chr(39))}'")
                        elif isinstance(val, bool):
                            values.append("true" if val else "false")
                        elif isinstance(val, (int, float)):
                            values.append(str(val))
                        else:
                            values.append(f"'{str(val)}'")
                    cols_str = ', '.join([f'"{c}"' for c in cols])
                    vals_str = ', '.join(values)
                    f.write(f'INSERT INTO "{table}" ({cols_str}) VALUES ({vals_str}) ON CONFLICT DO NOTHING;\n')
                print(f"  {table}: {len(rows)} rows")

    engine.dispose()
    size = filepath.stat().st_size / 1024
    print(f"OK: {filename} ({size:.1f} KB)")

def cleanup_old_backups(keep=12):
    files = sorted(BACKUP_DIR.glob("backup_*"))
    if len(files) > keep:
        for f in files[:-keep]:
            f.unlink()
            print(f"  Deleted old: {f.name}")

if __name__ == "__main__":
    print(f"Backup ITO Servicios - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Directory: {BACKUP_DIR}")
    backup_with_pg_dump()
    cleanup_old_backups()
    print("Done!")
