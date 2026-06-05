import sqlite3, hashlib

conn = sqlite3.connect(r"C:\Users\ITO\Documents\Servicios_app\backend\servicios.db")
c = conn.cursor()
c.execute("SELECT password_hash FROM users WHERE email = ?", ("superadmin@itoservicio.com",))
stored = c.fetchone()[0]
conn.close()

password = "$Jafet2213$"
salt, hex_val = stored.split("$", 1)
computed = hashlib.sha256((password + salt).encode()).hexdigest()
print(f"Hash valid: {computed == hex_val}")
