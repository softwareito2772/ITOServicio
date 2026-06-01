@echo off
echo ============================================================
echo ITO SERVICIOS - INSTALACION SIMPLIFICADA
echo ============================================================
echo.

cd /d "%~dp0backend"

echo [1/5] Instalando FastAPI y dependencias basicas...
pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings python-multipart aiofiles 2>nul

echo [2/5] Instalando JWT...
pip install python-jose[cryptography] 2>nul

echo [3/5] Instalando Cloudinary...
pip install cloudinary 2>nul

echo [4/5] Instalando Excel...
pip install openpyxl 2>nul

echo [5/5] Instalando dateutil...
pip install python-dateutil 2>nul

echo.
echo ============================================================
echo INSTALACION COMPLETA
echo ============================================================
echo.
echo Ejecutando inicializacion de base de datos...
python init_db.py

echo.
echo ============================================================
echo INICIANDO SERVIDOR...
echo ============================================================
echo.
echo Backend estara en: http://localhost:8000
echo Documentacion API: http://localhost:8000/docs
echo.
echo Presiona CTRL+C para detener el servidor
echo.

uvicorn app.main:app --reload --port 8000 --host 0.0.0.0

pause
