@echo off
cd /d "%~dp0"
set "NODE_PATH=C:\Users\ITO\AppData\Local\Programs\node-v20.18.0-win-x64"
set "PATH=%NODE_PATH%;C:\Users\ITO\AppData\Local\ngrok;%PATH%"

if not exist "%~dp0logs" mkdir "%~dp0logs"
echo [%date% %time%] ITO Servicios - Auto-starting... >> "%~dp0logs\startup.log"

REM === START BACKEND (SQLite) ===
echo [%date% %time%] Starting Backend on port 8000... >> "%~dp0logs\startup.log"
cd backend
start "Backend_ITO" /min cmd /c "call venv\Scripts\activate.bat && uvicorn app.main:app --port 8000 --host 0.0.0.0 >> ..\logs\backend.log 2>&1"
cd ..

timeout /t 8 /nobreak > nul

REM === START FRONTEND (production) ===
echo [%date% %time%] Starting Frontend on port 3005... >> "%~dp0logs\startup.log"
cd frontend
start "Frontend_ITO" /min cmd /c "npx next start -p 3005 -H 0.0.0.0 >> ..\logs\frontend.log 2>&1"
cd ..

timeout /t 5 /nobreak > nul

REM === START NGROK TUNNEL ===
echo [%date% %time%] Starting ngrok tunnel... >> "%~dp0logs\startup.log"
start "Ngrok_ITO" /min cmd /c "ngrok http 8000 --log=stdout >> ..\logs\ngrok.log 2>&1"
timeout /t 5 /nobreak > nul

REM === LOG FINAL ===
echo [%date% %time%] All services started successfully >> "%~dp0logs\startup.log"
echo. >> "%~dp0logs\startup.log"
