import requests

BASE = 'http://localhost:8000/api'

# Test superadmin login
r = requests.post(f'{BASE}/auth/login', json={'email': 'superadmin@itoservicio.com', 'password': '$Jafet2213$'})
print('Super login:', r.status_code)
if r.status_code == 200:
    d = r.json()
    print('  role:', d.get('user_role'))
    print('  company_id:', d.get('company_id'))
    token = d.get('access_token')
    H = {'Authorization': f'Bearer {token}'}
    r2 = requests.get(f'{BASE}/auth/me', headers=H)
    print('  /me:', r2.status_code, r2.json().get('role'))
    r3 = requests.get(f'{BASE}/companies/', headers=H)
    print('  /companies:', r3.status_code)
else:
    print('  Error:', r.text[:300])

# Test admin login
r = requests.post(f'{BASE}/auth/login', json={'email': 'admin@ito.com', 'password': 'admin123'})
print('\nAdmin login:', r.status_code)
if r.status_code == 200:
    d = r.json()
    token = d.get('access_token')
    H = {'Authorization': f'Bearer {token}'}
    print('  /maintenance:', requests.get(f'{BASE}/maintenance/', headers=H).status_code)
    print('  /repairs:', requests.get(f'{BASE}/repairs/', headers=H).status_code)
    print('  /warranties:', requests.get(f'{BASE}/warranties/', headers=H).status_code)
    print('  /arrival-statuses:', requests.get(f'{BASE}/arrival-statuses/', headers=H).status_code)
    print('  /dashboard:', requests.get(f'{BASE}/dashboard/', headers=H).status_code)
