# Release Notes

## v2.0.2 - Taslak / Destek Araclari

Bu taslak not, sonraki release icin desktop destek araclari hazirligini izler.

### Planlananlar

- System Status ekraninda Destek Araclari karti.
- Veri klasorunu acma.
- Log klasorunu acma.
- Guvenli hata raporu disa aktarma.
- Windows/macOS/Linux desktop veri klasoru standardiyla uyumlu destek akisi.
- Hata raporunda `.env`, gercek `DATABASE_URL`, tam local path, upload/fatura dosyasi, `dev.db` ve backup ZIP iceriginin yer almamasi.

## v2.0.1 - Bundled Python / MarkItDown

Bu patch release, Windows packaged uygulama icinde MarkItDown metin cikarma icin paketli Python runtime destegini tamamlar.

### One Cikanlar

- Packaged app artik Python kurulumuna ihtiyac duymadan MarkItDown kullanabilir.
- Bundled Python runtime eklendi.
- AI fatura okuma Windows packaged app icinde iyilestirildi.
- System Status paketli Python ve MarkItDown durumunu gosterir.
- Node runtime destegi korunur.
- AppData DB, backup/download ve normal web/dev davranislari degismedi.


### Indirme Notu

- Windows kullanicilari GitHub Release asset olarak `Muhasebe-Takip-v2.0.1-Windows-Release.zip` dosyasini indirmelidir.
- ZIP icinden onerilen dosya `Muhasebe-Takip-Setup-2.0.1.exe` dosyasidir.
- `Muhasebe-Takip-Portable-2.0.1.exe` kurulum istemeyen ileri kullanicilar icindir.
- macOS surumu henuz yayinlanmadi; macOS icin ayri release assetleri daha sonra yayinlanacaktir.
## v2.0.0 - Windows Desktop Release

Bu sürüm, Local Muhasebe Takip Sistemi'nin Windows desktop kullanımına hazır ana release sürümüdür.

### Öne Çıkanlar

- Windows setup installer
- Portable exe
- AppData DB bootstrap
- Node.js kurulu olmayan kullanıcı desteği
- İlk kurulum onboarding akışı
- Local PIN / login koruması
- Backup / restore sistemi
- ZIP, CSV ve PDF download desteği
- AI fatura okuma akışı
- System Status / sağlık kontrol paneli
- Uninstall sonrası AppData verisinin korunması

### Desktop Notları

- Setup çıktısı: `Muhasebe-Takip-Setup-2.0.0.exe`
- Portable çıktısı: `Muhasebe-Takip-Portable-2.0.0.exe`
- Paketli modda kullanıcı verisi `%APPDATA%/MuhasebeTakip/` altında saklanır.
- Installer kaldırılsa bile AppData altındaki veriler otomatik silinmez.
- Düzenli olarak `Ayarlar > Yedekleme > Tam Yedek İndir` ile tam yedek alınmalıdır.

## v1.0.0 - İlk Kullanılabilir Sürüm

Bu sürüm, Local Muhasebe Takip Sistemi'nin şirket içi ve local kullanım için hazırlanmış ilk stabil sürümüdür.

### Eklenen Modüller

- Dashboard
- Cari yönetimi
- Fatura yönetimi
- Tahsilat / ödeme
- Kasa & banka / kredi kartı
- Giderler
- Sabit giderler
- Önemli tarihler
- Dosya arşivi
- AI/OCR hazırlık ekranı
- Raporlar
- CSV export
- PDF export
- Ayarlar ve yedekleme
- Tam yedek indirme
- Restore doğrulama
- Güvenli restore / içeri aktarma
- Restore öncesi otomatik güvenlik yedeği
- Cari ekstre

### Bilinen Notlar

- Gerçek AI/OCR entegrasyonu henüz yok.
- Restore temel seviyede tamamlandı; işlem sonrası local server'ın yeniden başlatılması önerilir.
- Otomatik güvenlik yedekleri `storage/restore-backups/` altında tutulur.
- Sistem local kullanım içindir.
