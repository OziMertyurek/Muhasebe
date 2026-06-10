# İlk Kullanım Rehberi

Bu rehber uygulamayı ilk kez local bilgisayarda çalıştırmak ve temel kayıtları oluşturmak içindir.

## Projeyi Localde Çalıştırma

Bağımlılıkları kurun:

```bash
npm install
```

Prisma client üretin:

```bash
npm run prisma:generate
```

Migration çalıştırın:

```bash
npx prisma migrate dev
```

Uygulamayı başlatın:

```bash
npm run dev
```

Tarayıcıdan `http://localhost:3000` adresini açın.

## .env Oluşturma

`.env.example` dosyasını temel alarak local `.env` dosyanızı oluşturun.

Gerçek `.env` dosyasını GitHub'a göndermeyin. Bu dosya sadece local çalışma ayarları içindir.

## Migration Çalıştırma

İlk kurulumda ve schema değişikliklerinden sonra migration komutu çalıştırılmalıdır:

```bash
npx prisma migrate dev
```

SQLite veritabanı local dosya olarak tutulur ve GitHub'a gönderilmez.

## Uygulamayı Açma

Geliştirme sunucusu çalıştıktan sonra uygulama varsayılan olarak şu adreste açılır:

```text
http://localhost:3000
```

## İlk Yapılacaklar

1. `Ayarlar > Şirket Bilgileri` sayfasından şirket bilgilerini doldurun.
2. `Kasa & Banka` sayfasından nakit, banka veya kredi kartı hesabı ekleyin.
3. `Cariler` sayfasından müşteri veya tedarikçi ekleyin.
4. `Faturalar` sayfasından satış veya alış faturası oluşturun.
5. `Tahsilat / Ödeme` sayfasından para aldım veya para ödedim hareketi girin.
6. `Giderler` sayfasından gerçekleşmiş giderleri ekleyin.
7. `Önemli Tarihler` sayfasından vergi günü, sözleşme bitişi veya kart son ödeme tarihi gibi hatırlatmaları ekleyin.
8. `Dashboard` ve `Raporlar` sayfalarından genel durumu kontrol edin.
9. `Ayarlar > Yedekleme` sayfasından düzenli veritabanı yedeği alın.

## Yedekleme Notu

GitHub sadece kodu saklar. Aşağıdaki veriler ayrıca yedeklenmelidir:

- `prisma/dev.db`
- `storage/uploads/`
- Gerekirse local `.env` ayarları
