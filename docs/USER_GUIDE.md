# Musteri Kullanim Rehberi

Bu rehber Muhasebe Takip'i ilk kez kullanan bir musteri icin hazirlanmistir. Uygulama yerel bilgisayarda calisir; veritabaniniz, yuklenen dosyalariniz ve yedekleriniz sizin bilgisayarinizda saklanir.

## Baslangic

- Program internet uzerindeki bir muhasebe servisi gibi calismaz; yerel bilgisayarinizda acilir.
- PIN uygulamaya girisi korur, ancak bilgisayar kullanici hesabiniz da parola veya PIN ile korunmalidir.
- Veriler GitHub'a veya harici bir sunucuya otomatik gonderilmez.
- Duzenli olarak `Ayarlar > Yedekleme > Tam Yedek Indir` ile tam yedek alinmalidir.
- Yedek ZIP dosyasini guvenli bir yerde saklamak kullanicinin sorumlulugundadir.

## Onerilen Kullanim Sirasi

1. Firma bilgilerini tamamla.
2. Cari ekle.
3. Fatura ekle.
4. Tahsilat veya odeme kaydet.
5. Giderleri isle.
6. Raporlari kontrol et.
7. Tam yedek al.

Bu siralama, kayitlarin raporlara ve cari ekstreye daha duzenli yansimasini saglar.

## Ilk Kurulum

Ilk acilista uygulama sirket bilgilerini ve guvenlik ayarlarini ister.

Dikkat edilecekler:

- Firma adi, vergi numarasi ve vergi dairesi bilgilerini dogru girin.
- Varsayilan para birimi ve KDV oranini kendi kullanimiza gore secin.
- PIN'i unutmayacaginiz ama kolay tahmin edilemeyecek bir deger olarak belirleyin.
- Yedekleme hatirlatmasini okuyup onaylayin.

Ilk kurulum tamamlandiktan sonra bilgiler `Ayarlar` ekranindan guncellenebilir.

## Cari Ekleme

Cariler; musteriler, tedarikciler veya her iki rolde calisan firmalardir.

1. Sol menuden `Cariler` sayfasina gidin.
2. `Yeni Cari` butonuna basin.
3. Firma adini ve cari tipini secin.
4. Vergi no, telefon, e-posta, adres ve vade bilgilerini girin.
5. Kaydedin.

Cari detay sayfasinda bakiye, faturalar, tahsilatlar, odemeler ve ekstre hareketleri gorulur.

## Fatura Ekleme

Faturalar satis veya alis olarak kaydedilebilir.

1. `Faturalar` sayfasina gidin.
2. `Yeni Fatura` butonuna basin.
3. Cari firmayi secin.
4. Fatura tipini, tarihini, vadesini ve tutarlarini girin.
5. KDV ve para birimi bilgilerini kontrol edin.
6. Kaydetmeden once cari, tarih ve toplam tutari tekrar kontrol edin.

Fatura ile iliskili tahsilat veya odeme girildikce fatura durumu takip edilir.

## Tahsilat / Odeme Kaydi

Para giris ve cikislari `Tahsilat / Odeme` ekranindan kaydedilir.

- `Para aldim` tahsilat anlamina gelir.
- `Para odedim` odeme anlamina gelir.
- Cari ve ilgili fatura secmek raporlarin dogru calismasina yardim eder.
- Finansal hesap secerseniz kasa, banka veya kredi karti hareketleri daha duzenli izlenir.

Yanlis kayit girildiginde once detay ekranindan bilgileri kontrol edin.

## Gider Ekleme

Tek seferlik giderler `Giderler` ekraninda takip edilir.

1. Gider basligi, tarih ve tutari girin.
2. Kategori secin.
3. Gerekirse cari ve finansal hesap baglantisi ekleyin.
4. Odendi / Odenmedi durumunu guncel tutun.

Duzenli masraflar icin `Sabit Giderler` ekrani kullanilabilir.

## AI Fatura Okuma

AI Fatura Okuma, fatura dosyasindan metin cikarmaya ve bilgileri kontrol ederek fatura kaydina donusturmeye yardim eder.

Onerilen akis:

1. Fatura dosyasini yukleyin.
2. Sistem metni cikarsin.
3. Cikan metni ve alanlari kontrol edin.
4. Cari eslesmesini kontrol edin.
5. Tutar, tarih, KDV ve cari bilgisini manuel dogrulayin.
6. Her sey dogruysa fatura olarak kaydedin.

AI veya metin cikarma sonucu eksik olabilir. Kaydetmeden once bilgileri mutlaka kullanici kontrol etmelidir.

## Raporlar

`Raporlar` sayfasi finansal durumu ozetler.

Kullanilabilecek raporlar:

- Aylik ozet
- Alacak / borc durumu
- Vadesi gelen faturalar
- Gider kategorileri
- Kasa & banka ozeti

Rapor bos gorunuyorsa tarih araligi, filtreler ve ilgili kayitlar kontrol edilmelidir.

## Tam Yedek Alma

En guvenli yedekleme yontemi `Tam Yedek Indir` akisini kullanmaktir.

Tam yedek ZIP icinde sunlar bulunur:

- `database/dev.db`
- `uploads/`
- `backup-info.json`

Yedek dosyasini harici disk, guvenli bulut alani veya sifreli bir klasorde saklayin. Tek bilgisayarda kalan yedek, bilgisayar arizasi durumunda yeterli olmayabilir.

## Geri Yukleme Uyarisi

Restore islemi mevcut verileri etkileyebilir.

- Bilinmeyen ZIP dosyalariyla restore yapmayin.
- Restore oncesinde ayrica manuel tam yedek alin.
- Uygulama restore oncesinde otomatik guvenlik yedegi alir, ancak kritik veriler icin manuel yedek aliskanligi korunmalidir.
- Restore sonrasi uygulamayi kapatip yeniden acmak gerekebilir.

## System Status ve Destek Araclari

`Ayarlar > Sistem Durumu` ekraninda uygulama sagligi ve destek araclari gorulur.

Destek araclari:

- Veri klasorunu ac: Uygulamanin masaustu veri klasorunu acar.
- Log klasorunu ac: Startup ve hata loglarini incelemek icin kullanilir.
- Hata raporu disa aktar: Destek icin guvenli bir rapor olusturur.

Hata raporu hassas veri icermeyecek sekilde tasarlanmistir. `.env`, gercek `DATABASE_URL`, tam AppData/DB pathleri, kullanici upload dosyalari ve backup ZIP dosyalari rapora eklenmez.

## Guvenlik Notlari

- PIN uygulama erisimini sinirlar.
- Bilgisayar kullanici hesabi da parola veya PIN ile korunmalidir.
- Windows build henuz code signed degildir; SmartScreen uyarisi gorulebilir.
- macOS build henuz signed/notarized degildir; Gatekeeper uyarisi gorulebilir.
- Mevcut surumde SQLite DB uygulama seviyesinde sifreli degildir; DB encryption icin ayri teknik plan hazirlanmistir.
- Yedek dosyalari hassas veri icerebilir; guvenli yerde saklanmalidir.

## Sik Karsilasilan Sorunlar

### Program acilmiyor

Uygulamayi tekrar baslatin. Desktop uygulamasinda log klasoru acilabiliyorsa `startup.log` dosyasini kontrol edin. Sorun devam ederse destek icin hata raporu disa aktarilabilir.

### PIN yanlis diyor

PIN'i dikkatli tekrar girin. Cok fazla hatali denemeden sonra gecici kilit uygulanir; birkac dakika bekleyip yeniden deneyin.

### Yedek indiremiyorum

Desktop uygulamasinda dosyalar genellikle `Downloads/MuhasebeTakip` klasorune kaydedilir. Tarayici modunda indirme izinlerini kontrol edin.

### AI fatura okumuyor

`Ayarlar > Sistem Durumu` ekraninda Python ve MarkItDown durumunu kontrol edin. Dosya kalitesi veya format metin cikarma sonucunu etkileyebilir.

### Rapor bos gorunuyor

Tarih araligi, para birimi, filtreler ve ilgili kayitlar kontrol edilmelidir. Henuz fatura, tahsilat, odeme veya gider kaydi olmayabilir.

### macOS Gatekeeper uyarisi cikiyor

macOS build henuz signed/notarized degildir. Ilk acilista gerekirse dosyaya sag tiklayip `Open` secenegini kullanin.

### Windows SmartScreen uyarisi cikiyor

Windows build henuz code signed degildir. Dosyayi yalnizca resmi GitHub Release sayfasindan indirdiginizden emin olun.