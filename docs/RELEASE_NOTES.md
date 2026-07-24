# Release Notes

## [2.3.0] - 2026-07-24

### Added

- File and AI extraction soft archive/restore support
- File and AI records in Trash with restore actions
- Estimated cash and bank position on Dashboard
- Unified Dashboard activity timeline
- Smart prioritized Attention Center

### Changed

- Redesigned Dashboard information hierarchy
- Quick Actions moved above the fold
- Financial Snapshot simplified and improved
- Dashboard responsive behavior and accessibility improved
- Application version now reads from package.json as the single source of truth

### Safety and Data Integrity

- Archived files remain physically stored
- Related invoices and business records are not deleted during archive operations
- Audit logs are created for file and AI archive/restore operations

### Known Warnings

- Windows standalone build still reports the existing traced-font copy warning involving `C:\Windows\Fonts`

## v2.2.0 - Help & Onboarding Release

Bu release, yeni kullanicilarin uygulamayi daha rahat ogrenebilmesi icin Yardim Merkezi, sayfa ici ipucu kutulari ve baloncuklu Baslangic Turu ozelliklerini ekler. v2.1.1 guvenlik duzeltmeleri korunur ve `npm audit` son durumda `found 0 vulnerabilities` sonucunu verir.

### One Cikanlar

- Yardim Merkezi eklendi.
- `docs/USER_GUIDE.md` musteri kullanim rehberi eklendi.
- Ana operasyon sayfalarina sayfa ici HelpHint ipucu kutulari eklendi.
- Baloncuklu Baslangic Turu eklendi.
- Baslangic Turu Dashboard ve Yardim Merkezi uzerinden baslatilabilir.
- Tur Ileri, Geri, Bitir, Turu atla ve ESC ile kapatma kontrollerini destekler.
- 8 adimli baslangic rehberi eklendi:
  - Dashboard
  - Sidebar
  - Cariler
  - Faturalar
  - AI Fatura Okuma
  - Backup/Yedekleme
  - System Status/Destek
  - Yardim Merkezi
- v2.1.1 security hardening davranislari korunur.
- `npm audit` temiz: `found 0 vulnerabilities`.

### Indirme Notu

- Windows kullanicilari icin onerilen dosya: `Muhasebe-Takip-Setup-2.2.0.exe`.
- Kurulum istemeyen kullanicilar icin portable dosya: `Muhasebe-Takip-Portable-2.2.0.exe`.
- Apple Silicon Mac kullanicilari `arm64`, Intel Mac kullanicilari `x64` macOS dosyasini indirmelidir.
- macOS uygulamasi henuz Apple Developer ID ile signed/notarized degildir; Gatekeeper uyarisi gorulebilir.
- Node.js ve Python ayrica kurulmaz; desktop paketleri gerekli runtime altyapisini beraber getirir.
- Veriler yerel bilgisayarda saklanir. Duzenli olarak Tam Yedek alinmalidir.
## v2.1.1 - Security Hardening Release

Bu patch release, v2.1.0 uzerine guvenlik duzeltmeleri ve dependency audit temizligi getirir. Yeni ozellik, DB schema degisikligi, signing/notarization veya SQLite encryption bu release kapsaminda yoktur.

### One Cikanlar

- Export CSV/PDF route'larina local PIN auth korumasi eklendi.
- AI extraction POST route'larina local PIN auth korumasi eklendi.
- Desktop production/packaged server `127.0.0.1` localhost ile sinirlandirildi.
- PIN cok deneme korumasi eklendi.
- 5 hatali PIN denemesinden sonra 5 dakika gecici kilit uygulanir.
- Local Host/Origin/Referer kontrolu eklendi.
- `npm audit` bulgulari giderildi; son durumda `found 0 vulnerabilities` sonucunu verir.
- Diagnostics/log gizliligi korunur; hata raporu `.env`, gercek `DATABASE_URL`, tam path veya kullanici dosyasi icermez.

### Kapsam Disi Kalanlar

- Windows code signing bu release kapsaminda degildir.
- macOS signing/notarization bu release kapsaminda degildir; Gatekeeper uyarisi gorulebilir.
- SQLite DB encryption sonraki plan olarak durur.

### Indirme Notu

- Windows kullanicilari icin onerilen dosya: `Muhasebe-Takip-Setup-2.1.1.exe`.
- Kurulum istemeyen kullanicilar icin portable dosya: `Muhasebe-Takip-Portable-2.1.1.exe`.
- Apple Silicon Mac kullanicilari `arm64`, Intel Mac kullanicilari `x64` macOS dosyasini indirmelidir.
- Node.js ve Python ayrica kurulmaz; desktop paketleri gerekli runtime altyapisini beraber getirir.
- Veriler yerel bilgisayarda saklanir. Duzenli olarak Tam Yedek alinmalidir.

## v2.1.0 - UI/UX Desktop Release

Bu release, Muhasebe Takip uygulamasinin masaustu kullanima daha hazir ve satisa sunulabilir hissettirmesi icin yapilan UI/UX yenilemesini tamamlar. Teknik cekirdek, veritabani semasi, AppData veri davranisi, backup/restore, Electron runtime ve Python/MarkItDown akislari korunmustur.

### One Cikanlar

- Satisa hazir UI/UX yenilemesi tamamlandi.
- Dashboard daha okunakli ve profesyonel hale getirildi.
- Sidebar/navigation aktif sayfa algisi ve masaustu uygulama hissi iyilestirildi.
- Login/PIN ve onboarding ekranlari daha sade, guven veren bir yapida cilalandi.
- Cariler, faturalar, tahsilat/odeme, giderler, sabit giderler ve onemli tarihler ekranlari iyilestirildi.
- Liste, tablo, form, bos durum ve status badge gorunumleri daha tutarli hale getirildi.
- AI fatura okuma akisi daha anlasilir hale getirildi.
- Backup/restore ekrani guven odakli iyilestirildi.
- System Status ve Destek Araclari gelistirildi.
- Veri klasorunu acma, log klasorunu acma ve guvenli hata raporu disa aktarma akisi desteklenir.
- Windows packaged app dogrulamalari gecti.
- macOS arm64/x64 build altyapisi hazir; macOS build unsigned/notarized degildir ve gercek Mac cihaz testi ayrica yapilacaktir.

### Indirme Notu

- Windows kullanicilari icin onerilen dosya: `Muhasebe-Takip-Setup-2.1.0.exe`.
- Kurulum istemeyen kullanicilar icin portable dosya: `Muhasebe-Takip-Portable-2.1.0.exe`.
- Apple Silicon Mac kullanicilari `arm64`, Intel Mac kullanicilari `x64` macOS dosyasini indirmelidir.
- macOS uygulamasi henuz Apple Developer ID ile signed/notarized degildir; Gatekeeper uyarisi gorulebilir.
- Node.js ve Python ayrica kurulmaz; desktop paketleri gerekli runtime altyapisini beraber getirir.
- Veriler yerel bilgisayarda saklanir. Duzenli olarak Tam Yedek alinmalidir.

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
