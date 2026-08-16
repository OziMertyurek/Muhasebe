# Muhasebe Takip Sistemi

Bu proje muhasebe, cari hesap, fatura, odeme, gider, urun/stok, belge arsivi, AI fatura inceleme ve raporlama modullerini tasiyan bir is uygulamasidir.

V1.0 release candidate yonu hosted web uygulamasidir: Next.js Node runtime, Prisma ve PostgreSQL canonical calisma tabanidir. Electron/local desktop kodlari gecis uyumlulugu icin korunur, ancak hosted web paketinin icine alinmaz.

Electron gecicidir, ancak hosted web paritesi kanitlanana kadar korunur. Eski desktop release belgeleri tarihsel baglam olarak kalabilir; yeni mimari kararlar icin `docs/architecture/decisions/` ve `docs/HOSTED_WEB_MIGRATION_ROADMAP.md` kaynak alinmalidir.

## Documentation Status

- Current architecture direction: `DEVELOPMENT_CHARTER.md`, `docs/HOSTED_WEB_MIGRATION_ROADMAP.md`, `docs/architecture/decisions/`, this README.
- Migration guidance: `docs/HOSTED_WEB_MIGRATION_ROADMAP.md`, `docs/ROADMAP.md`.
- Historical desktop documentation: desktop release notes, Electron packaging plans, AppData migration plans, macOS packaging plans, and release templates. These documents describe earlier desktop work and should not be rewritten as if history changed.

## v2.2.0 Desktop Release Durumu

Bu sürüm Windows desktop kullanımı için setup installer ve portable exe paketleri hazır olan stabil desktop release sürümüdür.

- Windows setup installer ve portable exe üretilebilir.
- Paketli desktop modda veriler `%APPDATA%/MuhasebeTakip/` altında saklanır.
- Node.js ve Python kurulu olmayan kullanicilar icin paketli uygulamada bundled Node ve bundled Python runtime kullanilir.
- Onboarding, local PIN/login, backup/restore, ZIP/CSV/PDF download ve AI fatura okuma akışları korunur.
- Yardim Merkezi, sayfa ici ipucu kutulari ve baloncuklu Baslangic Turu yeni kullanicilarin uygulamayi daha kolay ogrenmesine yardim eder.
- GitHub sadece kodu saklar; veritabanı ve upload dosyalarını saklamaz.
- Veritabanı ve upload dosyaları için düzenli yedek alınmalıdır.


## Hangi dosyayi indirmeliyim?

Windows 10/11 kullaniyorsaniz GitHub Release sayfasindan su dosyayi indirin:

```text
Muhasebe-Takip-v2.2.0-Windows-Release.zip
```

ZIP icinden onerilen kurulum dosyasi:

```text
Muhasebe-Takip-Setup-2.2.0.exe
```

Kurulum yapmak istemeyen ileri kullanicilar portable surumu kullanabilir:

```text
Muhasebe-Takip-Portable-2.2.0.exe
```

Node.js veya Python kurmaniza gerek yoktur; Windows desktop paketi gerekli runtime'lari beraber getirir. Veriler %APPDATA%/MuhasebeTakip/ altinda saklanir. Duzenli olarak Ayarlar > Yedekleme > Tam Yedek Indir ile tam yedek alinmalidir.

macOS icin ciktilar isletim sistemi mimarisine gore ayrilir:

```text
Muhasebe-Takip-2.2.0-macOS-arm64.dmg
Muhasebe-Takip-2.2.0-macOS-x64.dmg
```

Apple Silicon Mac icin `arm64`, Intel Mac icin `x64` dosyasi indirilmelidir. macOS uygulamasi henuz Apple Developer ID ile signed/notarized degildir; Gatekeeper uyarisi gorulebilir. Ilk acilista gerekirse sag tik > Open kullanilabilir.

macOS build denemeleri GitHub Actions uzerinden manuel workflow ile yapilir. Gercek Mac cihaz testi v2.2.0 sonrasinda ayrica takip edilecektir.
## Özellikler

- Dashboard gerçek veri özetleri
- Cari hesap yönetimi
- Fatura yönetimi
- Tahsilat / ödeme takibi
- Kasa & banka / kredi kartı hesapları
- Gider yönetimi
- Urunler / stok kartlari
- Fatura kalemlerinden stok giris/cikis
- Manuel stok hareketleri ve minimum stok uyarilari
- Sabit giderler
- Önemli tarihler / hatırlatmalar
- Cari ekstre
- Dosya arşivi
- AI fatura okuma, inceleme, eslestirme ve onayli fatura kaydi
- Raporlar
- CSV dışa aktarma
- PDF dışa aktarma
- Ayarlar ve yedekleme

## Teknolojiler

- Next.js
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL hosted runtime
- Electron transitional desktop compatibility
- Cloudflare Free target edge layer
- Cloudflare R2 preferred object-storage direction

## Local Kurulum

Önce bağımlılıkları kurun:

```bash
npm install
```

Prisma client üretin:

```bash
npm run prisma:generate
```

Local PostgreSQL veritabani icin migration calistirin:

```bash
npx prisma migrate deploy
```

Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

PowerShell'de `npm.ps1` çalıştırma kısıtı varsa aynı komutları `npm.cmd` ile çalıştırabilirsiniz:

```bash
npm.cmd run dev
```

## MarkItDown Metin Çıkarma Kurulumu

AI Fatura Okuma ekranındaki local `MarkItDown ile Metin Cikar` ozelligi icin bilgisayarda Python kurulu olmalidir.

Python worker bağımlılığını kurmak için:

```bash
cd python-worker
pip install -r requirements.txt
```

Bu özellik PDF, görsel veya HTML fatura dosyasından Markdown/metin çıkarmak için kullanılır. Henüz fatura alanlarını otomatik doldurmaz ve `Invoice` kaydı oluşturmaz.

## Windows'ta Antigravity Olmadan Çalıştırma

Antigravity şart değildir. Bu proje Windows üzerinde normal bir local web uygulaması olarak çalışır. Bilgisayarda Node.js yüklü olmalıdır.

Windows'ta hızlı kullanım:

1. İlk kurulum için proje klasöründeki `setup.bat` dosyasını çalıştırın.
2. Sonraki kullanımlarda `start-dev.bat` veya `start-prod.bat` dosyasını çalıştırın.
3. Tarayıcıdan `http://localhost:3000` adresini açın.

`setup.bat` bağımlılıkları kurar, Prisma client üretir, migration çalıştırır ve Python varsa MarkItDown worker bağımlılıklarını yükler. `start-dev.bat` günlük local kullanım için geliştirme server'ını açar. `start-prod.bat` önce build alır, sonra `npm run start` ile production modda uygulamayı başlatır.

Hosted V1 runtime kayitlari PostgreSQL'de saklar. Local/desktop gecis modunda eski `prisma/dev.db` ve `storage/uploads/` davranisi korunur; bu dosyalar GitHub'a gitmez.

Windows desktop paketleri de hazırdır: Electron portable exe ve Windows setup installer build komutları aşağıdaki bölümde yer alır. Desktop paketli modda veriler AppData altında saklanır; yine de düzenli tam yedek alınmalıdır.

## Electron Desktop Kullanımı

Electron wrapper, dev/prod çalışma, portable exe ve Windows setup installer build akışları hazırdır. Normal web kullanımı hâlâ desteklenir.

Electron penceresinde tek komutla çalıştırmak için:

```bash
npm run electron:dev
```

`npm run electron:dev` port 3000'de çalışan bir Next.js server var mı kontrol eder. Varsa mevcut server'ı kullanır. Yoksa `npm run dev` komutunu otomatik başlatır ve server hazır olunca Electron penceresinde uygulamayı açar. Next.js server belirlenen sürede açılmazsa Electron penceresinde Türkçe hata ekranı gösterilir.

Normal web/tarayıcı kullanımı hâlâ aynıdır:

```bash
npm run dev
```

Production Electron denemesi için önce build alın, sonra Electron'u production server ile açın:

```bash
npm run build
npm run electron:prod
```

`npm run electron:prod`, port 3000 boşsa `.next/standalone/server.js` dosyasını Node child process olarak başlatır. Port 3000 zaten doluysa mevcut server'ı kullanır ve onu kapatmaya çalışmaz.

Normal web/local modda `DATABASE_URL`, SQLite veritabanı yolu ve upload klasörü değiştirilmemiştir. Paketli Electron modunda kullanıcı verisi `%APPDATA%/MuhasebeTakip/` altında saklanır.

Paketli Windows build sirasinda `prepare:bundled-python` adimi yerel Python runtime'ini `build/python` altinda hazirlar ve installer/portable pakete `resources/python` olarak ekler. Bu sayede son kullanici bilgisayarinda Python kurulu olmasa bile MarkItDown metin cikarma akisi paketli uygulamada calisabilir. Gelistirme modunda sistem Python veya `py` launcher fallback olarak kullanilmaya devam eder.

Desktop ikon dosyalari `assets/` klasorundedir. `assets/icon.ico` Windows exe, installer, masaustu kisayolu, Start Menu kisayolu ve Electron pencere ikonu icin kullanilir; `assets/icon.png` kaynak/preview dosyasidir.

İlk portable Electron build denemesi için:

```bash
npm run build
npm run dist:portable
```

Bu komut `dist/Muhasebe-Takip-Portable-2.2.0.exe` çıktısını üretir. Paket içine `.env`, local DB ve upload klasörleri alınmaz; paketli Electron modunda kullanıcı verisi AppData altındaki `MuhasebeTakip` veri klasöründe tutulur.

Windows setup installer denemesi için:

```bash
npm run build
npm run dist:installer
```

Bu komut `dist/Muhasebe-Takip-Setup-2.2.0.exe` çıktısını üretir. Installer masaüstü ve Start Menu kısayolu oluşturur. Kaldırma sırasında AppData içindeki uygulama verisi otomatik silinmez; veritabanı ve upload dosyaları için düzenli tam yedek alınmaya devam edilmelidir.

Desktop build çıktıları `dist/` altında oluşur ve Git'e alınmaz. Son kullanıcıya dosya vermeden önce `Ayarlar > Yedekleme > Tam Yedek İndir` akışı ile tam yedek alma alışkanlığı korunmalıdır.

## Destek Araclari

Desktop uygulama icinde `Ayarlar > Sistem Durumu` sayfasinda destek araclari bulunur:

- Veri klasorunu ac
- Log klasorunu ac
- Hata raporu disa aktar

Bu araclar sadece Electron masaustu uygulamasinda calisir. Normal tarayici/local web modunda butonlar pasif gorunur. Hata raporu Downloads/MuhasebeTakip altina guvenli bir TXT dosyasi olarak yazilir; `.env`, gercek `DATABASE_URL`, tam AppData/DB pathleri, kullanici upload dosyalari, fatura dosyalari ve backup ZIP dosyalari rapora eklenmez.

## Ortam Değişkenleri

`.env.example` dosyasına göre local `.env` dosyası oluşturun.

Gerçek `.env` dosyasını GitHub'a göndermeyin. Bu dosya local ayarlar içindir.

Örnek:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

## Veritabanı

Hosted web runtime icin proje Prisma ile PostgreSQL kullanir. `DATABASE_URL`
PostgreSQL connection string olmali ve gercek deger repository'ye
gonderilmemelidir.

Aktif PostgreSQL migration gecmisi `prisma/migrations/` altindadir.
Gecmis SQLite migrationlari denetim ve desktop gecis referansi olarak
`prisma/sqlite-migrations/` altinda saklanir; PostgreSQL'e uygulanmaz.

- `prisma/dev.db` GitHub'a gönderilmez.
- `prisma/dev.db-journal` GitHub'a gönderilmez.
- `prisma/migrations/` klasörü commitlenir; migration geçmişi projede tutulur.
- Hosted PostgreSQL yedekleme/restore hosting veya veritabani saglayicisi
  uzerinden yonetilir.

## Dosya Yüklemeleri

V1 hosted-safe gecis durumunda yuklenen dosyalar `storage/uploads/` veya `DOCUMENT_UPLOAD_DIR` ile verilen klasorde tutulur.

Persistent object storage V1.1 sonrasi icin planlidir. Cloudflare R2 tercih edilen yondur, ancak V1.0 release candidate kapsaminda henuz uygulanmamistir.

- `storage/uploads/` GitHub'a gönderilmez.
- Fatura PDF'leri, görseller ve ek dosyalar bu klasörde saklanır.
- Bu klasör düzenli olarak ayrıca yedeklenmelidir.

## Yedekleme

GitHub sadece kodu saklar. PostgreSQL veritabani, `.env` ve upload dosyalari GitHub'a gitmez.

Hosted mimaride kullaniciya acik is verisi exportlari ile altyapi backup/disaster recovery ayridir. CSV/PDF exportlar kullaniciya acik kalabilir; managed PostgreSQL backup/PITR ve object-storage backup/versioning altyapi sorumlulugudur. Normal kullanicilar production veritabanini restore ederek degistirememelidir.

PostgreSQL runtime altinda kullaniciya acik SQLite DB indirme ve ZIP restore kapatilir. Production veritabani backup/restore islemleri hosting veya veritabani saglayicisi uzerinden yonetilmelidir.

Desktop/local gecis modunda eski SQLite ZIP yedekleme ekrani korunur; bu davranis hosted production backup stratejisi yerine gecmez.

## Geri Yükleme / İçeri Aktarma

Hosted PostgreSQL production ortaminda uygulama icinden ZIP restore yapilmaz. Geri yukleme islemleri sadece hosting/veritabani saglayicisinin backup/restore araci veya onayli operasyon proseduru ile yapilmalidir.

Desktop/local gecis dokumanlarinda anlatilan SQLite ZIP restore akisi tarihsel/yerel uyumluluk icindir; hosted V1 production veritabanini degistirmek icin kullanilmaz.

## Kullanım Akışı

Önerilen temel kullanım sırası:

1. Cari oluştur
2. Fatura oluştur
3. Tahsilat / ödeme gir
4. Gider ekle
5. Önemli tarih ekle
6. Dashboard ve raporları kontrol et
7. CSV/PDF export al
8. Düzenli yedek al

Daha detaylı kullanım rehberi için [docs/USAGE.md](docs/USAGE.md) dosyasına bakın.

## AI/OCR Notu

AI fatura akisi V1'de guvenli inceleme taslagi uretir; kullanici onayi olmadan muhasebe veya stok kaydi olusturmaz.

Hazır olan altyapı:

- `AiExtractionJob` modeli
- AI Fatura Okuma, inceleme ve onay ekrani
- Dosya Arşivi entegrasyonu
- Dosya seçerek analiz kaydı oluşturma
- MarkItDown ile local dosyadan ham metin çıkarma
- Cari/urun eslestirme, dogrulama uyarilari ve onayli fatura kaydi

Hosted production icin `DOCUMENT_PROCESSOR_MODE=HOSTED_SAFE` kullanilabilir; bu mod AI saglayicisi yokken kullaniciya tekrar denenebilir, guvenli bir hata durumu gosterir. Harici AI saglayici ayarlari ortam degiskenleriyle verilir ve gercek secret'lar repository'ye yazilmaz.


## Güvenlik Notları

- Hosted runtime PostgreSQL kullanir; `.env`, gercek `DATABASE_URL`, veritabani yedekleri ve upload dosyalari GitHub'a gonderilmez.
- Local PIN mevcut desktop/local model icin gecici korumadir. Hosted production PIN/auth seed yoksa kapali baslar; kalici cok kullanicili web authentication V1.1 guvenlik maddesidir.
- Desktop server paketli modda `127.0.0.1` ile sinirlandirilir ve local Host/Origin kontrolleri uygulanir. Bu hosted web authentication yerine gecmez.
- Cok sayida hatali PIN denemesinde gecici kilit uygulanir.
- Hosted PostgreSQL backup/restore hosting veya veritabani saglayicisi uzerinden yonetilmelidir.
- Hata raporu hassas verileri icermeyecek sekilde tasarlanmistir; `.env`, gercek `DATABASE_URL`, tam local path ve kullanici dosyalari rapora eklenmez.
- Windows build henuz code signed degildir; SmartScreen uyarisi gorulebilir.
- macOS build henuz Apple Developer ID ile signed/notarized degildir; Gatekeeper uyarisi gorulebilir.

- V1.0 release candidate calisma tabani hosted web + PostgreSQL'dir; desktop kodlari gecis uyumlulugu icin korunur.
- `.env`, `prisma/dev.db`, `storage/uploads/` GitHub'a gönderilmez.
- Upload dosyaları ve DB yedekleri dikkatli saklanmalıdır.
- Desktop/local gecis modunda indirilen DB yedegi guvenli saklanmalidir; hosted production PostgreSQL yedegi saglayici/operasyon sorumlulugudur.
- Yüklenen dosyaların orijinal adları doğrudan dosya yolu olarak kullanılmaz.

## Dokümanlar

- [Kullanım Rehberi](docs/USAGE.md)
- [Manuel Test Planı](docs/TEST_PLAN.md)
- [Roadmap](docs/ROADMAP.md)
- [Release Notes](docs/RELEASE_NOTES.md)
- [İlk Kullanım](docs/FIRST_RUN.md)

## Sık Kullanılan Komutlar

```bash
npm run dev
npm run build
npm run lint
npm run prisma:generate
npx prisma migrate dev
```

## Musteri Kullanim Rehberi

Uygulamayi kullanmaya baslayan musteriler icin temel akislari anlatan yazili rehber [docs/USER_GUIDE.md](docs/USER_GUIDE.md) dosyasindadir. Uygulama icinde ayni bilgilerin kisa ozeti sol menudeki `Yardim` sayfasindan acilabilir.

Baslangic Turu Dashboard ve Yardim Merkezi uzerinden baslatilabilir. Tur, Dashboard, Sidebar, Cariler, Faturalar, AI Fatura Okuma, Yedekleme, System Status/Destek ve Yardim Merkezi adimlarini kisa baloncuklarla anlatir.
