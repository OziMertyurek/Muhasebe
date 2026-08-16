# Roadmap

Bu dosya, Muhasebe Takip Sistemi icin planlanan islevsel gelistirme basliklarini icerir. Sıralama kesin oncelik anlamina gelmez.

Onaylanan ana teknik yon hosted web + PostgreSQL calisma tabanidir. Fazlara ayrilmis teknik migration plani icin `docs/HOSTED_WEB_MIGRATION_ROADMAP.md`, mimari kararlar icin `docs/architecture/decisions/` kaynak alinmalidir.

V1.0 release candidate kapsaminda muhasebe, cari, fatura kalemleri, tahsilat/odeme, gider, urun/stok, AI inceleme ve PostgreSQL hosted temel tamamlanmistir. Asagidaki maddeler V1.1+ iyilestirme ve operasyon basliklaridir.

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

## Business Export / Hosted Backup Policy

Mevcut local/desktop restore akisi gecis donemi davranisidir:

- Tam yedek ZIP dogrulama.
- Yanlis geri yuklemeyi onlemek icin uyari ve onay adimlari.
- Restore oncesi otomatik guvenlik yedegi.
- `database/dev.db` ve `uploads/` icerigini local ortamda geri yukleme.

Hosted hedef:

- CSV/PDF/business exportlar kullaniciya acik kalir.
- Managed PostgreSQL backup/PITR altyapi sorumlulugudur.
- Object storage backup/versioning politikasi altyapi tarafinda tasarlanir.
- Normal kullanicilar production veritabanini restore ederek degistiremez.

## Persistent File Storage

Mevcut local davranis:

- `storage/uploads/` klasoru tam yedek ZIP dosyasina dahil edilir.
- DB yedegi ile upload yedegi ayni ekranda yonetilir.
- Buyuk ZIP dosyalari icin boyut limiti ve kullanici uyarisi vardir.

Hosted hedef:

- FileAttachment binary dosyalari persistent object storage uzerinde tutulur.
- Cloudflare R2 tercih edilen yondur.
- Local filesystem kalici hosted storage olarak kullanilmaz.

## Stok Takibi Iyilestirmeleri

- Depo/lokasyon destegi.
- Gelismis stok raporlari.
- Sayim sayfasi ve toplu duzeltme akislari.
- Kritik stok bildirimleri.

## Teklif / Proforma Modülü

- Teklif ve proforma kayıtları.
- Tekliften faturaya dönüşüm.
- PDF teklif çıktısı.
- Teklif durum takibi.

## Web Authentication

- Local PIN mevcut gecis davranisidir.
- Hosted hedefte kullanici hesaplari, email/password veya managed credential handling, HttpOnly session cookie, logout, rate limiting ve password reset gerekir.
- Exact authentication library/provider henuz secilmemistir.

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
