@echo off
echo.
echo  ================================
echo   APP DELIVERY - Iniciando...
echo  ================================
echo.

cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERRO] Node.js nao encontrado!
    echo.
    echo  Acesse: https://nodejs.org
    echo  Baixe e instale a versao LTS.
    echo  Depois execute este arquivo novamente.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo  Instalando dependencias pela primeira vez...
    npm install
    echo.
)

echo  Abrindo no navegador em segundos...
timeout /t 2 /nobreak >nul
start http://localhost:3000

node server.js
pause
