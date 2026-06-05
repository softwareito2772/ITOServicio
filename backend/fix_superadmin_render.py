import hashlib, secrets, psycopg2

DATABASE_URL = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Check current hash
cur.execute("SELECT id, email, password_hash, role FROM users WHERE email = %s", ("superadmin@itoservicio.com",))
row = cur.fetchone()
print(f"Current: id={row[0]}, email={row[1]}, role={row[3]}, hash={row[2][:60]}...")

# Generate correct hash using same method as auth.py
password = "$Jafet2213$"
salt = secrets.token_hex(16)
hash_obj = hashlib.sha256((password + salt).encode())
new_hash = f"{salt}${hash_obj.hexdigest()}"

# Verify
salt_check, hex_check = new_hash.split("$", 1)
verify = hashlib.sha256((password + salt_check).encode()).hexdigest()
print(f"New hash: {new_hash[:60]}...")
print(f"Verify: {hex_check == verify}")

# Update
cur.execute("UPDATE users SET password_hash = %s WHERE email = %s", (new_hash, "superadmin@itoservicio.com"))
print(f"Updated: {cur.rowcount} rows")
conn.commit()
conn.close()
