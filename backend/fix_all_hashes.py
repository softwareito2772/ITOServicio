import sqlite3, sys
sys.path.insert(0, r'C:\Users\ITO\Documents\Servicios_app\backend')
from app.auth import hash_password, verify_password

password = "$Jafet2213$"
new_hash = hash_password(password)
print(f"Generated: {new_hash}")
print(f"Verify:    {verify_password(password, new_hash)}")

# Update all users
conn = sqlite3.connect(r"C:\Users\ITO\Documents\Servicios_app\backend\servicios.db")
c = conn.cursor()

c.execute("UPDATE users SET password_hash = ? WHERE email = ?", (new_hash, "superadmin@itoservicio.com"))
print(f"Updated superadmin: {c.rowcount}")

# Also fix admin password
admin_hash = hash_password("admin123")
c.execute("UPDATE users SET password_hash = ? WHERE email = ?", (admin_hash, "admin@ito.com"))
print(f"Updated admin: {c.rowcount}")

# Also fix tecnico passwords
for email in ["tecnico1@ito.com", "tecnico2@ito.com"]:
    c.execute("UPDATE users SET password_hash = ? WHERE email = ?", (admin_hash, email))
    print(f"Updated {email}: {c.rowcount}")

conn.commit()

# Verify all reads back
for email in ["superadmin@itoservicio.com", "admin@ito.com"]:
    c.execute("SELECT password_hash FROM users WHERE email = ?", (email,))
    stored = c.fetchone()[0]
    pw = "$Jafet2213$" if "super" in email else "admin123"
    print(f"\n{email}: verify={verify_password(pw, stored)}")

conn.close()
