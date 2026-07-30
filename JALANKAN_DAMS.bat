@echo off
TITLE DAMS - Server Launcher
COLOR 0B

echo ====================================================
echo    CV HASIL BAROKAH MANDIRI - DAMS LAUNCHER
echo    Daily Activity Monitoring System
echo ====================================================
echo.
echo Menjalankan PowerShell Script...

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dams-servers.ps1"

pause
