@echo off
cd /d "%~dp0"
cd backend
echo Iniciando backend en puerto 8000...
call venv\Scripts\activate.bat
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
pause
