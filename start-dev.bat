@echo off
setlocal

cd /d "%~dp0"

echo.
echo Local Muhasebe Takip Sistemi - Gelistirme Modu
echo ==============================================
echo.

echo Prisma client kontrol ediliyor...
call npm run prisma:generate
if errorlevel 1 goto error

echo.
echo Tarayici aciliyor: http://localhost:3000
start "" "http://localhost:3000"

echo.
echo Local server baslatiliyor...
echo Kapatmak icin bu pencerede Ctrl+C kullanin.
echo.
call npm run dev
if errorlevel 1 goto error

pause
exit /b 0

:error
echo.
echo Baslatma sirasinda hata olustu. Yukaridaki mesaji kontrol edin.
echo.
pause
exit /b 1
