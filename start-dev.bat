@echo off
title Omni-Resto Dev Launcher
echo ===================================================
echo   DANG KHOI CHAY MOI TRUONG PHAT TRIEN OMNI-RESTO
echo ===================================================

:: 1. Kiem tra va khoi dong Laragon neu chua chay
tasklist /FI "IMAGENAME eq laragon.exe" 2>NUL | find /I /N "laragon.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo [1/3] Dang khoi dong Laragon...
    start "" "C:\laragon\laragon.exe"
    timeout /t 3 /nobreak >nul
) else (
    echo [1/3] Laragon da duoc bat.
)

:: 2. Bat Backend Spring Boot o cua so rieng
echo [2/3] Dang bat Backend Spring Boot (Port 8080)...
start "Backend - Spring Boot" cmd /k "cd backend && .\mvnw.cmd spring-boot:run"

:: 3. Cho 2 giay roi bat Frontend Vite o cua so rieng
timeout /t 2 /nobreak >nul
echo [3/3] Dang bat Frontend Vite (Port 5173)...
start "Frontend - Vite React" cmd /k "cd frontend && pnpm run dev"

echo.
echo ===================================================
echo Tat ca da san sang! 
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:8080
echo ===================================================
pause