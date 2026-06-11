# Manuel Test Planı

Bu test planı, uygulamanın temel modüllerinin manuel olarak kontrol edilmesi için hazırlanmıştır.

## Genel Açılış Testi

| Adım | Beklenen sonuç |
| --- | --- |
| `npm run dev` komutunu çalıştır. | Uygulama `http://localhost:3000` adresinde açılır. |
| Ana sayfayı aç. | Dashboard hata vermeden yüklenir. |
| Boş veritabanı ile ana sayfayı aç. | Kartlarda `0` veya uygun boş durum mesajları görünür. |

## Navigation Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Sidebar menülerine tek tek tıkla. | Her menü doğru sayfaya gider. |
| `/cariler` adresini aç. | `/companies` adresine yönlenir. |
| `/faturalar` adresini aç. | `/invoices` adresine yönlenir. |
| `/tahsilat-odeme` adresini aç. | `/payments` adresine yönlenir. |
| `/kasa-banka` adresini aç. | `/accounts` adresine yönlenir. |
| `/kredi-kartlari` adresini aç. | `/accounts?type=CREDIT_CARD` adresine yönlenir. |
| `/giderler` adresini aç. | `/expenses` adresine yönlenir. |
| `/sabit-giderler` adresini aç. | `/recurring-expenses` adresine yönlenir. |
| `/onemli-tarihler` adresini aç. | `/important-dates` adresine yönlenir. |
| `/raporlar` adresini aç. | `/reports` adresine yönlenir. |
| `/ayarlar` adresini aç. | `/settings` adresine yönlenir. |

## Cari CRUD Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Yeni cari oluştur. | Kayıt oluşur ve cari detay sayfası açılır. |
| Cari listesini aç. | Yeni cari listede görünür. |
| Cariyi düzenle. | Değişiklikler detay ve listede görünür. |
| Cariyi sil. | Kayıt listeden kalkar. |
| Silinen cari detay URL'sini aç. | 404 veya kayıt bulunamadı sayfası görünür. |

## Fatura CRUD Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Cari yokken yeni fatura sayfasını aç. | Önce cari ekleme uyarısı görünür. |
| Cari seçerek satış faturası oluştur. | Fatura detay sayfasına yönlenir. |
| Alış faturası oluştur. | Fatura doğru tip etiketiyle listelenir. |
| Faturayı düzenle. | Güncel bilgiler detay sayfasında görünür. |
| Faturayı sil. | Fatura listeden kalkar ve detay sayfası bulunamaz. |

## Payment CRUD Testi

| Adım | Beklenen sonuç |
| --- | --- |
| `Para aldım` hareketi oluştur. | Hareket detay sayfası açılır. |
| `Para ödedim` hareketi oluştur. | Hareket doğru tip etiketiyle listelenir. |
| Faturaya bağlı hareket gir. | Fatura ödeme durumu güncellenir. |
| Hareketi düzenle. | Liste ve detay güncel bilgiyi gösterir. |
| Hareketi sil. | Hareket listeden kalkar. |

## Account CRUD Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Nakit kasa hesabı oluştur. | Hesap listede görünür. |
| Banka hesabı oluştur. | IBAN ve banka bilgisi detayda görünür. |
| Kredi kartı hesabı oluştur. | Limit, hesap kesim günü ve son ödeme günü görünür. |
| Hesabı düzenle. | Güncel bilgiler kaydedilir. |
| Hesabı sil. | Hesap listeden ve ödeme formundaki seçeneklerden kalkar. |

## Expense CRUD Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Yeni gider oluştur. | Gider detay sayfası açılır. |
| Ödenmiş gider oluştur. | Ödeme tarihi alanı kaydedilir. |
| Kategori seç. | Kategori liste ve detayda görünür. |
| Gideri düzenle. | Güncel bilgiler kaydedilir. |
| Gideri sil. | Gider listeden kalkar. |

## Recurring Expense Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Aktif sabit gider oluştur. | Aktif sayısı ve aylık toplam güncellenir. |
| Pasif sabit gider oluştur. | Pasif sayısı güncellenir. |
| Bitiş tarihi başlangıçtan önce gir. | Türkçe validasyon hatası görünür. |
| Sabit gideri düzenle. | Güncel bilgiler kaydedilir. |
| Sabit gideri sil. | Listeden kalkar. |

## Important Date Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Yeni önemli tarih oluştur. | Detay sayfası açılır. |
| Cari/fatura/gider bağlantısı seç. | Detayda ilgili kayıt linki görünür. |
| Geçersiz saat gir. | Türkçe hata mesajı görünür. |
| Tarihi düzenle. | Liste güncellenir. |
| Tarihi sil. | Listeden kalkar. |

## File Attachment Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Desteklenen dosya yükle. | Dosya detay sayfası açılır. |
| Desteklenmeyen dosya türü seç. | Dosya türü desteklenmiyor hatası görünür. |
| 10 MB üstü dosya seç. | Dosya boyutu hatası görünür. |
| Dosyayı fatura veya cari ile ilişkilendir. | İlgili detay sayfasında dosya görünür. |

## AI Extraction Hazırlık Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Uygun PDF/görsel dosya yükle. | Dosya detayında AI analiz oluşturma butonu görünür. |
| AI analiz kaydı oluştur. | Kayıt `Bekliyor` durumunda oluşur. |
| JSON alanına geçersiz değer gir. | Geçerli JSON uyarısı görünür. |
| Güven skorunu 0-1 dışında gir. | Türkçe validasyon hatası görünür. |
| Hızlı durum değiştir. | Durum güncellenir. |

## Dashboard Hesaplama Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Satış faturası oluştur. | Toplam alacak artar. |
| Satış faturası için tahsilat gir. | Kalan alacak azalır. |
| Alış faturası oluştur. | Toplam borç artar. |
| Alış faturası için ödeme gir. | Kalan borç azalır. |
| Bu ay gider ekle. | Bu ayki giderler kartı güncellenir. |
| Yaklaşan önemli tarih ekle. | Yaklaşan tarihler listesinde görünür. |

## Reports Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Aylık özet raporunu aç. | Seçili ayın toplamları görünür. |
| Alacak/borç raporunu aç. | Cari bazlı bakiyeler görünür. |
| Vadesi gelen faturalar raporunu aç. | Yaklaşan/geciken faturalar listelenir. |
| Gider kategorileri raporunu aç. | Kategori bazlı toplamlar görünür. |
| Kasa & banka özetini aç. | Hesap bazlı tahmini bakiyeler görünür. |

## CSV Export Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Cariler CSV indir. | CSV dosyası iner ve Türkçe karakterler bozulmaz. |
| Faturalar CSV indir. | Fatura listesi CSV olarak iner. |
| Ödemeler CSV indir. | Tahsilat/ödeme listesi CSV olarak iner. |
| Giderler CSV indir. | Gider listesi CSV olarak iner. |
| Aylık özet CSV indir. | Para birimi bazlı özet CSV olarak iner. |

## PDF Export Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Faturalar PDF indir. | PDF dosyası açılır. |
| Giderler PDF indir. | PDF dosyası açılır. |
| Aylık özet PDF indir. | Seçili ay PDF olarak iner. |
| Cari ekstre PDF indir. | Cari hareketleri PDF içinde görünür. |
| Vadesi gelen faturalar PDF indir. | Kalan tutarlar ve gün bilgisi görünür. |

## Backup / Restore Testleri

| Adım | Beklenen sonuç |
| --- | --- |
| Ayarlar > Yedekleme sayfasını aç. | DB ve upload yedekleme bilgileri görünür. |
| Veritabanı yedeğini indir. | `.db` uzantılı yedek dosyası iner. |
| Tam yedek indir. | ZIP dosyası iner. |
| Tam yedek ZIP dosyasını aç. | ZIP içinde `database/dev.db`, `uploads/` ve `backup-info.json` bulunur. |
| `backup-info.json` dosyasını kontrol et. | Uygulama adı, sürüm, yedek tarihi ve içerik bilgisi görünür. |
| Geçerli ZIP dosyasını doğrula. | Yedek geçerli mesajı ve metadata bilgileri görünür. |
| Geçersiz ZIP dosyasını doğrula. | Türkçe hata mesajı görünür ve restore butonu aktif olmaz. |
| ZIP olmayan dosya seç. | Dosya reddedilir. |
| Path traversal içeren ZIP dene. | Güvenlik uyarısı veya hata görünür; dosya restore edilmez. |
| Restore için onay kutusunu işaretleme. | `Geri Yükle` butonu pasif kalır. |
| Geçerli ZIP ile restore yap. | Restore tamamlanır ve sonuç raporu görünür. |
| Restore öncesi otomatik güvenlik yedeğini kontrol et. | `storage/restore-backups/` altında `before-restore-...` klasörü oluşur. |
| Restore sonrası DB içeriğini kontrol et. | `prisma/dev.db` seçilen yedekten gelen veriyle değişir. |
| Restore sonrası upload dosyalarını kontrol et. | `storage/uploads/` seçilen yedekten gelen dosyalarla güncellenir. |
| Restore sonrası restart uyarısını kontrol et. | Server'ı Ctrl+C ile durdurup `npm run dev` ile yeniden başlatma notu görünür. |
| Git durumunu kontrol et. | `storage/uploads/`, `storage/restore-backups/`, `.db`, `.zip`, `.env` dosyaları commit adayı olmaz. |

## Soft Delete Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Cari/fatura/gider/hesap/hareket sil. | Kayıt listede görünmez. |
| Silinen kaydın detay URL'sini aç. | 404 veya kayıt bulunamadı görünür. |
| Yeni form aç. | Silinen kayıt select seçeneklerinde görünmez. |

## Boş Veri Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Boş veritabanı ile ana listeleri aç. | Uygun boş durum mesajları görünür. |
| Boş veriyle CSV export al. | Başlık satırları olan CSV iner. |
| Boş veriyle PDF export al. | Kayıt bulunamadı mesajı içeren PDF iner. |
| Dashboard'u aç. | Hata vermeden 0 değerleri gösterir. |

## Mobil Görünüm Testi

| Adım | Beklenen sonuç |
| --- | --- |
| Mobil genişlikte dashboard aç. | Kartlar alt alta düzgün dizilir. |
| Mobil genişlikte sidebar kullan. | Menü yatay kaydırma ile kullanılabilir. |
| Mobil genişlikte tablo sayfası aç. | Tablo yatay scroll ile taşmadan görüntülenir. |
| Mobil genişlikte form doldur. | Alanlar ekrandan taşmaz. |
