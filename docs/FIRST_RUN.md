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

Daha önce alınmış bir tam yedek ZIP dosyanız varsa, ilk kurulumdan sonra `Ayarlar > Yedekleme` sayfasından bu yedeği içeri aktarabilirsiniz.

## MarkItDown Metin Çıkarma Kurulumu

AI Fatura Okuma ekranındaki `MarkItDown ile Metin Çıkar` butonunu kullanmak için bilgisayarda Python kurulu olmalıdır.

Python worker bağımlılığını kurun:

```bash
cd python-worker
pip install -r requirements.txt
```

Bu özellik PDF, görsel veya HTML fatura dosyalarından ham metin çıkarır. Henüz otomatik fatura alanı çıkarmaz ve fatura kaydı oluşturmaz.

## Windows Hızlı Başlatma

Antigravity olmadan Windows bilgisayarda çalıştırmak için proje kökündeki `.bat` dosyalarını kullanabilirsiniz.

İlk kurulum:

```text
setup.bat
```

Bu dosya sırasıyla `npm install`, `npm run prisma:generate` ve `npx prisma migrate dev` komutlarını çalıştırır. Python yüklüyse `python-worker` klasöründeki MarkItDown bağımlılıklarını da kurar.

Günlük kullanım:

```text
start-dev.bat
```

Bu dosya Prisma client kontrolünü yapar, tarayıcıda `http://localhost:3000` adresini açar ve `npm run dev` komutuyla local server'ı başlatır.

Production modda çalıştırmak için:

```text
start-prod.bat
```

Bu dosya `npm run build` çalıştırır ve ardından `npm run start` ile uygulamayı başlatır.

Server'ı kapatma bilgisini görmek için:

```text
stop-info.bat
```

Server açık olan komut penceresinde çalışır. Kapatmak için o pencerede `Ctrl+C` kullanın.

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
9. `Ayarlar > Yedekleme` sayfasından düzenli tam yedek alın.

## Yedekleme Notu

GitHub sadece kodu saklar. Aşağıdaki veriler ayrıca yedeklenmelidir:

- `prisma/dev.db`
- `storage/uploads/`
- `storage/restore-backups/` içinde oluşan otomatik güvenlik yedekleri
- Gerekirse local `.env` ayarları
