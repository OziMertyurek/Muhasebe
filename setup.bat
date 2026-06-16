@echo off
setlocal

cd /d "%~dp0"

echo.
echo Local Muhasebe Takip Sistemi - Ilk Kurulum
echo ==========================================
echo.

echo [1/4] Bagimliliklar kuruluyor...
call npm install
if errorlevel 1 goto error

echo.
echo [2/4] Prisma client uretiliyor...
call npm run prisma:generate
if errorlevel 1 goto error

echo.
echo [3/4] Veritabani migration islemi calistiriliyor...
call npx prisma migrate dev
if errorlevel 1 goto error

echo.
echo [4/4] MarkItDown Python worker kurulumu kontrol ediliyor...
if exist "python-worker\requirements.txt" (
  py --version >nul 2>nul
  if errorlevel 1 (
    echo Python launcher bulunamadi. MarkItDown kurulumu atlandi.
    echo AI fatura metni cikarma icin Python kurup daha sonra su komutu calistirabilirsiniz:
    echo py -m pip install -r python-worker\requirements.txt
  ) else (
    call py -m pip install -r python-worker\requirements.txt
    if errorlevel 1 goto error
  )
) else (
  echo python-worker\requirements.txt bulunamadi. Bu adim atlandi.
)

echo.
echo Kurulum tamamlandi. start-dev.bat veya start-prod.bat ile baslatabilirsiniz.
echo.
pause
exit /b 0

:error
echo.
echo Kurulum sirasinda hata olustu. Yukaridaki mesaji kontrol edin.
echo.
pause
exit /b 1
