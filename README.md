# Local Muhasebe Takip Sistemi

Bu proje local çalışan, şirket içi kullanım için geliştirilmiş mini muhasebe, cari hesap, fatura, ödeme, gider ve raporlama sistemidir.

Uygulama online yayınlanmak için değil, yerel bilgisayarda çalışmak için tasarlanmıştır. Kod private GitHub repository içinde tutulabilir; veritabanı ve yüklenen dosyalar ayrıca yedeklenmelidir.

## v2.0.1 Desktop Release Durumu

Bu sürüm Windows desktop kullanımı için setup installer ve portable exe paketleri hazır olan stabil desktop release sürümüdür.

- Windows setup installer ve portable exe üretilebilir.
- Paketli desktop modda veriler `%APPDATA%/MuhasebeTakip/` altında saklanır.
- Node.js ve Python kurulu olmayan kullanicilar icin paketli uygulamada bundled Node ve bundled Python runtime kullanilir.
- Onboarding, local PIN/login, backup/restore, ZIP/CSV/PDF download ve AI fatura okuma akışları korunur.
- GitHub sadece kodu saklar; veritabanı ve upload dosyalarını saklamaz.
- Veritabanı ve upload dosyaları için düzenli yedek alınmalıdır.


## Hangi dosyayi indirmeliyim?

Windows 10/11 kullaniyorsaniz GitHub Release sayfasindan su dosyayi indirin:

```text
Muhasebe-Takip-v2.0.1-Windows-Release.zip
```

ZIP icinden onerilen kurulum dosyasi:

```text
Muhasebe-Takip-Setup-2.0.1.exe
```

Kurulum yapmak istemeyen ileri kullanicilar portable surumu kullanabilir:

```text
Muhasebe-Takip-Portable-2.0.1.exe
```

Node.js veya Python kurmaniza gerek yoktur; Windows desktop paketi gerekli runtime'lari beraber getirir. Veriler %APPDATA%/MuhasebeTakip/ altinda saklanir. Duzenli olarak Ayarlar > Yedekleme > Tam Yedek Indir ile tam yedek alinmalidir.

macOS surumu henuz yayinlanmadi. macOS ciktilari hazir oldugunda isletim sistemi ve mimariye gore ayri dosyalar yayinlanacaktir:

```text
Muhasebe-Takip-v2.x.x-macOS-arm64.dmg
Muhasebe-Takip-v2.x.x-macOS-x64.dmg
```

Apple Silicon Mac icin `arm64`, Intel Mac icin `x64` dosyasi indirilmelidir.

macOS build denemeleri GitHub Actions uzerinden manuel workflow ile yapilir. Bu denemeler henuz macOS release yayinlandigi anlamina gelmez; DMG/ZIP ciktilari once artifact olarak dogrulanir.
## Özellikler

- Dashboard gerçek veri özetleri
- Cari hesap yönetimi
- Fatura yönetimi
- Tahsilat / ödeme takibi
- Kasa & banka / kredi kartı hesapları
- Gider yönetimi
- Sabit giderler
- Önemli tarihler / hatırlatmalar
- Cari ekstre
- Dosya arşivi
- AI/OCR fatura okuma hazırlık ekranı
- Raporlar
- CSV dışa aktarma
- PDF dışa aktarma
- Ayarlar ve yedekleme

## Teknolojiler

- Next.js
- TypeScript
- Tailwind CSS
- Prisma
- SQLite

## Local Kurulum

Önce bağımlılıkları kurun:

```bash
npm install
```

Prisma client üretin:

```bash
npm run prisma:generate
```

Local SQLite veritabanı için migration çalıştırın:

```bash
npx prisma migrate dev
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

AI Fatura Okuma hazırlık ekranındaki `MarkItDown ile Metin Çıkar` özelliği için bilgisayarda Python kurulu olmalıdır.

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

Kayıtlar `prisma/dev.db` dosyasında saklanır. Upload dosyaları `storage/uploads/` içinde tutulur. Bu dosyalar GitHub'a gitmez; düzenli olarak `Ayarlar > Yedekleme > Tam Yedek İndir` ile tam yedek alınmalıdır.

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

Bu komut `dist/Muhasebe-Takip-Portable-2.0.1.exe` çıktısını üretir. Paket içine `.env`, local DB ve upload klasörleri alınmaz; paketli Electron modunda kullanıcı verisi AppData altındaki `MuhasebeTakip` veri klasöründe tutulur.

Windows setup installer denemesi için:

```bash
npm run build
npm run dist:installer
```

Bu komut `dist/Muhasebe-Takip-Setup-2.0.1.exe` çıktısını üretir. Installer masaüstü ve Start Menu kısayolu oluşturur. Kaldırma sırasında AppData içindeki uygulama verisi otomatik silinmez; veritabanı ve upload dosyaları için düzenli tam yedek alınmaya devam edilmelidir.

Desktop build çıktıları `dist/` altında oluşur ve Git'e alınmaz. Son kullanıcıya dosya vermeden önce `Ayarlar > Yedekleme > Tam Yedek İndir` akışı ile tam yedek alma alışkanlığı korunmalıdır.

## Ortam Değişkenleri

`.env.example` dosyasına göre local `.env` dosyası oluşturun.

Gerçek `.env` dosyasını GitHub'a göndermeyin. Bu dosya local ayarlar içindir.

Örnek:

```bash
DATABASE_URL="file:./prisma/dev.db"
```

## Veritabanı

Bu proje SQLite kullanır. Varsayılan local veritabanı dosyası `prisma/dev.db` yolundadır.

- `prisma/dev.db` GitHub'a gönderilmez.
- `prisma/dev.db-journal` GitHub'a gönderilmez.
- `prisma/migrations/` klasörü commitlenir; migration geçmişi projede tutulur.
- Veritabanı dosyasını düzenli olarak ayrıca yedeklemek gerekir.

## Dosya Yüklemeleri

Yüklenen dosyalar `storage/uploads/` klasöründe tutulur.

- `storage/uploads/` GitHub'a gönderilmez.
- Fatura PDF'leri, görseller ve ek dosyalar bu klasörde saklanır.
- Bu klasör düzenli olarak ayrıca yedeklenmelidir.

## Yedekleme

GitHub sadece kodu saklar. SQLite veritabanı ve upload dosyaları GitHub'a gitmez.

`Ayarlar > Yedekleme` sayfasından iki tür yedek alınabilir:

1. `Sadece Veritabanı Yedeği`: Yalnızca `prisma/dev.db` dosyasını indirir. Upload dosyalarını içermez.
2. `Tam Yedek`: `database/dev.db`, `uploads/` ve `backup-info.json` dosyalarını tek ZIP içinde indirir.

Önerilen yedekleme yöntemi `Tam Yedek İndir` butonudur. Bu dosya hem kayıtları hem de yüklenen dosyaları birlikte saklar.

Restore işleminden önce sistem mevcut verileri otomatik olarak `storage/restore-backups/` içine güvenlik yedeği olarak alır. Yine de önemli işlemlerden önce ayrıca manuel tam yedek almak önerilir.

## Geri Yükleme / İçeri Aktarma

Eski bilgisayardaki verileri yeni bilgisayara taşımak için:

1. Eski bilgisayarda `Ayarlar > Yedekleme > Tam Yedek İndir` ile ZIP yedeği alın.
2. Yeni bilgisayarda projeyi GitHub'dan çekin.
3. `npm install` çalıştırın.
4. `npm run prisma:generate` çalıştırın.
5. `npm run dev` ile projeyi açın.
6. `Ayarlar > Yedekleme` sayfasına gidin.
7. Yedek ZIP dosyasını seçin.
8. `Yedeği Kontrol Et` ile dosyayı doğrulayın.
9. Onay kutusunu işaretleyin.
10. `Geri Yükle` butonuna basın.
11. Restore tamamlandıktan sonra server'ı Ctrl+C ile durdurup `npm run dev` ile yeniden başlatın.

Geri yükleme sırasında yalnızca beklenen yedek içeriği kullanılır: `database/dev.db`, `uploads/` ve `backup-info.json`. `.env`, `.env.local`, `.next`, `node_modules` ve Git dosyaları restore edilmez.

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

Gerçek AI/OCR entegrasyonu henüz bağlı değildir.

Hazır olan altyapı:

- `AiExtractionJob` modeli
- AI Fatura Okuma hazırlık ekranı
- Dosya Arşivi entegrasyonu
- Dosya seçerek analiz kaydı oluşturma
- MarkItDown ile local dosyadan ham metin çıkarma
- Ham metin, JSON, güven skoru ve hata mesajı alanları

MarkItDown entegrasyonu sadece dosyadan metin çıkarır. OpenAI, LLM veya otomatik fatura oluşturma entegrasyonu henüz yoktur. İleride çıkarılan metni fatura alanlarına dönüştürme, kullanıcıya onaylatma ve onaydan sonra `Invoice` kaydı oluşturma akışı eklenebilir.

## Güvenlik Notları

- Proje local kullanım içindir.
- `.env`, `prisma/dev.db`, `storage/uploads/` GitHub'a gönderilmez.
- Upload dosyaları ve DB yedekleri dikkatli saklanmalıdır.
- DB yedeği indirilebilir; bu dosyayı güvenli bir yerde tutmak kullanıcının sorumluluğundadır.
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
