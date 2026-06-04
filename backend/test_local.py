import sys
sys.path.insert(0, ".")
from app.database import SessionLocal
from app.models import User
from app.auth import verify_password, _role_str

db = SessionLocal()
for email in ["superadmin@itoservicio.com", "admin@ito.com"]:
    u = db.query(User).filter(User.email == email).first()
    if u:
        pw = "$Jafet2213$" if "superadmin" in email else "admin123"
        ok = verify_password(pw, u.password_hash)
        print(f"{email}: role={u.role} role_str={_role_str(u)} password_ok={ok}")
    else:
        print(f"{email}: NOT FOUND")
db.close()
