import hashlib, secrets, sqlite3

# Generate correct hash for superadmin
password = "$Jafet2213$"
salt = secrets.token_hex(16)
hash_obj = hashlib.sha256((password + salt).encode())
new_hash = f"{salt}${hash_obj.hexdigest()}"
print(f"New hash: {new_hash}")

# Verify it works
salt2, hex2 = new_hash.split("$", 1)
verify = hashlib.sha256((password + salt2).encode()).hexdigest()
print(f"Verify match: {hex2 == verify}")

# Update DB
conn = sqlite3.connect(r"C:\Users\ITO\Documents\Servicios_app\backend\servicios.db")
c = conn.cursor()
c.execute("UPDATE users SET password_hash = ? WHERE email = ?", (new_hash, "superadmin@itoservicio.com"))
print(f"Updated: {c.rowcount} rows")
conn.commit()
conn.close()

# Read back and verify
conn = sqlite3.connect(r"C:\Users\ITO\Documents\Servicios_app\backend\servicios.db")
c = conn.cursor()
c.execute("SELECT password_hash FROM users WHERE email = ?", ("superadmin@itoservicio.com",))
stored = c.fetchone()[0]
salt3, hex3 = stored.split("$", 1)
check = hashlib.sha256((password + salt3).encode()).hexdigest()
print(f"Read-back verify: {hex3 == check}")
conn.close()
