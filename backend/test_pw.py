from app.database import SessionLocal
from app.models import User
from app.auth import verify_password, hash_password

db = SessionLocal()
u = db.query(User).filter(User.email == "superadmin@itoservicio.com").first()
if u:
    pw = "$Jafet2213$"
    print(f"hash: {u.password_hash[:50]}...")
    result = verify_password(pw, u.password_hash)
    print(f"password match: {result}")
    
    # Also test creating and verifying
    new_hash = hash_password(pw)
    print(f"new hash: {new_hash[:50]}...")
    print(f"new verify: {verify_password(pw, new_hash)}")
else:
    print("User not found")
db.close()
