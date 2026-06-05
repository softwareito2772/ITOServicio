import os
os.environ["DATABASE_URL"] = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Login
print("=== Login superadmin ===")
r = client.post("/api/auth/login", json={"email": "superadmin@itoservicio.com", "password": "$Jafet2213$"})
print(f"Login: {r.status_code}")
token = r.json()["access_token"]

print("\n=== /auth/me ===")
r2 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
print(f"Me: {r2.status_code}")
print(f"Body: {r2.text[:300]}")

print("\n=== /companies/ ===")
r3 = client.get("/api/companies/", headers={"Authorization": f"Bearer {token}"})
print(f"Companies: {r3.status_code}")
print(f"Body: {r3.text[:500]}")

print("\n=== Login admin ===")
r4 = client.post("/api/auth/login", json={"email": "admin@ito.com", "password": "admin123"})
print(f"Login: {r4.status_code}")
token_admin = r4.json()["access_token"]

print("\n=== Admin /dashboard/stats ===")
r5 = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {token_admin}"})
print(f"Dashboard: {r5.status_code}")
print(f"Body: {r5.text[:300]}")
