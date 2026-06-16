# Desktop AppData Veri Gecis Plani

## Amac

Bu belge, ileride Windows desktop/setup surumune gecildiginde SQLite veritabaninin ve kullanici dosyalarinin AppData altinda guvenli sekilde saklanmasi icin gecis planini aciklar.

Bu asamada herhangi bir DB tasima, `DATABASE_URL` degisikligi, Electron/Tauri entegrasyonu veya schema degisikligi yapilmaz. Amac, v2.0 desktop calismasindan once riskleri ve uygulama sirasini netlestirmektir.

## Mevcut Yapi

Mevcut local web modda uygulama su yollarla calisir:

- Prisma SQLite DB: `prisma/dev.db`
- Prisma fallback baglanti: `file:./prisma/dev.db`
- Upload dosyalari: `storage/uploads/`
- Restore oncesi guvenlik yedekleri: `storage/restore-backups/`
- Manuel/tam yedek akislari mevcut local pathleri kullanir.
- Dosya kayitlarinda `filePath` degeri relative formatta tutulur:
  - `storage/uploads/<storedFileName>`
- `src/lib/app-paths.ts` mevcut local pathleri ve ileride kullanilacak desktop AppData pathlerini tek noktadan hesaplayabilir.

Bu yapi local gelistirme icin dogru kalmalidir. Desktop mod aktif edilmedigi surece mevcut local davranis degismemelidir.

## Hedef AppData Yapisi

Windows desktop hedef veri kok dizini:

```text
%APPDATA%/MuhasebeTakip/
```

Hedef ic yapi:

```text
MuhasebeTakip/
  database/
    dev.db
  uploads/
  restore-backups/
  backups/
  logs/
```

Bu yapi, uygulama kurulum klasoru guncellense veya yeniden kurulum yapilsa bile kullanici verisinin korunmasini hedefler.

## Prisma DATABASE_URL Stratejisi

Desktop modda Prisma, AppData altindaki SQLite dosyasina runtime environment ile yonlendirilmelidir.

Onerilen desktop runtime degerleri:

```text
APP_MODE=desktop
DATABASE_URL=file:<AppData>/MuhasebeTakip/database/dev.db
```

Strateji:

- `.env` dosyasi desktop kullanici verisi icin ana kaynak olmamalidir.
- Electron main process, Next.js server child process baslamadan once `DATABASE_URL` degerini runtime environment olarak set etmelidir.
- Next.js server basladiginda `src/lib/prisma.ts` icindeki Prisma adapter bu runtime `DATABASE_URL` degerini okumalidir.
- Runtime env set edilmezse mevcut fallback korunur:
  - `file:./prisma/dev.db`
- Boylece normal web/local gelistirme bozulmaz.

Zamanlama:

1. Electron main process baslar.
2. AppData veri klasorleri hazirlanir.
3. Gerekirse DB bootstrap/migration hazirligi yapilir.
4. `DATABASE_URL` AppData DB dosyasina ayarlanir.
5. Next.js production server baslatilir.
6. Prisma, server baslarken AppData DB'ye baglanir.

Kritik not:

- `DATABASE_URL`, Prisma client veya server import edilmeden once set edilmelidir.
- Next.js server calismaya basladiktan sonra `DATABASE_URL` degistirmek guvenilir degildir.

## Ilk Calistirma / Bootstrap Akisi

Desktop mod ilk calistirmada onerilen akis:

1. Electron main process `APP_MODE=desktop` ile baslar.
2. `ensureDesktopDataDirs()` kontrollu sekilde cagirilir.
3. AppData `database/dev.db` var mi kontrol edilir.
4. AppData DB varsa:
   - Kullanmaya devam edilir.
   - Migration status kontrol edilir.
5. AppData DB yoksa:
   - Mevcut local `prisma/dev.db` var mi kontrol edilir.
   - Varsa kullaniciya veya guvenli bootstrap akisina gore AppData'ya kopyalanir.
   - Yoksa bos DB icin migration calistirilir.
6. `DATABASE_URL` AppData DB yoluna set edilir.
7. Next.js server baslatilir.
8. Onboarding tamamlanmadiysa mevcut onboarding akisi kullanilir.

Bos DB senaryosu:

- AppData DB yoksa ve kopyalanacak local DB yoksa migration calistirilir.
- Onboarding ekrani yeni kullanici kurulumunu yonetir.
- Ilk acilista PIN, sirket bilgileri ve yedek uyarisi yine mevcut akisa bagli kalir.

## Mevcut Veriyi Tasima Stratejisi

Mevcut `prisma/dev.db` dosyasindan AppData DB'ye gecis dikkatli yapilmalidir.

Onerilen kurallar:

- AppData DB zaten varsa uzerine yazilmaz.
- AppData DB yok ve `prisma/dev.db` varsa kopyalama yapilabilir.
- Kopyalama oncesi mevcut `prisma/dev.db` icin tam yedek alinmasi onerilir.
- Kopyalama sonrasi AppData DB icin SQLite header ve migration status kontrol edilir.
- Kopyalama basarili olmadan Next.js server baslatilmamalidir.

Geri donus icin:

- Kopyalama islemi source DB'yi silmemelidir.
- Ilk v2.0 gecisinde repo ici `prisma/dev.db` bir sure fallback olarak korunabilir.
- Kullaniciya AppData DB kullanildigi System Status ekraninda path gostermeden belirtilmelidir.

## Upload Dosyalarini Tasima Stratejisi

Mevcut upload klasoru:

```text
storage/uploads/
```

Hedef desktop upload klasoru:

```text
%APPDATA%/MuhasebeTakip/uploads/
```

Onemli mevcut avantaj:

- DB'deki `FileAttachment.filePath` degeri relative formatta tutuluyor:
  - `storage/uploads/<storedFileName>`
- Bu sayede fiziksel dosya kokunu degistirmek icin tek merkezli path cozumleme kullanilabilir.

Risk:

- DB'de path `storage/uploads/...` olarak kaldigi icin desktop modda bu degerin fiziksel path gibi kullanilmamasi gerekir.
- Dosya okuma/yazma her zaman `app-paths` veya dosya helperlari uzerinden cozulmelidir.

Onerilen gecis:

1. AppData `uploads/` klasoru olusturulur.
2. Mevcut `storage/uploads/` varsa icerigi AppData `uploads/` altina kopyalanir.
3. Dosya kayitlarindaki relative pathler degistirilmez.
4. Desktop modda `storage/uploads/<file>` relative degeri AppData `uploads/<file>` olarak cozulur.
5. Yeni uploadlar desktop modda AppData `uploads/` altina yazilir, DB'de relative format korunur.

Bu yaklasim backup/restore ve dosya iliskilerini daha az riskle korur.

## Backup/Restore Etkisi

Desktop modda tam yedek su kaynaklardan uretilmelidir:

- DB: `%APPDATA%/MuhasebeTakip/database/dev.db`
- Uploads: `%APPDATA%/MuhasebeTakip/uploads/`
- Metadata: `backup-info.json`

ZIP ici format ayni kalmalidir:

```text
database/dev.db
uploads/
backup-info.json
```

Avantaj:

- Mevcut tam yedek formatinin degismemesi restore uyumlulugunu korur.
- Web/local mod ve desktop mod ayni yedek ZIP formatini paylasabilir.

Restore desktop modda:

- Restore oncesi guvenlik yedegi AppData `restore-backups/` altina alinmalidir.
- Restore hedefi AppData DB ve AppData uploads olmalidir.
- Restore tamamlandiktan sonra server restart uyarisi korunmalidir.
- Restore sirasinda SQLite dosya kilidi riskine karsi Electron main process veya uygulama akisi kontrollu kapanma/yeniden baslatma sunmalidir.

## Riskler

Baslica veri kaybi ve stabilite riskleri:

- AppData DB varken yanlislikla uzerine local `prisma/dev.db` kopyalanmasi.
- `DATABASE_URL` gec set edildigi icin Prisma'nin yanlis DB'ye baglanmasi.
- Update/installer sirasinda AppData klasorunun silinmesi.
- Upload dosyalarinin DB kayitlariyla fiziksel klasor arasinda ayrismasi.
- Restore sirasinda SQLite dosyasinin kilitli olmasi.
- Migration'in yanlis DB uzerinde calismasi.
- Tam yedegin yanlis kaynaktan uretilmesi.
- `.env`, local path veya gizli bilgi UI'da gosterilmesi.
- Windows AppData yolunda bosluk veya Turkce karakter kaynakli path hatalari.
- Electron app kapanirken Next.js server'in acik kalmasi ve DB kilidini birakmamasi.

Risk azaltma:

- `DATABASE_URL` sadece Next.js server baslamadan once set edilmeli.
- AppData DB varsa asla otomatik overwrite edilmemeli.
- Her gecis veya restore oncesi guvenlik yedegi alinmali.
- System Status path gostermeden hangi DB modunun aktif oldugunu belirtmeli.
- Desktop smoke testte bos DB, dolu DB, uploadli DB ve restore senaryolari ayri ayri denenmeli.

## Test Plani

Desktop DB gecisi uygulanmadan once ve uygulandiktan sonra testler:

1. Normal web/local mod:
   - `APP_MODE` yokken `isDesktopMode()` false.
   - DB hala `prisma/dev.db`.
   - Upload hala `storage/uploads`.
   - Lint/build/Prisma generate basarili.

2. Desktop dry-run:
   - AppData path hesaplanabiliyor.
   - `ensureDesktopDataDirs()` sadece explicit cagrilinca klasor olusturuyor.
   - System Status tam path gostermiyor.

3. Bos desktop DB:
   - AppData DB yokken migration calisiyor.
   - Onboarding aciliyor.
   - Dashboard ve ana sayfalar aciliyor.

4. Mevcut DB kopyalama:
   - `prisma/dev.db` AppData'ya kopyalaniyor.
   - Kayitlar korunuyor.
   - Migration status temiz.

5. Upload kopyalama:
   - Eski upload dosyalari AppData'ya kopyalaniyor.
   - FileAttachment kayitlari dosyalari bulabiliyor.
   - AI/MarkItDown dosya okuma calisiyor.

6. Backup/restore:
   - Tam yedek AppData DB ve uploads iceriyor.
   - Restore AppData hedeflerine yaziyor.
   - Restore oncesi guvenlik yedegi AppData `restore-backups/` altina aliniyor.

7. Update testi:
   - Installer update sonrasi AppData DB/uploads korunuyor.
   - Uygulama yeni surumle ayni verilere baglaniyor.

## Uygulama Adimlari

### A. Desktop runtime env plani

- Electron main process icinde `APP_MODE=desktop` set edilir.
- AppData DB yolu hesaplanir.
- `DATABASE_URL=file:<AppData DB path>` server baslamadan once set edilir.

### B. AppData DB bootstrap helper

- AppData `database/` klasoru hazirlanir.
- AppData DB var/yok kontrolu yapilir.
- AppData DB yoksa local DB kopyalama veya migration akisi uygulanir.
- Hicbir durumda mevcut AppData DB otomatik overwrite edilmez.

### C. AppData upload/bootstrap helper

- AppData `uploads/` klasoru hazirlanir.
- Mevcut `storage/uploads/` dosyalari AppData'ya kopyalanir.
- DB'deki relative file path formatlari korunur.
- Desktop modda relative pathler AppData uploads kokune cozulur.

### D. Desktop mode system-status testi

- System Status desktop mode aktif/pasif bilgisini gosterir.
- AppData hazirligini path sizdirmadan raporlar.
- DB/uploads/backup kaynaklari desktop moda gore kontrol edilir.

### E. Electron wrapper

- Next.js production server runtime env ile baslatilir.
- BrowserWindow local portu acar.
- App kapanirken server process kontrollu kapatilir.

### F. Installer testi

- Temiz kurulum.
- Mevcut veriyle update.
- Backup/restore.
- Python/MarkItDown.
- PIN/onboarding.
- Exportlar.

Bu adimlar tamamlanmadan `v2.0.0` desktop release tag'i atilmamalidir.
