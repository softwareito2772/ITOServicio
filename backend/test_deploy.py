import requests

BASE = "https://itoservicio.onrender.com/api"

r = requests.post(f"{BASE}/auth/login", json={"email": "superadmin@itoservicio.com", "password": "$Jafet2213$"}, timeout=30)
token = r.json()["access_token"]

r3 = requests.get(f"{BASE}/companies/", headers={"Authorization": f"Bearer {token}"}, timeout=30)
print(f"Status: {r3.status_code}")
print(f"Body: {r3.text[:1000]}")
