# Local Muhasebe Takip Sistemi

Bu proje local çalışan, şirket içi kullanım için geliştirilmiş mini muhasebe, cari hesap, fatura, ödeme, gider ve raporlama sistemidir.

Uygulama online yayınlanmak için değil, yerel bilgisayarda çalışmak için tasarlanmıştır. Kod private GitHub repository içinde tutulabilir; veritabanı ve yüklenen dosyalar ayrıca yedeklenmelidir.

## v1.0.0 Durumu

Bu sürüm local kullanım için ilk stabil sürümdür.

- Gerçek AI/OCR entegrasyonu henüz bağlı değildir.
- Veriler local SQLite veritabanında saklanır.
- Upload dosyaları `storage/uploads/` içinde saklanır.
- GitHub sadece kodu saklar; veritabanı ve upload dosyalarını saklamaz.
- Veritabanı ve upload dosyaları için düzenli yedek alınmalıdır.

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
- Ham metin, JSON, güven skoru ve hata mesajı alanları

İleride PDF/görsel faturadan veri çıkarma, çıkarılan alanları kullanıcıya onaylatma ve onaydan sonra `Invoice` kaydı oluşturma akışı eklenebilir.

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
