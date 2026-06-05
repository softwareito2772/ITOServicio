import requests

BASE = 'http://localhost:8000/api'

# Admin
r = requests.post(f'{BASE}/auth/login', json={'email': 'admin@ito.com', 'password': 'admin123'}, timeout=5)
print('Admin:', r.status_code)

# Superadmin
r = requests.post(f'{BASE}/auth/login', json={'email': 'superadmin@itoservicio.com', 'password': '$Jafet2213$'}, timeout=5)
print('Super:', r.status_code)

if r.status_code == 200:
    token = r.json().get('access_token')
    H = {'Authorization': f'Bearer {token}'}
    r2 = requests.get(f'{BASE}/auth/me', headers=H, timeout=5)
    print('  /me:', r2.status_code, r2.json().get('role'))
    r3 = requests.get(f'{BASE}/companies/', headers=H, timeout=5)
    print('  /companies:', r3.status_code)
