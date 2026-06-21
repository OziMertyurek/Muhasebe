# macOS Uyumluluk Plani

## Amac

Bu belge, Muhasebe Takip uygulamasinin mevcut Windows desktop paketleme mimarisinden macOS uyumlu bir desktop dagitimina nasil tasinabilecegini planlar.

Bu asamada kod, `package.json`, electron-builder konfigurasyonu, Prisma schema, DB yolu veya `DATABASE_URL` degistirilmez. Amac; veri klasoru, native runtime, Node/Python paketleme, Prisma/SQLite uyumlulugu, signing/notarization ve test risklerini netlestirmektir.

## Mevcut Windows Durumu

Mevcut v2.0.1 Windows desktop mimarisi:

- Electron uygulamasi BrowserWindow icinde local Next.js standalone server'i acar.
- Next.js `output: "standalone"` ile paketlenir.
- Packaged app icinde bundled Node runtime kullanilir; kullanici makinesinde Node.js kurulu olmak zorunda degildir.
- Packaged app icinde bundled Python runtime ve MarkItDown kurulumu bulunur; AI fatura okuma sistem Python kurulumuna bagli degildir.
- Prisma + SQLite desktop modda `%APPDATA%/MuhasebeTakip/database/dev.db` yolunu kullanir.
- Upload, restore backup, backup ve log klasorleri `%APPDATA%/MuhasebeTakip/` altindadir.
- AppData DB bootstrap, DB yoksa bos DB/migration hazirligi yapar; mevcut DB uzerine yazmaz.
- Backup ZIP, CSV ve PDF download handling Electron `will-download` akisi ile Downloads/MuhasebeTakip klasorune kaydedilir.
- System Status PIN, onboarding, backup, AppData, Python/MarkItDown ve runtime durumlarini gizli bilgi gostermeden raporlar.

## macOS Hedef Mimarisi

macOS tarafinda hedef yapi Windows ile ayni uygulama modelini korumaktir:

- Electron shell.
- Next.js standalone server.
- Prisma + SQLite.
- App Support altinda local kullanici verisi.
- Bundled Node runtime.
- Bundled Python/MarkItDown runtime.
- Downloads altinda export/backup ciktilari.
- System Status ile runtime saglik kontrolu.

macOS icin onerilen veri klasoru:

```text
~/Library/Application Support/MuhasebeTakip/
  database/dev.db
  uploads/
  restore-backups/
  backups/
  logs/
```

Bu klasor uygulama silinse bile kullanici verisini korumak icin application bundle icinde tutulmamalidir.

## Kullanici Indirme Adlandirmasi

macOS build ciktilari isletim sistemi ve mimariye gore ayri adlandirilmalidir:

```text
Muhasebe-Takip-v2.x.x-macOS-arm64.dmg
Muhasebe-Takip-v2.x.x-macOS-x64.dmg
```

- `arm64`: Apple Silicon Mac modelleri icindir.
- `x64`: Intel Mac modelleri icindir.
- Universal build hazirlanirsa dosya adi ayrica `macOS-universal` olarak netlestirilmelidir.
- GitHub Release aciklamasinda Windows, macOS arm64 ve macOS x64 assetleri ayri ayri listelenmelidir.

## Path Uyumlulugu

`src/lib/app-paths.ts` platform bazli desktop veri klasoru hesaplamasini destekleyecek sekilde hazirlanmistir:

- `process.platform === "win32"`: `%APPDATA%/MuhasebeTakip/`
- `process.platform === "darwin"`: `~/Library/Application Support/MuhasebeTakip/`
- Linux veya diger test ortamlarinda: `~/.local/share/MuhasebeTakip/`

Planlanan davranis:

- `getDesktopAppDataDir()` platforma gore dogru root'u secmeli.
- `getDesktopDatabasePath()` macOS icin `Application Support/MuhasebeTakip/database/dev.db` uretmeli.
- Upload, restore-backups, backups ve logs ayni root altinda kalmali.
- Path separator farklari icin tum kod `node:path` helperlariyla calismali.
- DB icindeki dosya referanslari mumkun oldugunca relative kalmali.
- Download/export icin macOS'ta `app.getPath("downloads")/MuhasebeTakip` kullanilmali.
- Tam local path, `DATABASE_URL` veya `.env` degerleri UI'da gosterilmemeli.

Durum notu:

- Platform-aware app path hazirligi eklendi.
- Normal web/local modda `prisma/dev.db`, `storage/uploads/` ve `storage/restore-backups/` davranisi degismedi.
- `APP_MODE=desktop` oldugunda desktop pathleri platforma gore hesaplanir.
- Bu hazirlik DB tasimasi, macOS build config veya electron-builder mac target eklemez.

## Node Runtime Stratejisi

Windows'ta bundled `node.exe` kullaniliyor. macOS icin ayni prensip korunmali:

- Packaged app sistem Node.js'e bagli kalmamali.
- macOS x64 ve arm64 icin uygun Node binary ayri hazirlanmali.
- Universal build hedeflenirse iki mimari icin runtime secimi netlestirilmeli.
- Electron main process packaged modda once bundle icindeki Node runtime'i aramali.
- Bundled Node yoksa sistem Node fallback sadece gelistirme/diagnostic amacli kullanilmali.
- Node bulunamazsa sessiz kapanma yerine Turkce hata penceresi ve startup log yazilmali.

Onerilen paket yapisi:

```text
resources/
  node/darwin-arm64/bin/node
  node/darwin-x64/bin/node
```

Durum notu:

- Electron packaged runtime resolver macOS path standardini taniyacak sekilde hazirlandi.
- Resolver onceligi: platform/arch uyumlu bundled Node, sonra sistem Node fallback, sonra Turkce hata ekrani.
- Windows path standardi `resources/node/node.exe` olarak korunur.
- macOS runtime binary'leri henuz bu Windows makinede uretilmedi; gercek test Mac uzerinde yapilmalidir.

Ilk macOS POC icin tek mimari secilebilir. Gelistirme makinesi Apple Silicon ise once arm64 build denenmelidir.

## Python / MarkItDown Stratejisi

Windows v2.0.1'de bundled Python runtime hazirlandi. macOS icin benzer fakat mimari duyarliligi daha yuksek bir strateji gerekir:

- Sistem Python kurulumuna guvenilmemeli.
- `python-worker/` paket icinde kalmali.
- MarkItDown ve bagimliliklari bundled Python ortaminda hazirlanmali.
- x64 ve arm64 Python runtime ayri hazirlanmali veya universal Python dagitimi arastirilmali.
- MarkItDown bagimliliklari icindeki native paketler macOS mimarisiyle uyumlu kurulmalidir.
- System Status bundled Python ve MarkItDown durumunu macOS'ta da gostermeli.

Onerilen paket yapisi:

```text
resources/
  python/darwin-arm64/bin/python3
  python/darwin-x64/bin/python3
  app/python-worker/
```

Durum notu:

- Python runtime resolver macOS path standardini taniyacak sekilde hazirlandi.
- Resolver onceligi: `MARKITDOWN_PYTHON`, platform/arch uyumlu bundled Python, sonra sistem `python3`/`python` fallback.
- Windows path standardi `resources/python/python.exe` olarak korunur.
- `prepare:bundled-python` Mac uzerinde calistiginda `build/python/darwin-<arch>/` yapisini hazirlayacak sekilde genisletildi.
- macOS MarkItDown runtime gercek testi Mac uzerinde yapilmalidir.

Ilk POC icin sistem Python fallback korunabilir, ancak release hedefinde bundled Python oncelikli olmalidir.

## Prisma / SQLite Native Stratejisi

Prisma ve SQLite katmani macOS icin native engine uyumlulugu gerektirir:

- Prisma Client build sirasinda macOS hedef platform motorlarini icermelidir.
- `better-sqlite3` native modulunun macOS x64/arm64 icin rebuild edilmesi gerekebilir.
- Windows'ta uretilen native binary macOS'ta calismaz.
- macOS build'i ideal olarak Mac uzerinde alinmalidir.
- Cross-build denenebilir, fakat native moduller nedeniyle release icin guvenilir yol degildir.

Kontrol edilmesi gerekenler:

- Prisma query engine dosyalari paket icinde mevcut mu?
- `better-sqlite3` native `.node` dosyasi dogru mimaride mi?
- `DATABASE_URL` packaged macOS server baslamadan once App Support DB yoluna set ediliyor mu?
- DB bootstrap mevcut DB uzerine yazmadan calisiyor mu?

## electron-builder macOS Hedefleri

Ilk hedefler:

- `mac` zip: hizli smoke test icin.
- `dmg`: kullanici dagitimi icin.

Durum notu:

- electron-builder macOS target hazirligi eklendi.
- `dist:mac`, `dist:mac:arm64` ve `dist:mac:x64` scriptleri Mac uzerinde calistirilmak uzere hazirlandi.
- `dmg` ve `zip` targetlari tanimlandi.
- `assets/icon.icns` macOS icon dosyasi olarak eklendi; DMG/ZIP build sirasinda kullanilacaktir.
- Mevcut `icon.icns`, `assets/icon.png` kaynagindan uretilmistir; final marka ikonu hazirlandiginda ayni dosya adiyla degistirilebilir.
- Bu hazirlik macOS runtime bundle eklemez; bundled Node ve bundled Python icin macOS x64/arm64 runtime dosyalari sonraki asamada hazirlanmalidir.

Mimari secenekleri:

- Ayri x64 ve arm64 build:
  - Daha basit native runtime yonetimi.
  - Dosya boyutu daha dusuk.
  - Ilk asama icin onerilir.
- Universal build:
  - Tek dagitim dosyasi.
  - Node, Python, Prisma ve native moduller icin daha karmasik.
  - Stabil x64/arm64 buildlerden sonra dusunulmeli.

macOS build icin onerilen ortam:

- Gercek Mac uzerinde build almak.
- Apple Silicon Mac varsa once arm64 build.
- Intel kullanicilar hedeflenecekse ayri x64 build.
- Windows uzerinden macOS release build hedeflenmemeli; native dependency ve signing adimlari risklidir.
- Code signing/notarization henuz yapilmadi; unsigned build Gatekeeper uyarisi verebilir.

## GitHub Actions macOS Build Denemesi

Manuel calistirilabilir GitHub Actions workflow'u hazirlandi:

```text
.github/workflows/macos-build.yml
```

Workflow `workflow_dispatch` ile elle tetiklenir ve release yayinlamaz. Amaci sadece macOS runner uzerinde build denemesi yapmak ve ciktilari artifact olarak saklamaktir.

Calisan kontroller:

- `npm ci`
- `npm run prisma:generate`
- `npm run lint`
- `npm run build`
- `npm run dist:mac:arm64`
- `npm run dist:mac:x64`

Runner hedefleri:

- `arm64`: `macos-26`
- `x64`: `macos-26-intel`

Artifact adlari:

- `macos-arm64-build`
- `macos-x64-build`

Signing ve notarization bu asamada kapali tutulur:

```text
CSC_IDENTITY_AUTO_DISCOVERY=false
```

Workflow `.env`, local DB, storage veya kullanici verisi kullanmaz. DMG/ZIP ciktilari sadece Actions artifact olarak saklanir; GitHub Release asset'i olusturulmaz ve tag publish yapilmaz.

## Signing ve Notarization Plani

macOS dagitiminda en buyuk dagitim riski Gatekeeper'dir.

Ilk test:

- Unsigned zip/dmg local test icin kullanilabilir.
- Kullanici ilk acilista Gatekeeper uyarisi alabilir.
- Bu sadece internal test icin kabul edilebilir.

Release hedefi:

- Apple Developer hesabina ihtiyac vardir.
- Developer ID Application sertifikasi ile code signing yapilmalidir.
- DMG veya app bundle notarization icin Apple'a gonderilmelidir.
- Notarization sonrasi stapling yapilmalidir.

Riskler:

- Unsigned uygulama kullanici tarafinda acilmayabilir veya guven uyarisi verir.
- Bundled Python/Node binary'leri signing kapsaminda dogru imzalanmalidir.
- Native `.node` dosyalari imza veya quarantine sorunlari cikarabilir.

## Backup, Download ve Export

macOS'ta Electron `will-download` event'i desteklenir ve mevcut Windows yaklasimi buyuk olcude korunabilir.

Onerilen download hedefi:

```text
~/Downloads/MuhasebeTakip/
```

Kontrol edilmesi gerekenler:

- Tam Yedek ZIP diske yaziliyor mu?
- CSV export diske yaziliyor mu?
- PDF export diske yaziliyor mu?
- Dosya adi path traversal'a kapali mi?
- Ayni dosya adi varsa benzersiz ad uretiliyor mu?
- ZIP icinde `.env`, `.next`, `node_modules`, app bundle veya cache dosyalari yok mu?

## Riskler

- macOS App Support klasoru yanlis hesaplanirsa veri app bundle icine veya gecici klasore yazilabilir.
- Update veya uygulama silme sirasinda DB/uploads kaybolabilir.
- Node runtime yanlis mimaride paketlenirse standalone server baslamaz.
- Python runtime veya MarkItDown bagimliliklari yanlis mimaride paketlenirse AI metin cikarma calismaz.
- Prisma engine veya `better-sqlite3` native binary eksik kalabilir.
- Universal build native modul uyumsuzlugu yaratabilir.
- Port 3000 cakismasi macOS'ta da yasanabilir.
- Gatekeeper unsigned build'i engelleyebilir.
- Code signing bundled runtime dosyalarini kapsamazsa uygulama acilista hata verebilir.
- Download/export sandbox veya permission davranislari Windows'tan farkli olabilir.
- Tam path, `DATABASE_URL` veya `.env` degerlerinin log/UI'a sizmamasi gerekir.

## Asamali Uygulama Plani

A. Platform path abstraction

- `app-paths.ts` icinde `darwin` icin `~/Library/Application Support/MuhasebeTakip` destegi hazirlandi.
- System Status'ta macOS veri klasoru durumunu gizli path gostermeden raporla.

B. macOS runtime resolver

- Bundled Node resolver'a macOS x64/arm64 destegi ekle.
- Bundled Python resolver'a macOS x64/arm64 destegi ekle.
- Sistem fallback sadece diagnostic olarak kalsin.

C. macOS packaging POC

- Mac uzerinde `npm run build` ve standalone server testi yap.
- `electron:prod` macOS'ta calisiyor mu dogrula.
- electron-builder mac zip hedefini ayri branch/commit ile ekle.

D. Native dependency dogrulama

- Prisma Client ve engine dosyalarini kontrol et.
- `better-sqlite3` native modulunu Mac uzerinde rebuild/pack test et.
- AI MarkItDown worker'i bundled Python ile test et.

E. DMG ve signing POC

- Unsigned DMG internal test.
- Apple Developer sertifikasi ile signed build.
- Notarization ve Gatekeeper testi.

F. Full smoke test

- Clean App Support ile onboarding.
- PIN/login.
- Basit muhasebe akisi.
- Backup/download/export.
- AI fatura okuma.
- App removal sonrasi veri korunumu.

G. macOS release tag

- Ayri macOS release assetleri.
- SHA256 checksum.
- Release notes ve bilinen limitler.

## Test Plani

Minimum macOS smoke test:

1. Clean App Support senaryosu:
   - Mevcut `~/Library/Application Support/MuhasebeTakip` klasoru silinmeden yedeklenir veya test override kullanilir.
   - Ilk acilista onboarding 200 doner.
2. Onboarding:
   - Sirket bilgileri kaydedilir.
   - Varsayilan para birimi/KDV kaydedilir.
   - PIN hash olarak kaydedilir.
   - Yedekleme checkbox olmadan tamamlanamaz.
3. PIN/login:
   - Yanlis PIN reddedilir.
   - Dogru PIN dashboard'a girer.
   - Logout sonrasi korumali route login'e yonlenir.
4. App Support:
   - `database/dev.db`, `uploads/`, `restore-backups/`, `backups/`, `logs/` olusur.
   - Mevcut DB uzerine yazilmaz.
5. Muhasebe akisi:
   - Cari, fatura, tahsilat/odeme, dashboard ve cari ekstre test edilir.
6. Backup/export:
   - Tam Yedek ZIP, CSV ve PDF indirilir.
   - ZIP icinde DB ve backup-info vardir.
   - ZIP icinde `.env`, `.next`, `node_modules` yoktur.
7. AI fatura okuma:
   - Bundled Python/MarkItDown ile kucuk HTML fatura metne cevrilir.
   - Parser, cari eslestirme ve onay akisi smoke test edilir.
8. System Status:
   - Surum, onboarding, PIN, backup, App Support, Node/Python/MarkItDown durumlari dogru gorunur.
   - Gizli path, `DATABASE_URL` veya `.env` icerigi gorunmez.
9. Kapanis:
   - Electron kapaninca Next server process kapanir.
   - Port 3000 temiz kalir.
10. App removal:
   - Uygulama silinse bile `Application Support/MuhasebeTakip` verisi korunur.

## Ilk Teknik Adim

Ilk uygulanacak teknik adim `src/lib/app-paths.ts` icinde macOS App Support path abstraction hazirligidir. Bu adim DB tasimasi yapmadan, sadece desktop mode path hesaplamasini platform bazli hale getirmelidir.

Bu tamamlandiktan sonra macOS runtime resolver ve Mac uzerinde standalone/Electron smoke test gelmelidir.
