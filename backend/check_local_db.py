import sqlite3, os

db_path = r'C:\Users\ITO\Documents\Servicios_app\backend\servicios.db'
if not os.path.exists(db_path):
    print('DB NOT FOUND')
else:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in c.fetchall()]
    print('Tables:', tables)
    
    c.execute('SELECT id, name, slug FROM companies')
    print('Companies:', c.fetchall())
    
    c.execute('SELECT id, email, role, company_id, is_active FROM users')
    print('Users:', c.fetchall())
    
    c.execute('PRAGMA table_info(warranties)')
    cols = [r[1] for r in c.fetchall()]
    print('Warranty columns:', cols)
    
    c.execute('SELECT * FROM warranties LIMIT 5')
    print('Warranties:', c.fetchall())
    
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='equipment_arrival_statuses'")
    if c.fetchall():
        c.execute('SELECT * FROM equipment_arrival_statuses LIMIT 5')
        print('Arrival statuses:', c.fetchall())
    else:
        print('No equipment_arrival_statuses table')
    
    conn.close()
