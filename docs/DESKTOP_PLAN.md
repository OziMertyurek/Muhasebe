# Desktop / Setup On Hazirlik Plani

## Amac

Bu belge, local calisan muhasebe takip sistemini ileride Windows desktop uygulamasi ve `setup.exe` dagitimina hazirlamak icin mimari karar taslagini aciklar.

Bu asamada Electron veya Tauri entegrasyonu yapilmaz. Mevcut Next.js + Prisma + SQLite uygulamasi, veri klasoru, dosya yukleme, backup/restore ve MarkItDown worker akislari acisindan degerlendirilir.

## Mevcut Mimari

Uygulama su anda local web uygulamasi olarak calisir:

- Next.js App Router kullanilir.
- Gelistirme modu `npm run dev` ile baslatilir.
- Production local kullanim icin `npm run build` ve `npm run start` akisi vardir.
- Prisma, SQLite veritabanina baglanir.
- Varsayilan veritabani yolu `prisma/dev.db` olarak calisir.
- Upload dosyalari `storage/uploads/` altinda tutulur.
- Restore oncesi guvenlik yedekleri `storage/restore-backups/` altinda tutulur.
- Tam yedek ZIP'i `database/dev.db`, `uploads/` ve `backup-info.json` icerir.
- MarkItDown metin cikarma akisi `python-worker/extract_markdown.py` uzerinden Python worker ile calisir.
- Windows kolay baslatma dosyalari vardir:
  - `setup.bat`: npm bagimliliklari, Prisma generate, migration ve MarkItDown Python paket kurulumu.
  - `start-dev.bat`: Prisma generate ve `npm run dev`.
  - `start-prod.bat`: Prisma generate, build ve `npm run start`.
  - `stop-info.bat`: server'i kapatmak icin kullaniciya bilgi verir.

Bu yapi local gelistirme ve manuel kullanim icin uygundur. Desktop dagitiminda ise uygulama kodu ile kullanici verisini ayirmak gerekir.

## Onerilen Desktop Veri Klasoru

Windows hedef klasoru:

```text
%APPDATA%\MuhasebeTakip\
```

Onerilen ic yapi:

```text
MuhasebeTakip/
  database/
    dev.db
  uploads/
  restore-backups/
  backups/
  logs/
```

Bu ayrim onemlidir:

- Uygulama kurulumu guncellenebilir veya yeniden kurulabilir.
- Veritabani ve yuklenen dosyalar uygulama kurulum klasorunde kalirsa update sirasinda silinme riski dogar.
- AppData altindaki veri klasoru kullaniciya ait kalici alan olarak davranir.
- Backup/restore ve sistem durumu kontrolleri tek bir veri kokunden okunabilir.

## Path Abstraction Plani

Desktop gecisine baslamadan once path yonetimi tek noktaya alinmali.

Onerilen dosya:

```text
src/lib/app-paths.ts
```

Onerilen fonksiyonlar:

```ts
getDatabasePath()
getUploadsDir()
getRestoreBackupsDir()
getBackupsDir()
getLogsDir()
getPythonWorkerPath()
isDesktopMode()
```

Plan:

- Web/local modda mevcut yollar korunur:
  - `prisma/dev.db`
  - `storage/uploads`
  - `storage/restore-backups`
- Desktop modda `APP_DATA_DIR` veya benzeri bir environment degeri okunur.
- Desktop mod yoksa guvenli fallback olarak mevcut repo ici local yollar kullanilir.
- Backup, restore, upload, system status, MarkItDown ve Prisma baglanti ayarlari kademeli olarak bu helper'a tasinir.
- Ilk adimda sadece helper eklenmeli ve mevcut davranis degismemelidir.
- Sonraki adimda migration/backup testleriyle birlikte kullanim noktalari tek tek guncellenmelidir.

Dikkat edilmesi gereken yerler:

- Prisma `DATABASE_URL` mutlak SQLite dosya yolunu dogru formatta almali.
- Windows pathlerinde bosluk, Turkce karakter ve ters slash durumlari test edilmeli.
- `process.cwd()` kullanimi desktop ortaminda beklenenden farkli olabilir.
- UI'da tam local path gosterilmemeli; sadece var/yok ve durum bilgisi gosterilmeli.

## Electron / Tauri Karsilastirmasi

| Kriter | Electron | Tauri |
| --- | --- | --- |
| Next.js server calistirma | Node tabanli oldugu icin daha dogal | Mumkun ama Node/Next server paketleme daha fazla tasarim ister |
| Prisma SQLite | Node ortami ile uyumlu | Rust shell icinde Node backend ihtiyaci kalabilir |
| Local file system | Main process ile pratik | Guclu ama Rust tarafinda daha fazla kopru gerekir |
| Backup/restore | Mevcut Node kodlari kolay tasinir | FS izinleri ve komut kopruleri tasarlanir |
| Python/MarkItDown worker | Child process baslatma kolay | Sidecar/command stratejisi gerekir |
| Windows installer | `electron-builder` ile olgun ekosistem | Tauri installer iyi ama backend uyarlamasi daha fazla is |
| Debug kolayligi | Next/Node bilgisiyle hizli | Rust + webview + Node ihtiyaci karma yaratabilir |
| Paket boyutu | Daha buyuk | Daha kucuk |

Oneri:

Bu proje icin ilk desktop surumde Electron daha pratik tercihtir. Sebepler:

- Uygulama zaten Next.js ve Node tabanli calisiyor.
- Prisma, backup/restore ve MarkItDown entegrasyonlari Node server tarafinda mevcut.
- Electron main process, Next.js production server'i baslatip BrowserWindow icinde gostermek icin dogal bir kabuk saglar.
- Hata ayiklama ve Windows installer ekosistemi daha hizli ilerletir.

Tauri su durumlarda tekrar degerlendirilebilir:

- Paket boyutu kritik hale gelirse.
- Backend Rust/native tarafa tasinacaksa.
- Next.js server yerine statik frontend + native API mimarisine gecilecekse.

## Onerilen Electron Mimarisi

Hedef akis:

1. Kullanici `Muhasebe.exe` dosyasini acar.
2. Electron main process baslar.
3. Veri klasoru hazirlanir:
   - `%APPDATA%\MuhasebeTakip\database`
   - `%APPDATA%\MuhasebeTakip\uploads`
   - `%APPDATA%\MuhasebeTakip\restore-backups`
   - `%APPDATA%\MuhasebeTakip\backups`
   - `%APPDATA%\MuhasebeTakip\logs`
4. Gerekli environment degerleri set edilir:
   - `DESKTOP_MODE=1`
   - `APP_DATA_DIR=%APPDATA%\MuhasebeTakip`
   - `DATABASE_URL=file:<app-data-database-path>`
   - `MARKITDOWN_PYTHON=<python-command-or-portable-path>` gerekirse
5. Electron, Next.js production server'i local ve bos bir portta child process olarak baslatir.
6. Server hazir olunca BrowserWindow `http://127.0.0.1:<port>` adresini acar.
7. Kullanici uygulamayi normal desktop pencere icinde kullanir.
8. Uygulama kapanirken Next.js child process ve varsa alt processler kontrollu kapatilir.

Notlar:

- Port `3000` sabitlenmemeli; port cakismasina karsi bos port secilmeli.
- BrowserWindow disina local URL acilmamali.
- Server hazir olmadan pencere acilirsa yukleniyor ekrani veya tekrar deneme akisi olmali.
- Crash durumunda kullaniciya Turkce hata ekrani gosterilmeli.

## Installer Stratejisi

Ilk Windows installer icin `electron-builder` pratik bir secenektir.

Installer hedefleri:

- Windows installer olusturma.
- Masaustu kisayolu.
- Start Menu kisayolu.
- Uygulama dosyalarini program kurulum alanina koyma.
- Kullanici verilerini AppData altinda koruma.
- Update sirasinda `database`, `uploads`, `restore-backups`, `backups` ve `logs` klasorlerini silmeme.

Kurulum ve update prensipleri:

- Installer mevcut AppData verisini ezmemeli.
- Ilk calistirmada veritabani yoksa migration hazirligi yapilmali.
- Guncelleme oncesi otomatik veya kullanici onayli tam yedek onerilmeli.
- Uygulama versiyonu degisse bile local veri klasoru korunmali.

## Python / MarkItDown Stratejisi

MarkItDown ozelligi uygulamanin tamamini bloke etmemeli. AI fatura okuma metin cikarma calismasa bile muhasebe, fatura, backup ve rapor modulleri calismaya devam etmelidir.

Secenekler:

1. Kullanici Python kurar.
   - En basit yontemdir.
   - Mevcut `setup.bat` bu modele yakindir.
   - Dezavantaj: kullanici makinesinde Python bulunmayabilir.

2. Installer veya setup sirasinda Python paketleri kurulur.
   - Daha rahat deneyim saglar.
   - Internet, pip ve Python kurulumuna bagimlidir.

3. Portable Python paketlenir.
   - En iyi son kullanici deneyimi olabilir.
   - Paket boyutu artar.
   - Guvenlik, lisans ve update bakimi ayrica takip edilmelidir.

Oneri:

- v2.0 ilk desktop denemesinde sistem Python veya `py` launcher desteklensin.
- Python/MarkItDown yoksa System Status paneli acik uyari gostersin.
- MarkItDown butonu hata durumunda mevcut Turkce hata akisini kullansin.
- Sonraki surumde portable Python paketleme degerlendirilsin.

## Risk Analizi

Baslica riskler:

- Veritabani dosyasinin yanlis klasore tasinmasi.
- Update sirasinda AppData verisinin silinmesi.
- Mevcut `prisma/dev.db` ile yeni AppData DB arasinda karisiklik.
- SQLite dosyasi acikken restore veya backup alma sirasinda dosya kilidi.
- Port cakismasi.
- Electron kapandiginda Next.js server process'inin arkada kalmasi.
- Python bulunamamasi.
- MarkItDown paketinin kurulu olmamasi.
- Python worker pathinin paketlenmis uygulamada bulunamamasi.
- Backup ZIP icine yanlislikla `.env`, `.db` yedekleri veya sistem dosyalari girmesi.
- Path traversal kontrollerinin desktop dosya yapisina tasinirken gevsemesi.
- UI'da tam local path veya gizli bilgi sizmasi.
- Windows AppData yolunda bosluk veya Turkce karakter kaynakli path hatalari.
- Antivirus veya SmartScreen'in imzasiz uygulamayi uyarmasi.
- Native bagimliliklarin paketlenmesi:
  - Prisma SQLite adapter
  - better-sqlite3 tabanli bagimliliklar
  - PDF/ZIP kutuphaneleri
  - Python worker

Risk azaltma onerileri:

- `app-paths.ts` ile tum veri yollarini tek merkezden yonet.
- AppData gecisine baslamadan once tam yedek al.
- Update ve restore oncesi otomatik guvenlik yedegi al.
- Desktop smoke testte bos DB, dolu DB, upload dosyalari ve restore senaryolarini ayri ayri test et.
- System Status panelini desktop mod icin ana kontrol ekrani gibi kullan.

## Desktop Gecis Asamalari

### A. Path abstraction

- `src/lib/app-paths.ts` eklenir.
- Mevcut local web davranisi korunur.
- Backup, upload, restore, MarkItDown ve system status icin hedef pathler bu helper ile planlanir.

Kabul kriteri:

- Web/local modda hicbir davranis degismez.
- Lint, build ve Prisma generate basarili olur.

### B. Data directory migration hazirligi

- AppData klasor yapisi olusturma helper'i eklenir.
- Mevcut `prisma/dev.db` dosyasindan AppData DB'ye gecis icin kontrollu plan yazilir.
- Once dry-run veya manuel test ile dogrulanir.

Kabul kriteri:

- Mevcut veri kaybi olmadan AppData DB kullanimi test edilir.
- Backup/restore yeni pathlerle calisir.

### C. Electron wrapper prototipi

- Electron main process eklenir.
- Next.js production server child process olarak baslatilir.
- BrowserWindow local server'i acar.
- App kapaninca server kapanir.

Ilk deneme notu:

- `electron/main.js`, `electron/preload.js` ve `electron/README.md` eklendi.
- `npm run electron:dev` script'i mevcut `http://localhost:3000` adresini Electron penceresinde acar.
- `npm run electron:dev` artik port 3000'i kontrol eder; server yoksa `npm run dev` komutunu child process olarak baslatir.
- Port 3000 zaten doluysa mevcut server'i kullanir ve onu kapatmaya calismaz.
- Electron kapanirken sadece kendi baslattigi Next.js dev server process'ini kapatir.
- Installer, setup.exe, Electron builder, AppData DB gecisi ve `DATABASE_URL` degisikligi bu asamada yoktur.

Kabul kriteri:

- Uygulama browser acmadan desktop penceresinde calisir.
- PIN, onboarding, backup/restore ve AI akislari bozulmaz.

### D. Installer

- Windows installer uretilir.
- Masaustu ve Start Menu kisayollari eklenir.
- AppData verisi update sirasinda korunur.

Kabul kriteri:

- Temiz Windows makinede kurulum ve ilk acilis calisir.
- Update kurulumu mevcut DB/uploads dosyalarini silmez.

### E. Desktop smoke test

- Ana sayfalar.
- CRUD akislari.
- Backup/restore.
- AI fatura okuma.
- System Status.
- PIN/onboarding.
- Exportlar.

Kabul kriteri:

- Kritik hata kalmaz.
- Test dosyalari ve yedekler Git'e girmez.

### F. v2.0.0 tag

- Desktop installer ve smoke test tamamlaninca tag atilir.
- Release notlarina desktop kurulum notlari eklenir.

## Acik Kararlar

- AppData gecisi ilk calistirmada otomatik mi olacak, yoksa kullanici onayli mi?
- Python zorunlu kurulum mu olacak, opsiyonel worker mi kalacak?
- Installer imzalama yapilacak mi?
- Otomatik guncelleme olacak mi?
- Port secimi ve process izleme nasil loglanacak?
- Restore islemi desktop modda server restart'i nasil yonetecek?

## Ilk Uygulama Notlari

- Bu plan asamasinda schema degismemelidir.
- DB pathleri hemen degistirilmemelidir.
- Electron/Tauri paketi eklenmemelidir.
- `app-paths.ts` ilk adimda sadece mevcut davranisi toparlayan guvenli bir ara katman olarak eklenmelidir.
- Path degisiklikleri yapildiginda backup/restore ve AI worker en riskli noktalar olarak tekrar test edilmelidir.
