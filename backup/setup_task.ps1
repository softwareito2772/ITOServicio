$Action = New-ScheduledTaskAction -Execute "C:\Users\ITO\Documents\Servicios_app\backend\venv\Scripts\python.exe" -Argument "C:\Users\ITO\Documents\Servicios_app\backup\backup_db.py"
$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At "7:00PM"
$Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd
Register-ScheduledTask -TaskName "ITO Backup PostgreSQL" -Action $Action -Trigger $Trigger -Settings $Settings -Description "Backup semanal de PostgreSQL ITO Servicios" -Force
