@echo off
setlocal

cd /d "%~dp0"

echo.
echo Local Muhasebe Takip Sistemi - Ilk Kurulum
echo ==========================================
echo.

echo [1/3] Bagimliliklar kuruluyor...
call npm install
if errorlevel 1 goto error

echo.
echo [2/3] Prisma client uretiliyor...
call npm run prisma:generate
if errorlevel 1 goto error

echo.
echo [3/3] Veritabani migration islemi calistiriliyor...
call npx prisma migrate dev
if errorlevel 1 goto error

echo.
echo Kurulum tamamlandi. start-dev.bat ile baslatabilirsiniz.
echo.
pause
exit /b 0

:error
echo.
echo Kurulum sirasinda hata olustu. Yukaridaki mesaji kontrol edin.
echo.
pause
exit /b 1
