import requests

BASE = 'https://itoservicio.onrender.com/api'

# Login as admin
r = requests.post(f'{BASE}/auth/login', json={'email':'admin@ito.com','password':'admin123'})
token = r.json().get('access_token')
H = {'Authorization': f'Bearer {token}'}

# Test warranties - the 500 error is because DB has "one_month" but schema expects "1 mes"
r = requests.get(f'{BASE}/warranties/', headers=H)
print('Warranties status:', r.status_code)
print('Warranties response:', r.text[:500])

# Test maintenance list
r = requests.get(f'{BASE}/maintenance/', headers=H)
print('Maintenance list:', r.status_code, 'count:', len(r.json()) if r.status_code == 200 else r.text[:200])

# Test repairs list
r = requests.get(f'{BASE}/repairs/', headers=H)
print('Repairs list:', r.status_code, 'count:', len(r.json()) if r.status_code == 200 else r.text[:200])

# Test arrival statuses
r = requests.get(f'{BASE}/arrival-statuses/', headers=H)
print('Arrival statuses:', r.status_code, 'count:', len(r.json()) if r.status_code == 200 else r.text[:200])
