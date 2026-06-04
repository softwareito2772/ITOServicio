import urllib.request, json, sys

# Test admin login first (we know this works)
print("=== Test 1: Admin login (should work) ===")
data = json.dumps({'email': 'admin@ito.com', 'password': 'admin123'}).encode()
req = urllib.request.Request('https://itoservicio.onrender.com/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req)
result = json.loads(resp.read())
print(f"  company_id: {result.get('company_id')}")
print(f"  user_role: {result.get('user_role')}")
print()

# Test super admin login
print("=== Test 2: Super admin login ===")
data = json.dumps({'email': 'superadmin@itoservicio.com', 'password': '$Jafet2213$'}).encode()
try:
    req = urllib.request.Request('https://itoservicio.onrender.com/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    print(f"  OK: {result}")
except urllib.error.HTTPError as e:
    print(f"  Error {e.code}")
    # Check if there's detail
    body = e.read().decode()
    print(f"  Body: {body}")
    
    # Let's try a different approach - check if the password hash is stored correctly
    print()
    print("=== Debug: checking password hash via SQL ===")
    import psycopg2
    conn = psycopg2.connect('postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db')
    cur = conn.cursor()
    cur.execute("SELECT id, email, password_hash, role, company_id FROM users WHERE email = 'superadmin@itoservicio.com'")
    row = cur.fetchone()
    if row:
        print(f"  id: {row[0]}, email: {row[1]}, role: {row[3]}, company_id: {row[4]}")
        print(f"  hash: {row[2][:50]}...")
        
        # Verify the password
        import hashlib
        salt, stored_hex = row[2].split("$")
        computed = hashlib.sha256(('$Jafet2213$' + salt).encode()).hexdigest()
        print(f"  password match: {computed == stored_hex}")
    cur.close()
    conn.close()
