@echo off
REM ==========================================================================
REM  Logs del sistema en tiempo real. Doble clic para abrir.
REM  Lanza scripts\ver-logs.ps1 (ahi esta toda la explicacion).
REM
REM  -ExecutionPolicy Bypass: Windows bloquea por defecto los scripts .ps1
REM  descargados; esto lo permite SOLO para esta ejecucion, sin cambiar la
REM  configuracion del equipo.
REM  (Sin tildes a proposito: cmd.exe no las muestra bien en archivos .bat)
REM ==========================================================================
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ver-logs.ps1" %*
echo.
pause
