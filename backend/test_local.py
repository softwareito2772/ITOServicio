import os
os.environ["DATABASE_URL"] = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Login
r = client.post("/api/auth/login", json={"email": "admin@ito.com", "password": "admin123"})
print(f"Login: {r.status_code}")
token = r.json()["access_token"]
HA = {"Authorization": f"Bearer {token}"}

r = client.post("/api/auth/login", json={"email": "superadmin@itoservicio.com", "password": "$Jafet2213$"})
HSA = {"Authorization": f"Bearer {r.json()['access_token']}"}

print("\n=== Companies ===")
r = client.get("/api/companies/", headers=HSA)
print(f"  {r.status_code} | {r.text[:300]}")

print("\n=== Create Category ===")
r = client.post("/api/categories/", headers=HA, json={"name": "Test", "type": "product"})
print(f"  {r.status_code} | {r.text[:300]}")

print("\n=== Create Equipment ===")
r = client.post("/api/equipment/", headers=HA, json={"client_id": 1, "type_name": "PC", "model": "X", "serial_number": "X1"})
print(f"  {r.status_code} | {r.text[:300]}")

print("\n=== Dashboard ===")
r = client.get("/api/dashboard/stats", headers=HA)
print(f"  {r.status_code} | {r.text[:300]}")
