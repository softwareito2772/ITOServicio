import requests

BASE = 'http://localhost:8000/api'

# 1. Login admin
print("=== ADMIN FLOW ===")
r = requests.post(f'{BASE}/auth/login', json={'email': 'admin@ito.com', 'password': 'admin123'}, timeout=5)
print(f"1. Login: {r.status_code}")
if r.status_code != 200:
    print(f"   FAIL: {r.text[:200]}")
    exit()

data = r.json()
token = data['access_token']
print(f"   token: {token[:30]}...")
print(f"   user_role: {data.get('user_role')}")
print(f"   company_id: {data.get('company_id')}")

H = {'Authorization': f'Bearer {token}'}

# 2. getMe
r = requests.get(f'{BASE}/auth/me', headers=H, timeout=5)
print(f"2. /me: {r.status_code}")
if r.status_code != 200:
    print(f"   FAIL: {r.text[:200]}")

# 3. dashboard stats (from layout)
r = requests.get(f'{BASE}/dashboard/', headers=H, timeout=5)
print(f"3. /dashboard/: {r.status_code}")
if r.status_code != 200:
    print(f"   FAIL: {r.text[:300]}")

# 4. superadmin flow
print("\n=== SUPERADMIN FLOW ===")
r = requests.post(f'{BASE}/auth/login', json={'email': 'superadmin@itoservicio.com', 'password': '$Jafet2213$'}, timeout=5)
print(f"1. Login: {r.status_code}")
if r.status_code != 200:
    print(f"   FAIL: {r.text[:200]}")
else:
    data = r.json()
    token = data['access_token']
    H = {'Authorization': f'Bearer {token}'}
    print(f"   user_role: {data.get('user_role')}")
    
    r2 = requests.get(f'{BASE}/auth/me', headers=H, timeout=5)
    print(f"2. /me: {r2.status_code}")
    
    r3 = requests.get(f'{BASE}/companies/', headers=H, timeout=5)
    print(f"3. /companies/: {r3.status_code}")
