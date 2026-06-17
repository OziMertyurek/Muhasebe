# Desktop DB Copy / Migration Plani

## Amac

Bu belge, desktop modda AppData icinde SQLite veritabani yoksa mevcut local veritabaninin guvenli sekilde nasil kullanilacagini veya kopyalanacagini planlar.

Bu asamada DB kopyalama kodu yazilmaz, upload dosyalari tasinmaz, `DATABASE_URL` degistirilmez ve Electron/Tauri entegrasyonu yapilmaz.

## Kaynak ve Hedef

Kaynak local DB:

```text
prisma/dev.db
```

Hedef desktop DB:

```text
%APPDATA%/MuhasebeTakip/database/dev.db
```

Hedef desktop upload klasoru:

```text
%APPDATA%/MuhasebeTakip/uploads/
```

## AppData DB Yoksa

Onerilen akis:

1. Desktop klasor yapisi kontrol edilir:
   - `database/`
   - `uploads/`
   - `restore-backups/`
   - `backups/`
   - `logs/`
2. AppData `database/dev.db` yoksa local `prisma/dev.db` var mi kontrol edilir.
3. Local DB varsa:
   - SQLite header kontrol edilir.
   - Dosya boyutu ve okunabilirlik kontrol edilir.
   - Hedef AppData DB hala yoksa kopyalama adimi onerilir.
   - Kopyalama temp dosyaya yapilir: `dev.db.tmp`
   - Basarili kopyalama ve dogrulama sonrasi temp dosya `dev.db` olarak rename edilir.
4. Local DB yoksa:
   - Bos DB icin Prisma migration akisi hazirlanir.
   - Onboarding yeni kurulum akisi olarak devam eder.

Kopyalama oncesi hedef klasor yoksa sadece klasor olusturulur. Hedef DB dosyasi yoksa kopyalama yapilabilir; hedef DB varsa otomatik kopyalama yapilmaz.

## AppData DB Zaten Varsa

Onerilen davranis:

- AppData DB korunur.
- Uzerine yazma yapilmaz.
- Local `prisma/dev.db` daha yeni, daha buyuk veya farkli gorunse bile otomatik overwrite yapilmaz.
- Kullanici acik onayi ve ayrica yedek olmadan AppData DB degistirilmez.
- System Status sadece "Desktop DB var" veya "Desktop DB yok" gibi guvenli bilgi gosterir; tam path gostermez.

Bu kural, desktop update veya yeniden kurulum sirasinda veri kaybini engellemek icin ana guvenlik bariyeridir.

## Guvenlik Yedegi

Her migration/copy islemi oncesi hedefte DB varsa guvenlik yedegi alinmalidir.

Onerilen klasor:

```text
%APPDATA%/MuhasebeTakip/restore-backups/before-db-migration-YYYY-MM-DD-HH-mm/
```

Icerik:

```text
database/dev.db
uploads/
backup-info.json
```

Kurallar:

- Hedef DB varsa yedek almadan uzerinde islem yapilmaz.
- Upload klasoru yedeklenebiliyorsa ayni guvenlik yedegine dahil edilir.
- Yedek tamamlanmadan kopyalama veya migration baslamaz.
- Yedek sonucu audit log veya desktop bootstrap log kaydina yazilabilir.

## Upload Dosyalari

Mevcut local upload klasoru:

```text
storage/uploads/
```

Hedef desktop upload klasoru:

```text
%APPDATA%/MuhasebeTakip/uploads/
```

Avantaj:

- `FileAttachment.filePath` DB icinde relative formatta tutuluyor:
  - `storage/uploads/<storedFileName>`
- Bu sayede DB kayitlarini degistirmeden fiziksel kok klasor desktop modda AppData uploads olarak cozulabilir.

Onerilen kopyalama stratejisi:

1. AppData `uploads/` klasoru hazirlanir.
2. Local `storage/uploads/` varsa dosyalar hedefe kopyalanir.
3. Ayni isimli dosya hedefte varsa varsayilan davranis `skip` olmalidir.
4. Cakismalar raporlanir:
   - skippedFiles
   - copiedFiles
   - failedFiles
5. Varsayilan olarak overwrite yapilmaz.
6. Overwrite ancak ileride manuel, acik onayli ve yedekli bir akista dusunulmelidir.

Bu yaklasim, mevcut kullanici dosyalarini ezmeden AppData yapisina gecisi daha guvenli hale getirir.

## Migration State / Marker File

Migration durumunu takip etmek icin AppData altinda marker file kullanilabilir.

Onerilen dosya:

```text
%APPDATA%/MuhasebeTakip/.desktop-migration.json
```

Onerilen icerik:

```json
{
  "migratedAt": "2026-06-17T12:00:00.000Z",
  "sourceDb": "local-prisma-dev-db",
  "targetDb": "appdata-database-dev-db",
  "uploadsCopied": true,
  "version": "2.0.0"
}
```

Gizlilik notu:

- Marker icinde tam local path yazilmamalidir.
- Kaynak/hedef sadece mantiksal adlarla belirtilmelidir.
- Tam path gerekiyorsa sadece log dosyasinda ve kullaniciya gosterilmeyen teknik alanda tutulmalidir.

## Rollback Stratejisi

DB kopyalama basarisiz olursa:

- Temp dosya `dev.db.tmp` silinir.
- AppData `dev.db` varsa dokunulmaz.
- Guvenlik yedegi alinmissa restore secenegi korunur.
- Next.js server baslatilmaz veya kullaniciya guvenli hata ekrani gosterilir.

Neden temp dosya?

- Direkt `dev.db` uzerine yazmak yari kalmis SQLite dosyasi riski yaratir.
- Once `dev.db.tmp` yazilir.
- SQLite header ve dosya boyutu kontrol edilir.
- Kopyalama basariliysa atomik rename ile `dev.db` haline getirilir.

Upload kopyalama basarisiz olursa:

- Basarisiz dosyalar raporlanir.
- Basarili kopyalanan dosyalar otomatik silinmez.
- Kullaniciya "eksik dosyalar olabilir" uyarisi verilir.
- DB kopyalama upload kopyalama hatasi yuzunden otomatik geri alinmamalidir; karar akisi ayrica tasarlanmalidir.

## Prisma Migration

DB kopyalandiktan sonra migration kontrolu desktop DB uzerinde yapilmalidir.

Onerilen akis:

1. Electron main process `DATABASE_URL=file:<AppData DB>` degerini hazirlar.
2. Next.js server baslamadan once migration/prepare komutu ayni `DATABASE_URL` ile calistirilir.
3. Migration status temizse server baslatilir.
4. Migration uygulanmasi gerekiyorsa kullaniciya veya bootstrap akisa uygun sekilde calistirilir.

Dikkat:

- Migration komutu yanlislikla local `prisma/dev.db` uzerinde calismamalidir.
- `DATABASE_URL` set edilmeden Prisma import edilmemelidir.
- Desktop migration komutlari Electron main process veya installer bootstrap akisi tarafindan yonetilmelidir.

## Riskler

Baslica riskler:

- AppData DB varken local DB'nin uzerine kopyalanmasi.
- Hedef DB icin yedek alinmadan islem yapilmasi.
- SQLite dosyasi uygulama acikken kopyalanmaya calisilmasi.
- `DATABASE_URL` yanlis DB'ye isaret ederken migration calismasi.
- Upload dosyalari ile DB'deki relative `filePath` kayitlarinin uyusmamasi.
- Ayni isimli upload dosyalarinin ezilmesi.
- Kopyalama yarida kesilirse bozuk DB olusmasi.
- Installer update sirasinda AppData klasorunun silinmesi.
- Marker file'in gercek path veya hassas bilgi icermesi.

Risk azaltma:

- AppData DB varsa otomatik overwrite yok.
- Copy islemi temp dosya + rename ile yapilir.
- Yedek almadan destructive adim yok.
- Upload kopyalamada varsayilan skip.
- Dry-run raporu gercek copy oncesi kullaniciya veya loga sunulur.
- System Status path gostermeden migration hazirligini raporlar.

## Asamali Uygulama Onerisi

### A. DB migration plan dokumani

- Bu belge hazirlanir.
- Riskler, rollback ve testler netlestirilir.

### B. Dry-run helper

- Kaynak DB var mi?
- Hedef DB var mi?
- Upload kaynak/hedef durumu nedir?
- Kopyalama yapilsa ne olur?
- Hicbir dosyaya yazmadan rapor uretir.
- `src/lib/desktop-migration-dry-run-utils.ts` bu analiz icin hazirlanacaktir.
- Dry-run sonucu local DB, desktop DB, local uploads, desktop uploads, onerilen aksiyon, uyarilar ve hatalari raporlar.
- Dry-run kesinlikle DB kopyalamaz, upload tasimaz ve `DATABASE_URL` degistirmez.

### C. Copy helper ama otomatik calismayacak

- Temp DB kopyalama.
- SQLite header kontrolu.
- Upload kopyalama `skip existing` stratejisi.
- Marker file yazma.
- Bu helper Electron tarafindan manuel/kontrollu cagrilana kadar aktif olmaz.

### D. System Status migration dry-run gostergesi

- "Desktop DB migration gerekli mi?" bilgisi path gostermeden raporlanir.
- AppData DB var/yok.
- Local DB var/yok.
- Upload kopyalama gerekli mi?

### E. Electron main process entegrasyonu

- `APP_MODE=desktop` ve `DATABASE_URL` server baslamadan once set edilir.
- Dry-run sonucu loglanir.
- Kullanici onayi veya guvenli default akisa gore copy helper cagrilir.

### F. Gercek desktop migration testi

- Temiz Windows makine.
- Mevcut local DB ile gecis.
- Bos DB ile ilk kurulum.
- Upload dosyali DB.
- Kopyalama yarida kesilme simuluasyonu.
- Installer update sonrasi veri korunumu.

## Test Plani

Uygulama asamasinda calistirilacak temel testler:

- Normal web/local modda DB hala `prisma/dev.db`.
- AppData DB yok + local DB var: dry-run "copy önerilir" doner.
- AppData DB var: dry-run "overwrite yok" doner.
- Temp copy yarida kesilirse hedef `dev.db` bozulmaz.
- Upload kopyalamada ayni dosya varsa skip edilir.
- Marker file tam path icermez.
- Prisma migrate status AppData DB uzerinde dogru calisir.
- Backup/restore AppData kaynaklarini kullanir.
- System Status tam path veya `DATABASE_URL` gostermez.
