import sqlite3
from sqlalchemy import create_engine, text

sqlite_path = 'C:/Users/ITO/Documents/Servicios_app/backend/servicios.db'
pg_url = 'postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db'

sconn = sqlite3.connect(sqlite_path)
sconn.row_factory = sqlite3.Row

engine = create_engine(pg_url)

with engine.connect() as pg_conn:
    result = pg_conn.execute(text(
        "SELECT table_name, column_name FROM information_schema.columns WHERE data_type = 'boolean' AND table_schema = 'public'"
    ))
    bool_cols = set()
    for row in result:
        bool_cols.add((row[0], row[1]))
    pg_conn.execute(text("SET CONSTRAINTS ALL DEFERRED"))
    tables_to_truncate = ['warranties','repair_images','repairs','maintenance_images','maintenance','sale_items','sales','equipment_arrival_statuses','products','categories','equipment','clients','users','inventory_movements']
    for t in tables_to_truncate:
        try:
            pg_conn.execute(text(f'TRUNCATE TABLE {t} CASCADE'))
        except:
            pass
    pg_conn.commit()

print(f"Boolean columns: {bool_cols}")

table_order = ['users','clients','categories','products','inventory_movements','sales','sale_items','equipment','maintenance','maintenance_images','repairs','repair_images','warranties','equipment_arrival_statuses']

scursor = sconn.cursor()
scursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
all_tables = [r[0] for r in scursor.fetchall()]

for table in [t for t in table_order if t in all_tables]:
    scursor.execute(f'SELECT * FROM [{table}]')
    rows = [dict(r) for r in scursor.fetchall()]
    if not rows:
        print(f'  Skipping {table}')
        continue

    with engine.connect() as pg_conn:
        for row in rows:
            cols = list(row.keys())
            values = []
            for col in cols:
                val = row[col]
                if (table, col) in bool_cols:
                    val = bool(val) if val is not None else None
                values.append(val)

            placeholders = ', '.join([f':p{i}' for i in range(len(cols))])
            cols_str = ', '.join([f'"{c}"' for c in cols])
            params = {f'p{i}': v for i, v in enumerate(values)}

            try:
                pg_conn.execute(text(f'INSERT INTO "{table}" ({cols_str}) VALUES ({placeholders})'), params)
            except Exception as e:
                print(f'  Error {table}: {e}')
        pg_conn.commit()
        print(f'  Imported {len(rows)} rows in {table}')

print('Migration complete!')
