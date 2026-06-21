# Electron Portable Build / Paketleme Plani

## Amac

Bu belge, mevcut local Next.js + Prisma + SQLite muhasebe uygulamasinin installer oncesi portable Electron build olarak nasil paketlenebilecegini planlar.

Bu asamada uygulama kodu, `package.json`, `next.config.ts`, Prisma schema, `DATABASE_URL`, DB yolu veya upload yolu degistirilmez. Amac, gercek paketleme calismasindan once secenekleri, riskleri ve uygulama sirasini netlestirmektir.

## Mevcut Durum

Mevcut Electron akisi:

- `electron:dev`
  - Port 3000'i kontrol eder.
  - Server yoksa `npm run dev` baslatir.
  - Electron penceresinde `http://localhost:3000` acar.
- `electron:prod`
  - Port 3000'i kontrol eder.
  - Server yoksa `.next/standalone/server.js` dosyasini baslatir.
  - `npm run build` daha once calistirilmis olmalidir.
- Port 3000 zaten doluysa mevcut server kullanilir.
- Electron sadece kendi baslattigi server process'ini kapatir.
- DB halen `prisma/dev.db` yolundadir.
- Upload halen `storage/uploads/` yolundadir.
- AppData DB bootstrap, portable build ve NSIS installer build akislari POC seviyesinde tamamlanmistir.

Bu yapi kaynak kod klasorunde calisir. Portable paketleme icin ayni yaklasimin dogrudan tasinmasi risklidir.

## Platform-aware Veri Klasoru Notu

Desktop veri klasoru helperlari platforma gore hazirlanmistir:

- Windows: `%APPDATA%/MuhasebeTakip/`
- macOS hedefi: `~/Library/Application Support/MuhasebeTakip/`
- Linux/test fallback: `~/.local/share/MuhasebeTakip/`

Her platformda ic yapi aynidir: `database/dev.db`, `uploads/`, `restore-backups/`, `backups/` ve `logs/`.

Normal web/local modda mevcut davranis degismez; DB `prisma/dev.db`, upload dosyalari `storage/uploads/` ve restore backup dosyalari `storage/restore-backups/` altinda kalir.

## macOS Build Config Hazirligi

Windows build akisi aktif kalir:

- `dist:portable`
- `dist:installer`
- `dist:win`

macOS build scriptleri Mac uzerinde calistirilmak uzere hazirlanmistir:

- `dist:mac`
- `dist:mac:arm64`
- `dist:mac:x64`

macOS electron-builder targetlari `dmg` ve `zip` olarak tanimlanmistir. Apple Silicon icin `arm64`, Intel Mac icin `x64` ayri test edilmelidir.

`assets/icon.icns` macOS icon dosyasi olarak eklendi. DMG/ZIP build sirasinda bu dosya kullanilacaktir.

macOS bundled Node ve bundled Python runtime dosyalari bu asamada eklenmedi. Windows `node.exe` ve Windows Python runtime macOS'ta kullanilamaz; macOS runtime bundle sonraki teknik asamadir.

## Bundled Runtime Path Standardi

Windows paketli runtime mevcut davranisini korur:

```text
resources/node/node.exe
resources/python/python.exe
```

macOS icin beklenen runtime klasorleri:

```text
resources/node/darwin-arm64/bin/node
resources/node/darwin-x64/bin/node
resources/python/darwin-arm64/bin/python3
resources/python/darwin-x64/bin/python3
```

Linux/test fallback icin ayni model kullanilir:

```text
resources/node/linux-x64/bin/node
resources/python/linux-x64/bin/python3
```

Packaged Electron once platform/arch uyumlu bundled runtime'i arar. Bulamazsa sistem runtime fallback denenir; Node hic bulunamazsa Turkce hata ekrani gosterilir. UI'da tam path, `DATABASE_URL` veya `.env` icerigi gosterilmez.

`scripts/electron-after-pack.js` Windows buildlerinde Windows runtime'i, macOS buildlerinde hedef arch'e uygun `darwin-arm64` veya `darwin-x64` runtime klasorunu kullanacak sekilde hazirlanmistir. macOS runtime dosyalari henuz bu Windows makinede uretilmez; Mac uzerinde hazirlanip test edilmelidir.

## Mevcut Production Yapisi Paketlenince Calisir Mi?

Bugunku `electron:prod` script'i su mantiga dayanir:

```bash
npm run build
npm run electron:prod
```

Electron main process ise production modda `.next/standalone/server.js` dosyasini Node child process olarak cagirir.

Paketlenmis bir Electron uygulamasinda bu yaklasim dogrudan garanti degildir:

- Son kullanici makinesinde `npm` bulunmayabilir.
- Paketlenmis uygulama icinde kaynak repo kok dizini olmayabilir.
- `next start` icin `.next/` build ciktilarinin dogru yerde bulunmasi gerekir.
- Runtime `node_modules` icerigi eksik veya asar icine gomulu olabilir.
- Prisma native bagimliliklari ve SQLite adapter paket icinde dogru cozulmelidir.
- `process.cwd()` paketlenmis ortamda gelistirme ortamindan farkli olabilir.

Sonuc:

- Mevcut `electron:prod`, gelistirme makinesinde production denemesi icin iyidir.
- Portable exe icin `npm run start` cagrisi uzun vadeli hedef olmamalidir.
- Paketlenmis runtime icin ya Next standalone server ya da paket icinde net bir server entrypoint tasarlanmalidir.

## Paketleme Secenekleri

### Secenek A: electron-builder ile portable exe + Next server dosyalari

Yaklasim:

- `electron-builder` eklenir.
- Electron main process packaged ortamda Next server'i baslatir.
- `.next/`, `public/`, gerekli `node_modules`, `prisma/` ve `python-worker/` paket icine dahil edilir.

Artular:

- Electron ekosistemi Windows portable exe icin olgun.
- Mevcut Electron main process mantigi kademeli uyarlanabilir.
- BrowserWindow, process yonetimi ve Windows entegrasyonu pratik.

Eksiler:

- `npm` cagrisi paketli ortamda guvenilir degildir.
- `.next` ve runtime `node_modules` secimi dikkat ister.
- Native moduller ve Prisma motorlari eksik kalabilir.
- Paket boyutu buyuk olabilir.

Degerlendirme:

- Ilk portable deneme icin kullanilabilir, fakat `npm run start` yerine paket icindeki server entrypoint hedeflenmelidir.

### Secenek B: Next.js standalone output

Yaklasim:

- `next.config.ts` icine ileride `output: "standalone"` eklenir.
- `next build` sonrasi `.next/standalone/` cikisi paketlenir.
- Electron main process packaged ortamda standalone `server.js` dosyasini Node child process olarak baslatir.
- `.next/static`, `public`, `prisma`, gerekli native dosyalar ve Python worker ek kaynak olarak dahil edilir.

Artular:

- Paketlenecek server dosyalari daha net ve daha kucuktur.
- `npm run start` ihtiyaci azalir.
- Next.js production server icin daha paketlenebilir bir yapi saglar.
- Portable exe icinde runtime server entrypoint daha deterministik olur.

Eksiler:

- Prisma ve native SQLite bagimliliklari yine ayrica test edilmelidir.
- `.next/static` ve `public` dogru konuma kopyalanmalidir.
- Build konumu ile packaged `resources` konumu arasinda path farklari dikkat ister.

Degerlendirme:

- Bu proje icin onerilen ana yoldur.
- Electron portable build oncesinde kucuk bir standalone proof-of-concept yapilmalidir.

### Secenek C: Next.js static export

Yaklasim:

- Next.js uygulamasini statik HTML/JS olarak export etmek.

Bu proje icin uygun degildir:

- Prisma SQLite server tarafinda calisir.
- API route'lar vardir.
- Server Action akislari vardir.
- File upload, backup/restore, PDF/CSV export ve AI extraction route'lari server gerektirir.
- Local DB ve dosya sistemi islemleri statik export ile calismaz.

Sonuc:

- Static export bu uygulama icin uygun degildir.
- Uygulama mutlaka local server runtime ile calismalidir.

### Secenek D: Mevcut web app + start-prod.bat ile devam

Yaklasim:

- Electron paketleme ertelenir.
- Kullanici `setup.bat`, `start-dev.bat` veya `start-prod.bat` ile calismaya devam eder.

Artular:

- En dusuk risk.
- Mevcut stabil yapi korunur.
- DB/upload davranisi degismez.

Eksiler:

- Gercek desktop deneyimi yoktur.
- Kullanici terminal ve Node.js kurulumu ile karsilasir.
- Portable exe hedefi ertelenir.

Degerlendirme:

- Kisa vadede fallback olarak kalmalidir.
- Desktop paketleme basarisiz olursa guvenli geri donus yoludur.

## Onerilen Yol

Bu proje icin en mantikli yol:

1. Once Next.js standalone output proof-of-concept.
2. Sonra Electron main process'in packaged ortamda standalone `server.js` baslatmasi.
3. Ardindan electron-builder ile portable target.
4. AppData DB/upload gecisi ayri ve kontrollu asama olarak ele alinmali.

Gerekce:

- Proje server runtime gerektirir.
- Prisma SQLite, backup/restore, file upload ve MarkItDown dosya sistemi erisimi ister.
- Static export uygun degildir.
- `npm run start` paketlenmis ortam icin kirilgan olabilir.
- Standalone output daha belirli bir server runtime saglar.

## Onerilen Portable Build Dosya Yapisi

Ilk portable hedef yapi ornegi:

```text
dist/
  MuhasebeTakip.exe
  resources/
    app/
      electron/
        main.js
        preload.js
      standalone/
        server.js
        node_modules/
        package.json
      .next/
        static/
      public/
      prisma/
        schema.prisma
        migrations/
      python-worker/
        extract_markdown.py
        requirements.txt
```

Notlar:

- Bu yapi nihai degildir; electron-builder ve Next standalone testinden sonra netlestirilmelidir.
- Runtime kullanici verisi bu klasorlerde tutulmamalidir.
- DB ve upload icin hedef uzun vadede AppData olmalidir.
- `.next/static` standalone cikti klasorunun icine otomatik kopyalanmadigi icin portable build adiminda ayrica dahil edilmelidir.
- Projede `public/` klasoru yoksa bu adim bos gecilebilir; ileride eklenirse paketlemeye dahil edilmelidir.

## electron-builder Stratejisi

Ileride eklenecek paket:

```bash
npm install --save-dev electron-builder
```

Olası hedef:

- Windows portable exe
- Windows NSIS setup installer

Olası build config ilkeleri:

- Dahil edilecekler:
  - `electron/main.js`
  - `electron/preload.js`
  - Next standalone cikisi
  - `.next/static`
  - `public`
  - `prisma/schema.prisma`
  - `prisma/migrations`
  - `python-worker`
  - gerekli runtime `node_modules`
- Haric tutulacaklar:
  - `.env`
  - `.env.local`
  - `storage/`
  - `prisma/dev.db`
  - `prisma/dev.db-journal`
  - `storage/uploads/`
  - `storage/restore-backups/`
  - `storage/restore-temp/`
  - `storage/backups/`
  - `storage/logs/`
  - test backup ZIP dosyalari
  - PDF/CSV ciktilari
  - gecici test dosyalari
  - dev server loglari
  - `.next/cache`
  - gereksiz dev dosyalari

Onemli:

- `electron-builder` eklenmeden once standalone output ve runtime server baslatma yerel olarak test edilmelidir.
- `asar` kullanimi native moduller ve Prisma dosyalari icin dikkat ister. Gerekirse belirli dosyalar `asarUnpack` ile disari alinmalidir.
- Standalone trace exclude POC sonucunda `.env`, `.env.local`, `prisma/dev.db`, `storage/`, ZIP/PDF/CSV ciktilari ve `*.log` dosyalari standalone ciktidan dusurulmustur.
- Standalone runtime icin `server.js`, Prisma Client, `better-sqlite3` native dosyasi, `prisma/schema.prisma` ve `prisma/migrations` mevcut kalmalidir.
- Yerel Electron production denemesinde standalone server sistem `node.exe` ile calistirilir; Electron binary'si Node runtime olarak kullanildiginda native `better-sqlite3` ABI uyusmazligi olusabilir.
- Packaged portable/installer build icin sistem Node.js'e bagimli kalmamak adina build sirasinda calisan `node.exe`, `resources/node/node.exe` altina kopyalanir.
- Packaged Electron main process, DB bootstrap ve standalone server baslatirken once bundled Node runtime'i kullanir; bundled runtime yoksa sistem `node.exe` fallback olarak denenir.
- Electron binary'sini `ELECTRON_RUN_AS_NODE=1` ile server runtime olarak kullanmak bu projede kisa vadede onerilmez; `better-sqlite3` native modulu Electron ABI ile uyumsuz hata verebilir.
- Node runtime hic bulunamazsa uygulama sessiz kapanmamalidir; `AppData/Roaming/MuhasebeTakip/logs/startup.log` dosyasina hata yazilmali ve Turkce hata ekrani gosterilmelidir.
- Electron production child process kaynak/local modda mevcut proje kokunu `APP_PROJECT_ROOT` ile ve mevcut SQLite DB'yi `DATABASE_URL=file:<proje>/prisma/dev.db` ile acik verir. Packaged modda AppData DB bootstrap devrededir.
- NSIS installer hedefinde masaustu ve Start Menu kisayollari olusturulur, kurulum tek kullanici modunda admin zorunlulugu olmadan denenir ve `deleteAppDataOnUninstall: false` ile AppData altindaki kullanici verisi otomatik silinmez.

## Ilk Portable Build POC Sonucu

Ilk portable build denemesinde `electron-builder` devDependency olarak eklendi ve Windows portable hedefi icin su scriptler hazirlandi:

- `prepare:standalone`
- `electron:pack`
- `dist:portable`
- `dist:win`

POC bulgulari:

- `npm run dist:portable` ilk POC'ta portable exe ve `dist/win-unpacked/` ciktisini uretti. Guncel urun dosya adi standardi `dist/Muhasebe-Takip-Portable-${version}.exe` seklindedir.
- `.env`, `.env.local`, `prisma/dev.db`, `prisma/dev.db-journal`, `storage/`, upload/restore-backup klasorleri, ZIP/PDF/CSV ciktilari ve log dosyalari paket ciktisina dahil edilmedi.
- `.next/standalone` icinde onceki paket ciktisi kalirsa `dist/` agaci tekrar pakete sizabiliyor. Bu nedenle `scripts/prepare-standalone.js` standalone icindeki `dist`, `storage` ve local DB dosyalarini temizler.
- Electron-builder normal `files` / `extraResources` akisi nested standalone `node_modules` agacini eksik tasiyabildi. Bu nedenle `scripts/electron-after-pack.js` hook'u `.next/standalone` ciktisini portable arsiv uretilmeden once `resources/standalone` altina dogrudan kopyalar.
- `npmRebuild: false` kullanildi. Ilk denemede Electron 42 ABI ile `better-sqlite3` rebuild hatasi olustu; bu POC'ta standalone server sistem Node ile calistigi icin Electron'a gore rebuild devre disi birakildi.
- `asar: false` kullanildi. Bu POC icin pratik olsa da final paketleme asamasinda `asar` + `asarUnpack` stratejisi tekrar degerlendirilmelidir.
- Ilk POC'ta AppData DB/bootstrap henuz yapilmadigi icin paketli calistirmada `/onboarding` HTTP 500 alindi. Sonraki AppData DB bootstrap entegrasyonu ile bu sorun giderildi ve packaged `/onboarding` 200/yonlendirme davranisi dogrulandi.
- Kaynak modda `npm run dev`, `npm run electron:dev` ve `npm run electron:prod` HTTP 200 ile calismaya devam etti.

Sonuc: Portable exe uretimi basarili POC seviyesine geldi; kullanilabilir desktop dagitim icin siradaki kritik is AppData DB/bootstrap entegrasyonudur.

## Ilk Windows Setup Installer Denemesi

Portable hedef korunarak NSIS setup installer hedefi eklendi:

- `dist:portable`: portable exe uretir.
- `dist:installer`: NSIS setup exe uretir.
- `dist:win`: portable ve installer hedeflerini birlikte uretir.

Installer ayarlari:

- Product name: `Muhasebe Takip`
- App id: `com.ozimertyurek.muhasebetakip`
- Version standardi: `package.json` ve uygulama ici `appInfo.version` ayni tutulur.
- Setup dosya adi: `Muhasebe-Takip-Setup-${version}.exe`
- Portable dosya adi: `Muhasebe-Takip-Portable-${version}.exe`
- Tek kullanici kurulumu hedeflenir (`perMachine: false`).
- Admin zorunlulugu istenmez (`allowElevation: false`).
- Masaustu kisayolu olusturulur.
- Start Menu kisayolu olusturulur.
- Kaldirma sirasinda AppData altindaki `MuhasebeTakip` verisi otomatik silinmez.

Installer paketine alinmayacak dosyalar:

- `.env`, `.env.local`, `.env.*`
- `prisma/dev.db`, `prisma/dev.db-journal`, `*.db`, `*.db-journal`
- `storage/`, `storage/uploads/`, `storage/restore-backups/`
- `dist/`, `.git`, log dosyalari
- ZIP/PDF/CSV ciktilari ve gecici test dosyalari

Installer smoke testte kontrol edilecekler:

- Setup exe uretilir.
- Kurulum tamamlanir.
- Kurulu uygulama acilir.
- `/onboarding` HTTP 200 doner veya onboarding tamamli AppData durumunda dashboard'a yonlenir.
- AppData DB bootstrap calisir ve mevcut DB uzerine yazilmaz.
- Masaustu ve Start Menu kisayollari olusur.
- Uygulama kapaninca sadece kendi baslattigi server process'i kapanir.
- Uninstall denenirse AppData verisi korunur.

## Urun Adi ve Surum Standardi

Desktop dagitimlarinda kullanilacak standartlar:

- Uygulama adi / productName: `Muhasebe Takip`
- App id: `com.ozimertyurek.muhasebetakip`
- Pencere basligi: `Muhasebe Takip`
- Icon dosyasi: `assets/icon.ico`
- Setup artifact: `Muhasebe-Takip-Setup-${version}.exe`
- Portable artifact: `Muhasebe-Takip-Portable-${version}.exe`
- Version kaynagi: `package.json` ve `src/lib/app-info.ts` birlikte guncellenir.

`dist/` altindaki portable, setup ve unpacked ciktilar Git'e alinmaz. Paketli modda AppData DB bootstrap calisir ve mevcut AppData verisi uzerine yazilmaz.

v2.0.0 desktop release hazirliginda guncel urun ciktisi adlari:

- Setup artifact: `Muhasebe-Takip-Setup-2.0.0.exe`
- Portable artifact: `Muhasebe-Takip-Portable-2.0.0.exe`
- System Status surumu: `2.0.0`

v2.0.1 patch release hazirliginda guncel urun ciktisi adlari:

- Setup artifact: `Muhasebe-Takip-Setup-2.0.1.exe`
- Portable artifact: `Muhasebe-Takip-Portable-2.0.1.exe`
- System Status surumu: `2.0.1`

Final release testinde setup/portable build, Node PATH olmadan installed app, AppData DB bootstrap, onboarding, PIN/login, backup ZIP, CSV/PDF export, AI fatura okuma ve uninstall sonrasi AppData veri koruma akislari dogrulanmistir.

## Desktop Icon Packaging

Electron desktop paketlerinde ikon kaynagi `assets/icon.ico` dosyasidir:

- Electron BrowserWindow pencere ikonu `assets/icon.ico` ile acilir.
- electron-builder `icon` ve Windows `win.icon` ayarlari ayni dosyayi kullanir.
- Portable exe, NSIS setup installer, masaustu kisayolu ve Start Menu kisayolu bu ikonu kullanir.
- `assets/icon.png` yalnizca kaynak/preview dosyasidir.
- macOS build icin electron-builder `mac.icon` ayari `assets/icon.icns` dosyasini kullanir.
- Gercek marka ikonu hazirlandiginda `assets/icon.ico`, `assets/icon.png` ve `assets/icon.icns` ayni dosya adlariyla degistirilebilir.

## Packaged Download Handling

Packaged Electron uygulamasinda backup ve export indirmeleri tarayici disinda Electron download katmaniyla yonetilir:

- `will-download` event'i backup ZIP, veritabani yedegi, CSV export ve PDF export icin tek noktadan yakalanir.
- Dosyalar varsayilan olarak kullanicinin `Downloads/MuhasebeTakip` klasorune kaydedilir.
- Dosya adlari path traversal riskine karsi temizlenir; slash, backslash, `..` ve Windows icin gecersiz karakterler kaldirilir.
- Ayni dosya adi varsa mevcut dosyanin uzerine yazilmaz, sirali benzersiz ad uretilir.
- Backup ve export UI baglantilari native anchor olarak tutulur; attachment route'lari Next.js client-side navigation ile acilirsa dosya kaydetme davranisi kirilabilir.
- Backend backup/export auth davranisi ve cookie ayarlari degistirilmez.
- UI veya hata ekranlarinda `DATABASE_URL`, `.env` icerigi ya da tam local path gosterilmez.
- Packaged download handling smoke testte tam yedek ZIP, CSV export ve PDF export dosyalarinin diskte olustugu dogrulandi.

Download smoke testte kontrol edilecekler:

- Tam yedek ZIP diskte olusur.
- ZIP icinde `database/dev.db`, `backup-info.json` ve upload klasoru bilgisi bulunur.
- ZIP icinde `.env`, `.env.local`, `node_modules`, `.next` veya build ciktisi bulunmaz.
- En az bir CSV export ve bir PDF export diskte olusur.
- Test indirme dosyalari Git adayina girmez ve test sonunda temizlenir.

## Prisma Stratejisi

Prisma icin dikkat edilmesi gerekenler:

- Prisma Client paketlenmis uygulama icinde generate edilmis olmalidir.
- Native SQLite adapter ve `better-sqlite3` dosyalari paket icinde calismalidir.
- `prisma/schema.prisma` ve `prisma/migrations` desktop bootstrap/migration icin gerekebilir.
- `DATABASE_URL` paketleme asamasinda kaynak repo DB'sine baglanmamalidir.
- Packaged modda Electron main process Next server'i baslatmadan once `DATABASE_URL=file:<AppData>/MuhasebeTakip/database/dev.db` set eder.

Gecis sirasi:

1. Portable build ilk denemede mevcut `prisma/dev.db` davranisi bozulmadan test edilebilir.
2. Kalici desktop kullanima gecmeden once AppData DB bootstrap tamamlanmalidir.
3. AppData DB yoksa migration calistirma veya local DB copy akisi ayri helper ile ele alinmalidir.
4. AppData DB varsa asla otomatik overwrite edilmemelidir.

Oneri:

- AppData DB entegrasyonu portable build'den hemen once veya portable proof-of-concept'ten hemen sonra yapilmali.
- Son kullaniciya verilecek portable/installer surumde DB uygulama kurulum klasorunde kalmamalidir.

## Python / MarkItDown Stratejisi

Guncel paketli Windows stratejisi:

- v2.0.1 itibariyla packaged Windows app, son kullanici bilgisayarinda sistem Python kurulumu gerektirmeden MarkItDown kullanacak sekilde hazirlanir.
- `python-worker/` paket icine kaynak olarak dahil edilir.
- `prepare:bundled-python` build adimi yerel Python runtime'ini ve kurulu MarkItDown bagimliliklarini `build/python` altina hazirlar.
- `scripts/electron-after-pack.js`, hazirlanan runtime'i packaged app icinde `resources/python` altina kopyalar.
- Electron packaged modda standalone server child process ortaminda `BUNDLED_PYTHON_PATH` ve `MARKITDOWN_PYTHON` degerlerini paketli `python.exe` icin set eder.
- `src/lib/python-runtime-utils.ts` once paketli Python'i, sonra sistem `py` / `python` fallback komutlarini dener.
- System Status paneli paketli Python ve MarkItDown worker durumunu path veya DATABASE_URL gostermeden raporlar.

Notlar:

- Paketli Python runtime Git'e alinmaz; `build/python`, `dist/`, `.next` ve packaged ciktilar commit disinda tutulmalidir.
- Paket boyutu Python runtime ve MarkItDown bagimliliklari nedeniyle belirgin artar; v2.0.1 dogrulamasinda portable exe yaklasik 209 MB, setup exe yaklasik 277 MB olmustur.
- Python ve ucuncu taraf paket lisanslari release oncesi ayrica gozden gecirilmelidir.
- Antivirus false-positive riski ve runtime update stratejisi sonraki release testlerinde tekrar izlenmelidir.
- AI metin cikarma calismasa bile ana muhasebe, fatura, rapor, backup/restore modulleri calismalidir.

## Riskler

Baslica riskler:

- Packaged app icinde `npm` bulunmaz.
- `next start` paketlenmis ortamda calismaz.
- `.next` veya standalone dosyalari eksik kalir.
- `.next/static` yanlis konuma kopyalanir.
- Prisma Client veya native engine/adaptor eksik kalir.
- `better-sqlite3` native dosyalari asar icinde calismaz.
- `DATABASE_URL` yanlis DB'ye bakar.
- `prisma/dev.db` paket icine girer ve kullanici verisi uygulama klasorune yazilir.
- Upload/backup klasorleri app kurulum klasorunde kalirsa update veya silme sirasinda veri kaybi olur.
- Python bulunamaz veya MarkItDown kurulu degildir.
- Port 3000 baska uygulama tarafindan kullanilir.
- Electron kapaninca server process acik kalir.
- `.env`, local path veya gizli bilgi UI'da gorunur.
- Backup ZIP icine yanlis dosyalar girer.

Risk azaltma:

- `npm run start` yerine standalone `server.js` hedeflenmeli.
- AppData DB/upload gecisi paketleme oncesi netlestirilmeli.
- `app-paths.ts` tum dosya erisimleri icin tek kaynak olmali.
- Portable smoke testte bos DB, dolu DB, upload, backup/restore, AI worker ve PIN/onboarding test edilmeli.
- Paket iceriği explicit include/exclude listesiyle yonetilmeli.

## Test Plani

Portable paketleme oncesi testler:

1. Web/dev regresyon:
   - `npm run dev`
   - Ana sayfalar HTTP 200
   - Backup/restore ve upload bozulmuyor

2. Electron dev:
   - `npm run electron:dev`
   - Port bosken dev server otomatik aciliyor
   - Port doluyken mevcut server kullaniliyor
   - Kapanista sadece kendi server'i kapaniyor

3. Electron production:
   - `npm run build`
   - `npm run electron:prod`
- Port bosken standalone `server.js` aciliyor
   - Port doluyken mevcut server kullaniliyor
   - Kapanista sadece kendi server'i kapaniyor

4. Standalone proof-of-concept:
   - `output: "standalone"` ile `.next/standalone/server.js` olusur
   - Standalone `server.js` lokal baslatilir
   - Prisma sorgulari ve API route'lar route uzerinden dogrulanir
   - `.next/static` standalone yanina ayrica kopyalanmalidir
   - Build trace ciktisi yasakli veri/log dosyalari icin incelenmelidir

5. Portable smoke test:
   - Temiz klasorde exe acilir
   - PIN/onboarding calisir
   - Dashboard acilir
   - CRUD temel akislari calisir
   - Dosya upload calisir
   - Backup/restore calisir
   - CSV/PDF export calisir
   - AI extraction ve MarkItDown hata/uyari akisi calisir

## Uygulama Asamalari

### A. Next standalone output arastirmasi

- `next.config.ts` icinde `output: "standalone"` deneme branch'inde test edilir.
- `.next/standalone/server.js` calistirilir.
- Mevcut server route'lari ve Prisma calisir mi dogrulanir.
- POC sonucu: standalone server lokal olarak calismistir; `/onboarding` 200 donmus, korumali route'lar onboarding yonlendirmesi vermistir.
- `next start`, standalone modda uyarili calisir; Electron production akisi `node .next/standalone/server.js` kullanacak sekilde guncellenmistir.
- `.next/standalone` ciktisi paketleme oncesinde temizlenmelidir; trace genis dosya agaci, loglar, `storage` ve `prisma/dev.db` gibi istenmeyen dosyalari yakalayabilir.
- PDF export tarafinda Windows font path trace uyarisi gorulebilir; portable paketlemeden once font/resource stratejisi netlestirilmelidir.

### B. Electron packaged runtime script hazirligi

- Electron main process, dev/prod modlara ek olarak packaged mode'u ayirt eder.
- Packaged mode'da `npm` yerine standalone `server.js` baslatilir.
- Server portu ve process cleanup tekrar test edilir.

### C. electron-builder config

- `electron-builder` devDependency olarak eklenir.
- Portable target ayarlanir.
- Include/exclude listesi net yazilir.
- Native moduller ve Prisma dosyalari icin `asarUnpack` gereksinimi test edilir.

### D. Portable exe build

- `npm run build`
- Electron portable build komutu
- Dist klasoru incelenir.
- Yasakli dosyalarin pakete girmedigi kontrol edilir.

### E. Portable smoke test

- Temiz klasorde portable exe denenir.
- Ana akislarda smoke test yapilir.
- Process cleanup, port cakismasi ve hata ekranlari kontrol edilir.

### F. AppData DB entegrasyonu

- AppData DB/bootstrap helper gercek runtime'a baglanir.
- `DATABASE_URL` Electron main process tarafindan server baslamadan once set edilir.
- Upload ve backup pathleri AppData hedeflerine tasinir.

### G. Installer / setup.exe

- Portable test stabil olduktan sonra NSIS installer hedefi eklenir.
- AppData verisinin update ve uninstall sirasinda korunmasi test edilir.
- Masaustu ve Start Menu kisayollari eklenir.
- Installer ciktisi `dist/` altinda kalir ve Git'e alinmaz.

## Sonraki Onerilen Adim

Sonraki teknik adim, `output: "standalone"` icin ayri ve kucuk bir proof-of-concept yapmaktir. Bu adimda Electron builder eklenmeden once standalone server'in Prisma, API route, Server Action, upload, backup/restore ve export akislariyla uyumlu oldugu dogrulanmalidir.
