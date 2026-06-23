# SQLite DB Encryption Plan

## Amac

Bu dokuman, Muhasebe Takip'in mevcut Prisma + SQLite + Electron/AppData mimarisinde veritabani sifrelemenin teknik fizibilitesini, risklerini ve guvenli gecis planini degerlendirir.

Bu asamada uygulama kodu, Prisma schema, migration, package dependency veya backup/restore davranisi degistirilmemistir.

## Mevcut Durum

### Runtime ve DB yollari

Uygulama Prisma Client'i `@prisma/adapter-better-sqlite3` ile aciyor. Prisma adapter su URL'i kullanir:

```text
process.env.DATABASE_URL ?? file:./prisma/dev.db
```

Normal web/local mod:

- DB: `prisma/dev.db`
- Upload: `storage/uploads/`
- Restore backup: `storage/restore-backups/`
- Backup: `storage/backups/`

Desktop packaged mod:

- Electron main process, standalone Next.js server baslamadan once `APP_MODE=desktop` set eder.
- Electron main process, `DATABASE_URL=file:<desktop-data>/database/dev.db` set eder.
- Windows veri klasoru: `%APPDATA%/MuhasebeTakip/`
- macOS veri klasoru: `~/Library/Application Support/MuhasebeTakip/`
- Linux/test fallback: `~/.local/share/MuhasebeTakip/`

Desktop ic yapi her platformda aynidir:

```text
database/dev.db
uploads/
restore-backups/
backups/
logs/
```

### Bootstrap

Packaged Electron acilisinda `electron/desktop-db-bootstrap.js` calisir:

- AppData/Library veri klasorlerini olusturur.
- `better-sqlite3` ile `database/dev.db` dosyasini acar.
- `prisma/migrations` altindaki SQL migration dosyalarini uygular.
- Mevcut DB varsa uzerine yazmaz.
- `prisma/dev.db` dosyasini paketlemez ve AppData'ya kopyalamaz.

Bu akista sifreleme yoktur; DB standart SQLite dosyasidir.

### Backup ve restore

Tam yedek ZIP formati:

```text
database/dev.db
uploads/
backup-info.json
```

DB-only backup, dogrudan mevcut SQLite DB dosyasini indirir.

Restore akisi:

- ZIP icinde yalnizca `database/dev.db`, `uploads/` ve `backup-info.json` bekler.
- `.env`, `.env.local`, `.next`, `node_modules`, guvensiz path ve beklenmeyen hassas dosyalari reddeder veya uyarir.
- Restore oncesinde otomatik guvenlik yedegi alir.
- Restore basarisiz olursa mevcut DB/uploads dosyalarini guvenlik yedeginden geri almaya calisir.

Bu yapi DB sifreleme icin iyi bir rollback zemini saglar; ancak ZIP formati ve restore validator'u sifreli DB header/metadata icin guncellenmeden SQLCipher benzeri bir gecis calismaz.

## Risk Analizi

### Bugunku guvenlik seviyesi

v2.1.1 itibariyla uygulama su korumalara sahiptir:

- Export CSV/PDF route auth korumasi.
- AI extraction POST auth korumasi.
- Production/packaged server `127.0.0.1` bind.
- PIN rate limit.
- Origin/Host kontrolu.
- `npm audit` sonucu 0 vulnerabilities.
- Diagnostics raporlarinda `.env`, gercek `DATABASE_URL`, tam path ve kullanici dosyalari yok.

Ancak SQLite DB dosyasi sifreli degildir. Dosya sistemi seviyesinde DB dosyasina erisen biri DB'yi standart SQLite araci ile okuyabilir.

### Tehdit modelleri

| Tehdit | Mevcut durum | DB encryption etkisi |
| --- | --- | --- |
| PIN bilmeden uygulamaya girmeye calisan kisi | PIN, auth ve rate limit engeller. | DB encryption ek fayda saglamaz; uygulama ici girisi zaten PIN korur. |
| Ayni bilgisayarda dosya sistemine erisen kisi | `dev.db` kopyalanip okunabilir. | SQLCipher veya alan bazli encryption ciddi koruma saglar. |
| DB dosyasini kopyalayan kisi | DB plaintext okunur. | SQLCipher kullanilirsa DB tek basina acilmaz. |
| Backup ZIP dosyasini ele geciren kisi | ZIP icinde plaintext DB ve uploads olabilir. | DB sifreliyse DB korunur, ama uploads plaintext kalir; ZIP encryption ayrica gerekir. |
| Windows/macOS kullanici hesabina erisen kisi | AppData/Library ve uygulama oturumu risktedir. | OS credential store kullaniliyorsa oturum acikken anahtara erisim mumkun olabilir. |
| Admin/root yetkisi olan kisi | Uygulama, process ve dosya sistemi kontrol edilebilir. | DB encryption riski azaltir ama tam koruma saglamaz; admin memory/key extraction yapabilir. |

## Alternatifler

### A. SQLCipher

SQLCipher, SQLite dosyasini sayfa seviyesinde sifreleyen en yaygin yaklasimdir.

Uygunluk:

- Prisma ile dogrudan resmi ve basit bir SQLCipher modu yoktur.
- Mevcut uygulama `@prisma/adapter-better-sqlite3` kullaniyor.
- `better-sqlite3` standart SQLite ile derlenir; SQLCipher icin SQLCipher destekli native build veya alternatif binding gerekir.
- Prisma adapter'in DB acilir acilmaz `PRAGMA key` calistirma yetenegi netlestirilmelidir.
- Desktop bootstrap da `better-sqlite3` ile migration calistirdigi icin ayni SQLCipher acilis/key akisini desteklemelidir.

Windows packaged riskleri:

- SQLCipher native dependency paketlenmeli.
- Windows x64 native build gerekir.
- `electron-builder`, standalone, bundled node ve native module paketleme tekrar test edilmelidir.

macOS packaged riskleri:

- Ayrica `darwin-arm64` ve `darwin-x64` native build gerekir.
- GitHub Actions build gecse bile gercek Mac cihaz testleri gerekir.
- Signing/notarization olmadigi icin native dylib/loader davranisi dikkat ister.

Migration riski:

- Plain SQLite dosyasi SQLCipher dosyasina tek adimda cevrilmez.
- En guvenli yontem yeni sifreli DB olusturup veriyi kontrollu export/import etmek veya SQLCipher `sqlcipher_export` kullanmaktir.
- Yari kalan migration veri kaybi riski tasir; otomatik tam yedek ve atomic swap gerekir.

Performans:

- Kucuk/orta muhasebe DB'leri icin kabul edilebilir olmasi beklenir.
- Buyuk upload dosyalari DB disinda oldugu icin DB encryption upload performansini etkilemez.

PIN unutulursa:

- Eger DB anahtari PIN'den turetilirse PIN unutulunca veri kaybi olur.
- Recovery key veya OS credential store ile sarmalanmis data key yoksa backup da acilmayabilir.

Backup/restore etkisi:

- Tam yedek ZIP sifreli `database/dev.db` icerir.
- Restore icin ayni data key/recovery key gerekir.
- Upload dosyalari DB disinda kaldigi icin ZIP ayrica sifrelenmezse upload'lar plaintext kalir.

Sonuc:

- Gercek DB at-rest encryption icin en guclu aday SQLCipher'dir.
- Ancak mevcut Prisma + better-sqlite3 mimarisinde dogrudan uygulanabilir kabul edilmemelidir; once teknik POC gerekir.

### B. better-sqlite3 + encryption destegi

Mevcut `better-sqlite3` paketi standart SQLite binding'dir. Kendi basina SQLCipher encryption ozelligi sunmaz.

Uygunluk:

- Standart `better-sqlite3` ile `PRAGMA key` calismaz.
- SQLCipher icin ya SQLCipher ile derlenmis bir fork/binary gerekir ya da farkli native binding gerekir.
- Prisma adapter'in bu binding ile uyumlu olup olmadigi test edilmelidir.

Native/build riski:

- Yuksek. Windows/macOS x64/arm64 icin native binary stratejisi gerekir.

Sonuc:

- Mevcut paketle DB encryption uygulanamaz.
- SQLCipher POC aslinda `better-sqlite3` native stack'inin degistirilmesi anlamina gelir.

### C. Prisma ile SQLCipher uyumlulugu

Prisma'nin SQLite destegi standart SQLite URL'i ve native query engine/adapter zinciri uzerinden calisir.

Riskler:

- Prisma Client, connection acilirken SQLCipher key'i set etmelidir.
- Adapter seviyesinde connection'a erken `PRAGMA key` verme mekanizmasi yoksa Prisma sorgulari sifreli DB'yi okuyamaz.
- Prisma migration ve desktop bootstrap ayni key akisini kullanmalidir.
- `prisma migrate` CLI'nin SQLCipher DB ile calismasi ayrica test edilmelidir.

Sonuc:

- Uyumluluk dogrulanmadan production DB encryption baslatilmamalidir.
- POC icin ilk hedef: sifreli DB ac, Prisma Client ile basit CRUD calistir, migration uygula, packaged build al.

### D. OS-level encryption

Windows BitLocker, macOS FileVault veya kullanici profili/disk sifreleme kullanilir.

Uygunluk:

- Uygulamaya kod degisikligi gerektirmez.
- Prisma, backup/restore, Electron paketleme etkilenmez.

Guvenlik:

- Cihaz kapaliyken veya disk sokulup kopyalanirken iyi koruma saglar.
- Kullanici oturumu acikken AppData/Library dosyalarina erisen zararlı yazilima karsi korumaz.
- Backup ZIP dosyasi kullanici tarafindan baska yere kopyalanirsa ZIP plaintext kalir.

Sonuc:

- Kisa vadede kullanici dokumantasyonu icin onerilmeli.
- Uygulama seviyesinde DB encryption yerine gecmez.

### E. Uygulama seviyesinde alan bazli encryption

Belirli hassas alanlar uygulama kodunda sifrelenir.

Uygunluk:

- Prisma ile calisabilir; DB dosyasi standart SQLite kalir.
- DB schema ve kod seviyesinde alan bazli degisiklik gerekir.
- Arama, filtre, rapor ve hesaplama gereken alanlar icin zorlayicidir.

Riskler:

- Hangi alanlarin sifrelenecegi dikkatli secilmelidir.
- Cari/fatura tutarlari, tarihler ve rapor alanlari sifrelenirse sorgu/rapor mantigi bozulur.
- Kismi sifreleme kullanicida "DB tamamen sifreli" algisi yaratmamalidir.

Sonuc:

- Tum DB encryption yerine gecmez.
- Sadece belirli not/aciklama/vergi no gibi alanlarda ileride degerlendirilebilir.

### F. Backup ZIP encryption

Tam yedek ZIP dosyasi parola veya recovery key ile sifrelenir.

Uygunluk:

- DB runtime mimarisinden daha az risklidir.
- Upload dosyalarini da korur.
- Restore UI'si parola/recovery key alacak sekilde genisletilmelidir.

Riskler:

- JSZip'in guvenli AES ZIP encryption destegi sinirlidir; guvenilir bir kutuphane veya ayri paket gerekir.
- Parola unutulursa backup acilamaz.
- Backup restore baska bilgisayarda calisacaksa key/parola yonetimi net olmalidir.

Sonuc:

- DB encryption'dan once uygulanabilecek daha dusuk riskli ve kullaniciya net fayda saglayan ilk adimdir.
- Ancak dogru crypto kutuphanesi ve UX tasarimi gerekir.

## Key Yonetimi

### PIN'den turetilen key

Avantaj:

- Kullanici zaten PIN kullaniyor; ek kurulum basit gorunur.
- DB kopyalayan kisi PIN'i bilmeden DB'yi acamaz.

Risk:

- PIN genelde dusuk entropilidir.
- Offline attacker DB dosyasini alip brute-force deneyebilir.
- PIN unutulursa recovery yoksa veri kaybi olur.
- Mevcut PIN rate limit offline DB kopyasina uygulanamaz.

Sonuc:

- Tek basina onerilmez.
- Ancak guclu KDF + recovery key + data key wrapping modelinde kullanilabilir.

### Ayrı recovery key

Avantaj:

- PIN unutulursa veri kurtarilabilir.
- Backup baska bilgisayara tasinabilir.

Risk:

- Kullanici recovery key'i kaybederse veri kaybi devam eder.
- Recovery key'i ele geciren kisi DB/backup acabilir.
- UX dikkat ister; ilk kurulumda net anlatilmalidir.

Sonuc:

- Gercek DB encryption icin kritik gereksinimdir.

### OS credential store / keytar benzeri cozum

Avantaj:

- Data key Windows Credential Manager veya macOS Keychain icinde saklanabilir.
- Kullanici her acilista uzun key girmek zorunda kalmaz.
- Platform guvenlik modelinden faydalanir.

Risk:

- Yeni native dependency getirir.
- Packaged Windows/macOS build ve signing davranisi test ister.
- Ayni kullanici hesabina erisen zararlı yazilim key'e ulasabilir.
- Baska bilgisayara restore icin recovery key gerekir.

Sonuc:

- En kullanilabilir mimari icin guclu adaydir.
- DB encryption POC ile birlikte credential store POC yapilmadan production'a alinmamalidir.

### AppData icinde saklanan key

Avantaj:

- Uygulama acilisi cok kolaydir.
- Ek native dependency gerektirmeyebilir.

Risk:

- DB dosyasini kopyalayan kisi AppData key dosyasini da kopyalarsa encryption anlamsizlasir.
- Malware veya ayni kullanici hesabi altindaki kisi key'e ulasabilir.

Sonuc:

- Tek basina guvenli kabul edilmemelidir.
- Sadece OS credential store yoksa gecici/duzeyi dusuk bir fallback olabilir; kullaniciya acikca belirtilmelidir.

### Kullaniciya verilen yedek recovery key

Avantaj:

- Baska bilgisayara restore ve PIN unutma senaryosunu cozer.
- Backup encryption ile uyumludur.

Risk:

- Kaybedilirse veri kaybi.
- Paylasilirsa veri ifsasi.
- Destek sureci karmasiklasir.

Sonuc:

- Sifreli DB/backup icin gerekli ama UX ve dokumantasyon iyi tasarlanmalidir.

## Onerilen Mimari

Kisa vadede saf PIN tabanli DB encryption onerilmez.

Onerilen uzun vadeli mimari:

1. Rastgele uretilmis yuksek entropili bir data key kullan.
2. DB encryption bu data key ile yapilsin.
3. Data key, OS credential store icinde saklansin.
4. Data key ayrica kullaniciya verilen recovery key ile sarmalansin.
5. PIN, yalnizca uygulama girisi ve opsiyonel key unlock UX'i icin kullanilsin; tek basina tek kurtarma yolu olmasin.
6. Backup ZIP encryption, DB encryption'dan bagimsiz olarak uploads dosyalarini da koruyacak sekilde tasarlansin.

Minimum riskli ilk adim:

- DB encryption'a girmeden once encrypted backup ZIP POC ve key/recovery UX POC yap.
- Ardindan SQLCipher + Prisma adapter POC yap.
- POC sonucuna gore DB encryption v2.2.x veya daha sonraki bir release'e alinmali.

## Migration Plani

Mevcut v2.1.1 kullanicisinda plaintext DB varsa guvenli gecis su sekilde olmali:

1. Uygulama acilista DB encryption durumunu tespit eder.
2. DB plaintext ise kullaniciya acik ve kisa bilgi gosterilir.
3. Kullanici encryption baslatmadan once tam yedek almasi istenir.
4. Uygulama otomatik pre-encryption safety backup alir:

```text
restore-backups/before-db-encryption-YYYY-MM-DD-HH-mm-ss/
  database/dev.db
  uploads/
  backup-info.json
```

5. Yeni sifreli DB gecici dosyada olusturulur:

```text
database/dev.db.encrypted.tmp
```

6. Migration stratejisi SQLCipher POC sonucuna gore secilir:

- SQLCipher destekliyse `sqlcipher_export` benzeri kontrollu export.
- Alternatifte Prisma/app seviyesinde tablo tablo kopyalama.

7. Kopyalama sonrasi dogrulama:

- Migration kayitlari.
- Kritik tablo sayilari.
- AppSetting/onboarding/PIN varligi.
- Fatura/cari/gider temel sayilari.
- DB acilip basit Prisma sorgusu.

8. Dogrulama basariliysa atomic swap:

```text
dev.db -> dev.db.plain.backup
dev.db.encrypted.tmp -> dev.db
```

9. Uygulama yeniden baslatilir veya Prisma connection yeniden kurulur.
10. Basarisizlikta tmp dosya silinir, orijinal DB korunur, safety backup kullaniciya bildirilir.

Yari kalan migration riski:

- Elektrik kesilmesi veya process kill durumunda orijinal DB silinmemelidir.
- Atomic swap oncesinde orijinal DB oldugu gibi kalmalidir.
- `dev.db.plain.backup` dosyasinin ne zaman temizlenecegi kullanici onayina baglanmalidir.

## Backup/Restore Plani

### DB encryption sonrasi backup

Tam yedek ZIP su seceneklerden biriyle ilerlemeli:

1. ZIP icinde sifreli `database/dev.db` + plaintext uploads.
2. ZIP icinde sifreli `database/dev.db` + ZIP-level encryption ile korunmus uploads.

Guvenlik acisindan ikinci secenek daha dogrudur. Cunku upload dosyalari fatura/PDF/gorsel gibi hassas veri icerebilir.

### Restore

Restore akisi su bilgileri dogrulamalidir:

- Yedek sifreli mi?
- DB encryption schema/format versiyonu nedir?
- Backup hangi app version ile alinmis?
- Recovery key gerekiyor mu?
- Mevcut cihazdaki data key ile acilabilir mi?

Restore baska bilgisayarda mumkun olmalidir; bunun icin recovery key veya export edilen key paketi gerekir.

PIN degisirse:

- Data key sabit kalirsa eski backup acilabilir.
- Data key dogrudan PIN'den turetilirse eski backup PIN degisimiyle uyumsuz hale gelebilir.

PIN unutulursa:

- Sadece PIN tabanli key modelinde backup da ise yaramayabilir.
- Recovery key modeli bu nedenle gereklidir.

Eski sifresiz backup dosyalari:

- Geriye donuk restore destegi korunmalidir.
- Restore sirasinda kullaniciya "Bu yedek sifresizdir; restore sonrasi DB tekrar sifrelenecektir" bilgisi verilebilir.
- Eski sifresiz backup'lar otomatik silinmemelidir; kullaniciya guvenli saklama/silme onerisi verilmelidir.

## Rollback Plani

DB encryption migration basarisiz olursa:

- Orijinal `dev.db` korunur.
- Gecici sifreli DB silinir.
- Alinan pre-encryption safety backup korunur.
- Uygulama kullaniciya Turkce, path sizdirmayan hata gosterir.
- Startup log detay yazar ama `DATABASE_URL`, key veya tam path yazmaz.

Encryption release'i geri almak gerekirse:

- Uygulama sifreli DB'yi desteklemeyen eski surume donemeyebilir.
- Bu nedenle encryption release'i one-way migration gibi ele alinmalidir.
- Release notlarinda "sifreleme sonrasi eski surume donus icin encryption oncesi alinmis yedek gerekir" acik yazilmalidir.

## Kullanici Deneyimi

Kullaniciyi korkutmadan net mesajlar verilmeli:

- "Veritabani sifreleme, DB dosyasi kopyalansa bile okunmasini zorlastirir."
- "PIN unutulursa recovery key olmadan veri kurtarilamayabilir."
- "Sifreleme oncesi otomatik guvenlik yedegi alinacak."
- "Recovery key'i guvenli bir yerde saklayin."
- "Tam yedekleri duzenli alin ve guvenli saklayin."

UI gereksinimleri:

- System Status: DB encryption durumu `Aktif / Pasif / Gecis gerekli` gibi gosterilmeli.
- Tam path, `DATABASE_URL`, key veya `.env` icerigi gosterilmemeli.
- Backup sayfasi sifreli/sifresiz yedek formatini anlatmali.
- Restore sayfasi recovery key gerekiyorsa bunu acik istemeli.

## Acik Sorular

- Prisma adapter ile SQLCipher connection'a guvenli sekilde `PRAGMA key` verilebiliyor mu?
- SQLCipher destekli `better-sqlite3` Windows/macOS x64/arm64 icin nasil paketlenecek?
- `prisma migrate` CLI SQLCipher DB ile calisacak mi, yoksa desktop bootstrap SQL migration akisi mi tek kaynak olacak?
- Credential store icin `keytar` veya alternatif dependency paketli Windows/macOS buildlerde sorunsuz mu?
- Backup ZIP encryption icin hangi kutuphane kullanilacak?
- Recovery key UX'i nasil olacak?
- Eski sifresiz backup restore edildikten sonra otomatik re-encryption ne zaman calisacak?
- macOS signing/notarization olmadan credential store/native crypto davranisi sorun cikarir mi?

## v2.2.0 Onerilen Roadmap

v2.2.0 icin dogrudan production DB encryption yerine asamali ve olculebilir kapsam onerilir:

### Faz 1: Fizibilite POC

- SQLCipher + Prisma adapter POC.
- Desktop bootstrap ile sifreli DB migration POC.
- Windows packaged build smoke test.
- macOS GitHub Actions build ve gercek Mac cihaz smoke test.
- Native dependency paketleme raporu.

### Faz 2: Key management POC

- OS credential store arastirmasi.
- Recovery key tasarimi.
- PIN ile data key wrapping risk analizi.
- Diagnostics ve logs icin key/path redaction kontrolu.

### Faz 3: Encrypted backup POC

- ZIP-level encryption veya guvenli container formati.
- Upload dosyalarinin da korunmasi.
- Restore ve recovery key UX'i.
- Eski sifresiz backup restore uyumlulugu.

### Faz 4: Migration dry-run

- Mevcut plaintext DB icin dry-run raporu.
- Otomatik pre-encryption full backup.
- Temp encrypted DB.
- Dogrulama ve atomic swap.
- Rollback testi.

### Faz 5: Production release adayi

- Windows installer/portable full QA.
- macOS arm64/x64 full QA.
- Backup/restore regresyonu.
- PIN forgotten ve recovery senaryolari.
- Release notes ve kullanici kilavuzu.

## Sonuc

DB encryption mevcut mimaride teorik olarak uygulanabilir, fakat bugunku Prisma + `@prisma/adapter-better-sqlite3` + packaged Electron mimarisiyle dusuk riskli bir "tek commit" degisiklik degildir.

En guclu teknik yol SQLCipher'dir; ancak native build, Prisma adapter uyumlulugu, bootstrap migration, backup/restore formati ve key management POC'leri tamamlanmadan production'a alinmamalidir.

Kisa vadede en mantikli yol:

1. Encrypted backup ZIP ve recovery key UX POC.
2. SQLCipher + Prisma packaged POC.
3. OS credential store + recovery key mimarisi.
4. Mevcut DB icin otomatik yedekli, rollback'li migration.

Pure PIN-derived DB key onerilmez; PIN unutulursa veri kaybi riski yuksektir ve offline brute-force'a karsi PIN tek basina guclu degildir.
