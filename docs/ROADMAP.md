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

- DB yedeğinden geri yükleme akışı tasarlamak.
- Yanlış geri yüklemeyi önlemek için uyarı ve onay adımları eklemek.
- Restore öncesi mevcut DB yedeğini otomatik almak.

## Upload Klasörünü Zip Yedekleme

- `storage/uploads/` klasörünü zip olarak indirme.
- DB yedeği ile upload yedeğini aynı ekranda yönetmek.
- Büyük dosyalarda kullanıcıya süre ve boyut uyarısı göstermek.

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
