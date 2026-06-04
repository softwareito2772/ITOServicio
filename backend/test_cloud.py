import requests
import json

BASE = "https://itoservicio.onrender.com/api"

r = requests.post(f"{BASE}/auth/login", json={
    "email": "superadmin@itoservicio.com",
    "password": "$Jafet2213$"
}, timeout=30)
print(f"Login: {r.status_code}")

token = r.json()["access_token"]

r2 = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=30)
print(f"Me status: {r2.status_code}")
print(f"Me text: {r2.text[:500]}")

r3 = requests.get(f"{BASE}/companies/", headers={"Authorization": f"Bearer {token}"}, timeout=30)
print(f"\nCompanies status: {r3.status_code}")
print(f"Companies text: {r3.text[:500]}")
