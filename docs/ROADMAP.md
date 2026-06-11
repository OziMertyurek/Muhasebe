# Roadmap

Bu dosya, Local Muhasebe Takip Sistemi için planlanan geliştirme başlıklarını içerir. Sıralama kesin öncelik anlamına gelmez.

## AI/OCR Gerçek Entegrasyon

- PDF ve görsel faturalar için OCR metni çıkarma.
- OCR çıktısını AI ile yapılandırılmış fatura alanlarına dönüştürme.
- Güven skoru ve hata mesajlarını analiz ekranında göstermek.
- İşlem geçmişini `AiExtractionJob` kayıtları üzerinden takip etmek.

## Fatura Görüntüsünden Otomatik Veri Çıkarma

- Fatura no, cari firma, tarih, vade tarihi, KDV, ara toplam ve genel toplam alanlarını otomatik çıkarmak.
- PDF, PNG, JPG, JPEG ve WEBP dosyalarını desteklemek.
- Belirsiz alanlar için kullanıcıya uyarı göstermek.

## AI Onay Ekranından Invoice Oluşturma

- AI tarafından çıkarılan alanları kullanıcıya kontrol ettirmek.
- Kullanıcının alanları düzeltmesine izin vermek.
- Onaydan sonra `Invoice` kaydı oluşturmak.
- Oluşturulan faturayı dosya eki ve analiz kaydı ile ilişkilendirmek.

## Gelişmiş Restore

Temel seviye tamamlandı:

- Tam yedek ZIP doğrulama.
- Yanlış geri yüklemeyi önlemek için uyarı ve onay adımları.
- Restore öncesi otomatik güvenlik yedeği.
- `database/dev.db` ve `uploads/` içeriğini güvenli şekilde geri yükleme.

Gelecek geliştirmeler:

- Restore geçmişi ekranı.
- Otomatik zamanlanmış yedekleme.
- Şifreli yedek dosyası.
- Bulut yedek entegrasyonu.

## Upload Klasörünü Zip Yedekleme

Temel seviye tamamlandı:

- `storage/uploads/` klasörü tam yedek ZIP dosyasına dahil edilir.
- DB yedeği ile upload yedeği aynı ekranda yönetilir.
- Büyük ZIP dosyaları için boyut limiti ve kullanıcı uyarısı vardır.

## Stok Takibi

- Ürün/hizmet kartları.
- Stok giriş/çıkış hareketleri.
- Fatura kalemleri ile stok bağlantısı.
- Kritik stok uyarıları.

## Teklif / Proforma Modülü

- Teklif ve proforma kayıtları.
- Tekliften faturaya dönüşüm.
- PDF teklif çıktısı.
- Teklif durum takibi.

## Kullanıcı Girişi / Şifre

- Local kullanım için basit giriş ekranı.
- Yönetici şifresi.
- Oturum süresi ve güvenli çıkış.

## Gelişmiş Grafikler

- Aylık gelir/gider grafikleri.
- Cari bazlı alacak/borç grafikleri.
- Gider kategori trendleri.
- Nakit akışı projeksiyonu.

## Çoklu Şirket Desteği

- Birden fazla şirket profili.
- Şirket bazlı cari, fatura, ödeme ve rapor ayrımı.
- Şirketler arası geçiş.

## E-Fatura Entegrasyonu Opsiyonel

- E-fatura/e-arşiv sağlayıcıları ile opsiyonel bağlantı.
- Gelen/giden faturaları otomatik içeri alma.
- Entegrasyon bilgilerini güvenli şekilde saklama.
