@echo off
title ITO Backend Server
cd /d "%~dp0"
"C:\Users\ITO\Documents\Servicios_app\backend\venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0