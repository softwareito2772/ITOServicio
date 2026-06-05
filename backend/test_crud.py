import requests

BASE = "https://itoservicio.onrender.com/api"

r = requests.post(f"{BASE}/auth/login", json={"email": "admin@ito.com", "password": "admin123"}, timeout=30)
HA = {"Authorization": f"Bearer {r.json()['access_token']}"}

r = requests.post(f"{BASE}/auth/login", json={"email": "superadmin@itoservicio.com", "password": "$Jafet2213$"}, timeout=30)
HSA = {"Authorization": f"Bearer {r.json()['access_token']}"}

print("=== SUPERADMIN ===")
r = requests.get(f"{BASE}/auth/me", headers=HSA, timeout=30)
print(f"  /me: {r.status_code}")

r = requests.get(f"{BASE}/companies/", headers=HSA, timeout=30)
print(f"  /companies/: {r.status_code} | {r.text[:200] if r.status_code!=200 else 'OK'}")

print("\n=== ADMIN - CREATE ===")
tests = [
    ("Client", "/clients/", {"name": "Test Final", "phone": "555-0099"}),
    ("Category", "/categories/", {"name": "Final Cat", "type": "product"}),
    ("Product", "/products/", {"name": "Final Prod", "price": 75, "stock": 3}),
    ("Equipment", "/equipment/", {"client_id": 1, "type_name": "PC", "model": "Final", "serial_number": "FIN001"}),
]
for name, path, data in tests:
    r = requests.post(f"{BASE}{path}", headers=HA, json=data, timeout=30)
    s = "OK" if r.status_code == 200 else "FAIL"
    print(f"  {name}: {r.status_code} {s}")

print("\n=== ADMIN - READ ===")
for name, path in [("Clients", "/clients/"), ("Categories", "/categories/"), ("Products", "/products/"), ("Equipment", "/equipment/")]:
    r = requests.get(f"{BASE}{path}", headers=HA, timeout=30)
    print(f"  {name}: {r.status_code} ({len(r.json()) if r.status_code==200 else 'FAIL'})")

print("\n=== DASHBOARD ===")
r = requests.get(f"{BASE}/dashboard/", headers=HA, timeout=30)
print(f"  /dashboard/: {r.status_code} | {r.text[:200] if r.status_code==200 else r.text[:200]}")
