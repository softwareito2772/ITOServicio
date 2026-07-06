@echo off
cd /d "%~dp0"
set "NODE_PATH=C:\Users\ITO\AppData\Local\Programs\node-v20.18.0-win-x64"
set "PATH=%NODE_PATH%;%PATH%"

echo.
echo ========================================
echo   ITO SERVICIOS - INICIANDO
echo ========================================
echo.

echo [1/2] Iniciando Backend (SQLite) en puerto 8000...
cd backend
start "Backend_ITO" cmd /k "call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000 --host 0.0.0.0"

timeout /t 5 /nobreak > nul

echo [2/2] Iniciando Frontend en puerto 3005...
cd ..\frontend
start "Frontend_ITO" cmd /k "npm run dev -- --hostname 0.0.0.0"

echo.
echo ========================================
echo   SERVIDORES INICIADOS
echo ========================================
echo.
echo   Acceso local:     http://localhost:3005
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set "LOCAL_IP=%%a"
)
set "LOCAL_IP=%LOCAL_IP: =%"

if defined LOCAL_IP (
    echo   Acceso celular:   http://%LOCAL_IP%:3005
    echo.
    echo   Abre esta URL en el navegador de tu celular:
    echo   http://%LOCAL_IP%:3005
)

echo.
echo   Base de datos:    SQLite (backend/servicios.db)
echo.
echo   Credenciales:
echo   admin@ito.com / admin123
echo.
echo   Presiona ENTER para abrir navegador...
pause > nul

start http://localhost:3005

echo.
echo LISTO! Los servidores estan corriendo.
echo Cierra las ventanas de comandos para detenerlos.
pause
