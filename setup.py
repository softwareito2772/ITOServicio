import os

os.system('mkdir /tmp/ito_assets 2>/dev/null || true')

print("=" * 60)
print("ITO SERVICIOS - CONFIGURACIÓN RÁPIDA")
print("=" * 60)

print("\n📦 1. Instalando dependencias del backend...")
os.system('cd backend && pip install -r requirements.txt -q')

print("\n⚙️ 2. Configurando variables de entorno...")
if not os.path.exists('backend/.env'):
    with open('backend/.env', 'w') as f:
        f.write("""SECRET_KEY=ito-secret-key-change-in-production
CLOUDINARY_CLOUD_NAME=demo
CLOUDINARY_API_KEY=demo
CLOUDINARY_API_SECRET=demo
""")
    print("   ✓ Archivo .env creado")

print("\n🗄️ 3. Creando base de datos...")
os.system('cd backend && python init_db.py')

print("\n🎨 4. Instalando dependencias del frontend...")
os.system('cd frontend && npm install -q')

print("\n" + "=" * 60)
print("✅ CONFIGURACIÓN COMPLETA")
print("=" * 60)
print("\n📍 Para ejecutar:")
print("   Backend: cd backend && uvicorn app.main:app --reload --port 8000")
print("   Frontend: cd frontend && npm run dev")
print("\n🌐 URLs:")
print("   Frontend: http://localhost:3000")
print("   API Docs: http://localhost:8000/docs")
print("\n🔐 Credenciales:")
print("   admin@ito.com / admin123")
print("=" * 60)
