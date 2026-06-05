import sqlite3, hashlib

# Read hash from DB
conn = sqlite3.connect(r"C:\Users\ITO\Documents\Servicios_app\backend\servicios.db")
c = conn.cursor()
c.execute("SELECT password_hash FROM users WHERE email = ?", ("superadmin@itoservicio.com",))
stored = c.fetchone()[0]
conn.close()

password = "$Jafet2213$"

# Reproduce exactly what verify_password does
salt, stored_hex = stored.split("$", 1)
print(f"Salt: {salt}")
print(f"Stored hex: {stored_hex}")

# Encode password + salt the same way
msg = (password + salt).encode()
print(f"Message bytes: {msg[:60]}")

hash_obj = hashlib.sha256(msg)
computed = hash_obj.hexdigest()
print(f"Computed: {computed}")
print(f"Stored:   {stored_hex}")
print(f"Match:    {stored_hex == computed}")

# Now try with the ACTUAL auth module
import sys
sys.path.insert(0, r'C:\Users\ITO\Documents\Servicios_app\backend')
from app.auth import verify_password, hash_password

result = verify_password(password, stored)
print(f"\nauth.verify_password: {result}")

# Generate fresh hash and test
fresh = hash_password(password)
print(f"\nFresh hash: {fresh}")
result2 = verify_password(password, fresh)
print(f"Fresh verify: {result2}")

# Check if auth module uses split("$") or split("$", 1)
import inspect
src = inspect.getsource(verify_password)
print(f"\nverify_password source:")
print(src)
