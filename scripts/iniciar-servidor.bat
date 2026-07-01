@echo off
setlocal

where node >nul 2>nul
if errorlevel 1 goto :no_node

cd /d "%~dp0\.."

echo Instalando dependencias si hace falta...
call npm install
if errorlevel 1 goto :install_failed

echo.
echo Arrancando servidor y cliente de SIGRAM VISITAS...
echo Servidor:  http://localhost:4000
echo Cliente:   http://localhost:5173
echo.
call npm run dev
goto :eof

:no_node
echo No se encontro Node.js en el PATH. Instala Node.js desde https://nodejs.org y vuelve a intentarlo.
pause
goto :eof

:install_failed
echo Fallo la instalacion de dependencias (npm install).
pause
goto :eof
