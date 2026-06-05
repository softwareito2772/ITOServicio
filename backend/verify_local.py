import hashlib, sqlite3

# Read hash from DB
conn = sqlite3.connect(r'C:\Users\ITO\Documents\Servicios_app\backend\servicios.db')
c = conn.cursor()
c.execute('SELECT password_hash FROM users WHERE email = ?', ('superadmin@itoservicio.com',))
stored_hash = c.fetchone()[0]
conn.close()

password = "$Jafet2213$"
salt, stored_hex = stored_hash.split('$')
hash_obj = hashlib.sha256((password + salt).encode())
computed = hash_obj.hexdigest()
print(f"Password: {repr(password)}")
print(f"Match: {stored_hex == computed}")
print(f"Computed: {computed}")
print(f"Stored:   {stored_hex}")
