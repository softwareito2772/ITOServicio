import psycopg2

RENDER_DB_URL = "postgresql://ito_db_user:dOyAcW55XEccCoBAXCsntaaztNxrN3tc@dpg-d8evdak2m8qs73dkjrl0-a.oregon-postgres.render.com/ito_db"

conn = psycopg2.connect(RENDER_DB_URL)
conn.autocommit = True
cur = conn.cursor()

# Step 1: Alter column type to VARCHAR FIRST
print("Step 1: Altering column type to VARCHAR...")
cur.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20) USING role::text")
print("Done")

# Step 2: Now update to lowercase
print("Step 2: Normalizing role values to lowercase...")
cur.execute("SELECT id, role FROM users")
users = cur.fetchall()
for uid, role in users:
    lower_role = role.lower()
    if role != lower_role:
        cur.execute("UPDATE users SET role = %s WHERE id = %s", (lower_role, uid))
        print(f"  Fixed user {uid}: '{role}' -> '{lower_role}'")
    else:
        print(f"  User {uid}: '{role}' (already lowercase)")

# Step 3: Drop the old enum type
print("Step 3: Dropping enum type...")
try:
    cur.execute("DROP TYPE IF EXISTS userrole CASCADE")
    print("  Dropped userrole enum type")
except Exception as e:
    print(f"  Note: {e}")

# Step 4: Verify
print("\nStep 4: Verification")
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role'")
print(f"  Column type: {cur.fetchone()}")

cur.execute("SELECT id, email, role FROM users ORDER BY id")
for row in cur.fetchall():
    print(f"  User {row[0]}: {row[1]} -> role='{row[2]}'")

cur.close()
conn.close()
print("\nMigration complete!")
