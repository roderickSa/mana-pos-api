@echo off
REM Instala Mana POS como servicio de Windows con NSSM.
REM Ejecutar como administrador. Ajusta las rutas/valores si difieren.

set NSSM=C:\nssm\nssm.exe
set APP_DIR=C:\mana\mana-pos-api
set NPX=C:\Program Files\nodejs\npx.cmd

if not exist "%NSSM%" (
  echo No se encontro NSSM en %NSSM%. Descargalo de https://nssm.cc y descomprime nssm.exe ahi.
  exit /b 1
)

mkdir "%APP_DIR%\logs" 2>nul

"%NSSM%" install ManaPOS "%NPX%" tsx src/main.ts
"%NSSM%" set ManaPOS AppDirectory "%APP_DIR%"
"%NSSM%" set ManaPOS AppEnvironmentExtra MANA_DEVICES_MODE=real MANA_PRINTER_INTERFACE=printer:POS80 MANA_PRINTER_PAPER_MM=80 MANA_SCALE_SERIAL_PATH=COM3 MANA_SCALE_BAUD_RATE=9600
"%NSSM%" set ManaPOS AppStdout "%APP_DIR%\logs\mana.log"
"%NSSM%" set ManaPOS AppStderr "%APP_DIR%\logs\mana-error.log"
"%NSSM%" set ManaPOS Start SERVICE_AUTO_START
"%NSSM%" start ManaPOS

echo.
echo Listo: el servicio ManaPOS quedo instalado y corriendo.
echo Abre http://localhost:3210 en el navegador (PIN inicial: 1234).
