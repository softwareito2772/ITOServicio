import sqlite3

conn = sqlite3.connect(r"C:\Users\ITO\Documents\Servicios_app\backend\servicios.db")
c = conn.cursor()

new_hash = "5b62d6e2748224b3361e6fcf30783513$43784db19dfb7b6fd4efee04de43c5736ab102c6aad0c77e7b66bd71fc3add48"
c.execute("UPDATE users SET password_hash = ? WHERE email = ?", (new_hash, "superadmin@itoservicio.com"))
print(f"Updated superadmin hash: {c.rowcount} rows")
conn.commit()
conn.close()
