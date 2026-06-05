import hashlib, secrets, psycopg2

DATABASE_URL = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Use auth module to generate hash
import sys
sys.path.insert(0, r'C:\Users\ITO\Documents\Servicios_app\backend')
from app.auth import hash_password, verify_password

password = "$Jafet2213$"
new_hash = hash_password(password)
print(f"New hash: {new_hash[:60]}...")
print(f"Verify: {verify_password(password, new_hash)}")

# Update
cur.execute("UPDATE users SET password_hash = %s WHERE email = %s", (new_hash, "superadmin@itoservicio.com"))
print(f"Updated: {cur.rowcount} rows")
conn.commit()

# Read back and verify
cur.execute("SELECT password_hash FROM users WHERE email = %s", ("superadmin@itoservicio.com",))
stored = cur.fetchone()[0]
print(f"Stored verify: {verify_password(password, stored)}")

conn.close()
