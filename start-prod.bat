@echo off
setlocal

cd /d "%~dp0"

echo.
echo Local Muhasebe Takip Sistemi - Production Modu
echo ==============================================
echo.

echo [1/3] Prisma client uretiliyor...
call npm run prisma:generate
if errorlevel 1 goto error

echo.
echo [2/3] Production build hazirlaniyor...
call npm run build
if errorlevel 1 goto error

echo.
echo [3/3] Tarayici aciliyor ve server baslatiliyor...
start "" "http://localhost:3000"

echo.
echo Kapatmak icin bu pencerede Ctrl+C kullanin.
echo.
call npm run start
if errorlevel 1 goto error

pause
exit /b 0

:error
echo.
echo Production baslatma sirasinda hata olustu. Yukaridaki mesaji kontrol edin.
echo.
pause
exit /b 1
