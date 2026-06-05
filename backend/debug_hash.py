import sqlite3

conn = sqlite3.connect(r"C:\Users\ITO\Documents\Servicios_app\backend\servicios.db")
c = conn.cursor()
c.execute("SELECT password_hash FROM users WHERE email = ?", ("superadmin@itoservicio.com",))
stored = c.fetchone()[0]
conn.close()

# auth.py does: salt, stored_hex = stored_hash.split("$")
parts = stored.split("$")
print(f"Number of parts: {len(parts)}")
for i, p in enumerate(parts):
    print(f"  Part {i}: len={len(p)}, value={p[:40]}...")

# The problem: password contains $, and hash_password generates salt$hash
# split("$") on "salt$hash" gives [salt, hash] - 2 parts = correct
# But verify_password also splits on "$" and password has "$"...
# Actually no - verify_password splits the STORED hash, not the password
# Let me trace exactly what happens

password = "$Jafet2213$"
print(f"\nPassword: {repr(password)}")
print(f"Stored:   {stored}")
print(f"Parts:    {parts}")

if len(parts) == 2:
    salt = parts[0]
    stored_hex = parts[1]
    import hashlib
    computed = hashlib.sha256((password + salt).encode()).hexdigest()
    print(f"\nSalt:     {salt}")
    print(f"Stored:   {stored_hex}")
    print(f"Computed: {computed}")
    print(f"Match:    {stored_hex == computed}")
else:
    print(f"\nERROR: split gave {len(parts)} parts, expected 2")
