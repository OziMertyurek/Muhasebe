# Kullanım Rehberi

Bu rehber, Local Muhasebe Takip Sistemi'ni günlük kullanımda nasıl kullanacağınızı anlatır.

## Cari Nasıl Eklenir?

1. Sol menüden `Cariler` sayfasına gidin.
2. Sağ üstteki `Yeni Cari` butonuna basın.
3. Firma adını ve cari tipini seçin.
4. E-posta, telefon, vergi bilgileri, adres, risk limiti ve vade günü gibi alanları ihtiyaca göre doldurun.
5. Kaydedince cari detay sayfasına yönlendirilirsiniz.

Cari tipi seçenekleri:

- `Müşteri`: Sizin fatura kestiğiniz firma.
- `Tedarikçi`: Size fatura kesen firma.
- `Müşteri & Tedarikçi`: Hem müşteri hem tedarikçi olarak çalışılan firma.

## Fatura Nasıl Girilir?

1. Sol menüden `Faturalar` sayfasına gidin.
2. `Yeni Fatura` butonuna basın.
3. Cari firma seçin.
4. Fatura tipini seçin:
   - `Ben fatura kestim`: Satış faturasıdır.
   - `Bana fatura kesildi`: Alış faturasıdır.
5. Fatura no, fatura tarihi, tutarlar ve para birimini girin.
6. Durumu seçin ve kaydedin.

Fatura kaydedildikten sonra detay sayfasına yönlendirilirsiniz.

## Para Aldım / Para Ödedim Nasıl Girilir?

1. Sol menüden `Tahsilat / Ödeme` sayfasına gidin.
2. `Yeni Hareket` butonuna basın.
3. İşlem tipini seçin:
   - `Para aldım`: Tahsilat.
   - `Para ödedim`: Ödeme.
4. Cari firma seçmek önerilir ama zorunlu değildir.
5. İlgili fatura varsa seçin.
6. Tutar, tarih, para birimi ve ödeme yöntemini girin.
7. Finansal hesap seçerek hareketi kasa/banka/kredi kartı hesabına bağlayabilirsiniz.

Fatura seçildiyse sistem fatura ödeme durumunu bağlı hareketlere göre günceller.

## Kasa/Banka/Kredi Kartı Hesabı Nasıl Eklenir?

1. Sol menüden `Kasa & Banka` sayfasına gidin.
2. `Yeni Hesap` butonuna basın.
3. Hesap adını ve hesap tipini seçin.
4. Banka adı, IBAN, para birimi, açılış bakiyesi ve mevcut bakiyeyi girin.
5. Hesap tipi `Kredi Kartı` ise kredi limiti, hesap kesim günü ve son ödeme günü alanlarını doldurabilirsiniz.
6. Hesabı aktif veya pasif olarak işaretleyip kaydedin.

`Kredi Kartları` menüsü, hesap listesini kredi kartı filtresiyle açar.

## Gider Nasıl Eklenir?

1. Sol menüden `Giderler` sayfasına gidin.
2. `Yeni Gider` butonuna basın.
3. Gider başlığı, tutar ve gider tarihini girin.
4. Kategori, cari firma ve finansal hesap seçebilirsiniz.
5. Durumu seçin:
   - `Ödenmedi`
   - `Ödendi`
   - `İptal`
6. Durum `Ödendi` ise ödeme tarihi girmeniz önerilir.

Gider kaydı doğrudan fatura yerine geçmez; tek seferlik veya gerçekleşmiş giderleri takip etmek için kullanılır.

## Sabit Gider Nasıl Tanımlanır?

1. Sol menüden `Sabit Giderler` sayfasına gidin.
2. `Yeni Sabit Gider` butonuna basın.
3. Gider adını, tutarı, para birimini ve ayın gününü girin.
4. Başlangıç tarihini seçin.
5. Bitiş tarihi varsa girin.
6. Kaydı aktif veya pasif olarak işaretleyin.

Sabit giderler bu aşamada şablon olarak tutulur. Otomatik gider oluşturma ileride eklenebilir.

## Önemli Tarih Nasıl Eklenir?

1. Sol menüden `Önemli Tarihler` sayfasına gidin.
2. `Yeni Hatırlatma` veya `Yeni Önemli Tarih` butonuna basın.
3. Başlık, kategori, tarih ve öncelik alanlarını doldurun.
4. İsterseniz cari, fatura, gider veya finansal hesap bağlantısı seçin.
5. Hatırlatma günü ve tekrar bilgisini ihtiyaca göre belirleyin.

Vergi günü, kredi kartı son ödeme tarihi, sözleşme bitişi ve vade hatırlatmaları bu modülde takip edilebilir.

## Dosya Nasıl Yüklenir?

1. Sol menüden `Dosya Arşivi` sayfasına gidin.
2. `Dosya Yükle` butonuna basın.
3. Dosya seçin.
4. İlişki tipini seçin:
   - Fatura
   - Gider
   - Cari / Firma
   - Tahsilat / Ödeme
   - Diğer
5. İlgili kayıt varsa seçin ve dosyayı kaydedin.

Yüklenen dosyalar `storage/uploads/` klasöründe saklanır ve GitHub'a gönderilmez.

## Cari Ekstre Nasıl Görüntülenir?

1. `Cariler` sayfasından bir cari açın.
2. Detay sayfasındaki cari ekstre bölümünü inceleyin.
3. `Tam Ekstreyi Gör` bağlantısıyla detaylı ekstre sayfasına gidin.
4. Tarih aralığı, işlem tipi ve para birimi filtrelerini kullanabilirsiniz.

Ekstrede satış faturaları, alış faturaları, tahsilatlar, ödemeler ve cariye bağlı giderler tarih sırasıyla gösterilir.

## Raporlar Nasıl Kullanılır?

1. Sol menüden `Raporlar` sayfasına gidin.
2. İhtiyacınız olan raporu seçin:
   - Aylık özet
   - Alacak / borç durumu
   - Vadesi gelen faturalar
   - Gider kategorileri
   - Kasa & banka özeti
3. Filtreleri seçin ve raporu görüntüleyin.

Raporlarda farklı para birimleri ayrı ayrı gösterilir.

## CSV/PDF Nasıl Alınır?

CSV veya PDF destekleyen sayfalarda üst bölümde dışa aktarma butonları bulunur.

Örnekler:

- Cariler listesi: CSV dışa aktar
- Faturalar listesi: CSV/PDF dışa aktar
- Giderler listesi: CSV/PDF dışa aktar
- Cari ekstre: CSV/PDF dışa aktar
- Aylık özet: CSV/PDF dışa aktar
- Vadesi gelen faturalar: PDF indir

İndirilen dosyalar bilgisayarınızın indirme klasörüne gider. Bu dosyalar GitHub'a otomatik olarak eklenmez.

## Yedek Alma

GitHub kodu saklar; veritabanı ve yüklenen dosyaları saklamaz. Bu yüzden düzenli yedek almak önemlidir.

### Sadece Veritabanı Yedeği Alma

1. Sol menüden `Ayarlar` sayfasına gidin.
2. `Yedekleme` kartını açın.
3. `Veritabanı Yedeğini İndir` butonuna basın.

Bu yedek sadece SQLite veritabanını içerir. Upload edilen dosyaları içermez.

### Tam Yedek Alma

1. Sol menüden `Ayarlar` sayfasına gidin.
2. `Yedekleme` kartını açın.
3. `Tam Yedek İndir` butonuna basın.
4. İnen ZIP dosyasını harici disk veya güvenli bir bulut depolama alanında saklayın.

Önerilen yöntem tam yedek almaktır.

### Tam Yedek Dosyasının İçinde Neler Var?

- `database/dev.db`
- `uploads/`
- `backup-info.json`

`backup-info.json`, yedeğin uygulama adı, sürüm, yedek tarihi ve içerik bilgisini tutar.

## Başka Bilgisayara Taşıma

1. Eski bilgisayarda `Ayarlar > Yedekleme > Tam Yedek İndir` ile ZIP yedeği alın.
2. Yeni bilgisayarda projeyi GitHub'dan çekin.
3. `.env` dosyasını `.env.example` dosyasına göre oluşturun.
4. `npm install` çalıştırın.
5. `npm run prisma:generate` çalıştırın.
6. `npx prisma migrate dev` çalıştırın.
7. `npm run dev` ile uygulamayı açın.
8. `Ayarlar > Yedekleme` sayfasında `Yedeği İçeri Aktar / Geri Yükle` alanına gidin.
9. ZIP dosyasını seçin ve `Yedeği Kontrol Et` butonuna basın.
10. Yedek geçerliyse onay kutusunu işaretleyin ve `Geri Yükle` butonuna basın.
11. Restore tamamlandıktan sonra server'ı Ctrl+C ile durdurup `npm run dev` ile yeniden başlatın.

Restore işleminden önce mevcut sistem otomatik olarak `storage/restore-backups/` içine güvenlik yedeği alır. Yine de önemli bir işlemden önce ayrıca manuel tam yedek almak önerilir.
