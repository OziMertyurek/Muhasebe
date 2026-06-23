# v2.1.0 Final QA Checklist

Bu kontrol listesi v2.1.0 release oncesi yapilan genel urun QA kapsamini ozetler.

## Git ve Build

- [x] UI/UX Faz 1 commit'i mevcut.
- [x] UI/UX Faz 2 commit'i mevcut.
- [x] UI/UX Faz 3 commit'i mevcut.
- [x] Git status temiz kontrol edildi.
- [x] npm run lint gecti.
- [x] npm run build gecti.
- [x] npm run prisma:generate gecti.
- [x] npx prisma migrate status gecti.
- [x] npm run dist:portable gecti.
- [x] npm run dist:installer gecti.

## Windows Desktop Smoke Test

- [x] Portable build uretildi.
- [x] Installer build uretildi.
- [x] Login/PIN akisi onceki packaged testlerde dogrulandi.
- [x] Dashboard route kontrolu 500 vermedi.
- [x] Cariler/faturalar/giderler route kontrolleri 500 vermedi.
- [x] AI fatura okuma route kontrolu 500 vermedi.
- [x] Backup/System Status route kontrolleri 500 vermedi.
- [x] Veri klasorunu ac destek araci onceki packaged testte dogrulandi.
- [x] Log klasorunu ac destek araci onceki packaged testte dogrulandi.
- [x] Hata raporu disa aktar destek araci onceki packaged testte dogrulandi.
- [x] Uygulama kapaninca process temizligi onceki packaged testte dogrulandi.

## Guvenlik ve Veri

- [x] .env, .env.local, prisma/dev.db, storage, backup ZIP ve diagnostics raporlari commit'e alinmadi.
- [x] Hata raporu .env, gercek DATABASE_URL, tam AppData/DB path ve kullanici dosyasi icermeyecek sekilde tasarlandi.
- [x] AppData DB/bootstrap davranisi degismedi.
- [x] Backup/restore mantigi degismedi.

## macOS Notu

- [x] macOS arm64/x64 build altyapisi hazir.
- [x] macOS GitHub Actions workflow hazir.
- [x] macOS gercek cihaz testi daha sonra yapilacak.
- [x] macOS build unsigned/notarized oldugu icin Gatekeeper uyarisi release notlarinda belirtilmeli.

## v2.1.1 Security Smoke Checklist

- [x] Auth yokken `/exports/companies` 401 doner.
- [x] Auth yokken AI extraction POST route 401 doner.
- [x] Kotu Origin ile local POST 403 doner.
- [x] Kotu Host ile protected route 403 doner.
- [x] 5 hatali PIN denemesinden sonra login route 429 doner.
- [x] Dogru PIN sonrasi hatali deneme sayaci sifirlanir.
- [x] Packaged/production server `127.0.0.1` dinler.
- [x] `0.0.0.0:3000` listener gorunmez.
- [x] Diagnostics raporu `.env`, gercek `DATABASE_URL`, tam AppData/DB path, upload/fatura/backup dosyasi icermez.
- [x] `npm audit` temiz: `found 0 vulnerabilities`.
