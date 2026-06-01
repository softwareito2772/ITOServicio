@echo off
cd /d "%~dp0"
set "NODE_PATH=C:\Users\ITO\AppData\Local\Programs\node-v20.18.0-win-x64"
set "PATH=%NODE_PATH%;%PATH%"

echo.
echo ========================================
echo   ITO SERVICIOS - INICIANDO
echo ========================================
echo.

echo Iniciando Backend en puerto 8000...
cd backend
start "Backend_ITO" cmd /k "call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000 --host 0.0.0.0"

timeout /t 5 /nobreak > nul

echo Iniciando Frontend en puerto 3005...
cd ..\frontend
start "Frontend_ITO" cmd /k "npm run dev"

echo.
echo ========================================
echo   SERVIDORES INICIADOS
echo ========================================
echo.

echo   Abrir en navegador:
echo   http://localhost:3005
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