# Release Notes

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
