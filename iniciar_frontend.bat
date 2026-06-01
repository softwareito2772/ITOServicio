@echo off
cd /d "%~dp0"
cd frontend
set "NODEJS=C:\Users\ITO\AppData\Local\Programs\node-v20.18.0-win-x64"
set "PATH=%NODEJS%;%PATH%"
echo Iniciando frontend en PUERTO 3005...
echo Abre: http://localhost:3005
"%NODEJS%\npm.cmd" run dev
pause