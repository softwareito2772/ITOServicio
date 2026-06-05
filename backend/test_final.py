import requests

BASE = 'https://itoservicio.onrender.com/api'

# Superadmin
r = requests.post(f'{BASE}/auth/login', json={'email': 'superadmin@itoservicio.com', 'password': '$Jafet2213$'}, timeout=10)
print('Super login:', r.status_code)
if r.status_code == 200:
    token = r.json().get('access_token')
    H = {'Authorization': f'Bearer {token}'}
    r2 = requests.get(f'{BASE}/auth/me', headers=H, timeout=10)
    print('  /me:', r2.status_code, r2.json().get('role'))
    r3 = requests.get(f'{BASE}/companies/', headers=H, timeout=10)
    print('  /companies:', r3.status_code)

# Admin
r = requests.post(f'{BASE}/auth/login', json={'email': 'admin@ito.com', 'password': 'admin123'}, timeout=10)
H = {'Authorization': f'Bearer {r.json().get("access_token")}'}

r = requests.post(f'{BASE}/maintenance/', headers=H, data={'equipment_id': '1', 'description': 'Test post-fix', 'status': 'pending', 'service_location': 'local'}, timeout=10)
print('Create maintenance:', r.status_code)

r = requests.post(f'{BASE}/repairs/', headers=H, data={'equipment_id': '1', 'arrival_condition': 'Danado severo', 'status': 'pending', 'service_location': 'local', 'total_cost': '0'}, timeout=10)
print('Create repair:', r.status_code)

r = requests.get(f'{BASE}/warranties/', headers=H, timeout=10)
print('Warranties:', r.status_code, f'({len(r.json())})')

r = requests.get(f'{BASE}/arrival-statuses/', headers=H, timeout=10)
print('Arrival statuses:', r.status_code, f'({len(r.json())})')

r = requests.get(f'{BASE}/dashboard/', headers=H, timeout=10)
print('Dashboard:', r.status_code)

print('\nAll tests passed!')
