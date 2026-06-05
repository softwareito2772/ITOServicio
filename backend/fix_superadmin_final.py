import requests, psycopg2, sys
sys.path.insert(0, r'C:\Users\ITO\Documents\Servicios_app\backend')
from app.auth import verify_password, hash_password

BASE = 'https://itoservicio.onrender.com/api'

# Test login with requests
password = "$Jafet2213$"
r = requests.post(f'{BASE}/auth/login', json={'email': 'superadmin@itoservicio.com', 'password': password}, timeout=10)
print(f"Login: {r.status_code} {r.text[:200]}")

# Check DB hash
DATABASE_URL = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
cur.execute("SELECT id, email, password_hash, role FROM users WHERE email = %s", ("superadmin@itoservicio.com",))
row = cur.fetchone()
print(f"\nDB: id={row[0]}, email={row[1]}, role={row[3]}")
print(f"Hash from DB: {row[2]}")
print(f"Verify locally: {verify_password(password, row[2])}")

# Force update with hash_password
new_hash = hash_password(password)
print(f"\nNew hash: {new_hash}")
print(f"New verify: {verify_password(password, new_hash)}")

cur.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, row[0]))
conn.commit()
print(f"Updated: {cur.rowcount}")

# Re-read and verify
cur.execute("SELECT password_hash FROM users WHERE id = %s", (row[0],))
stored2 = cur.fetchone()[0]
print(f"Re-read verify: {verify_password(password, stored2)}")
conn.close()
