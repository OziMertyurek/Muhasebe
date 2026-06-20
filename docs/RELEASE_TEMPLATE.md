# Muhasebe Takip vX.Y.Z

## Hangi dosyayi indirmeliyim?

Isletim sisteminize uygun release asset dosyasini indirin. ZIP veya DMG icindeki dosyalar disinda ek dosya indirmeniz gerekmez.

## Windows

Windows 10/11 icin:

```text
Muhasebe-Takip-vX.Y.Z-Windows-Release.zip
```

ZIP icinden onerilen kurulum dosyasi:

```text
Muhasebe-Takip-Setup-X.Y.Z.exe
```

Kurulum yapmak istemeyen ileri kullanicilar portable surumu kullanabilir:

```text
Muhasebe-Takip-Portable-X.Y.Z.exe
```

Windows paketinde Node.js ve Python runtime uygulamayla beraber gelir.

## macOS

macOS surumu yayinlandiginda mimarinize uygun dosyayi indirin:

```text
Muhasebe-Takip-vX.Y.Z-macOS-arm64.dmg
Muhasebe-Takip-vX.Y.Z-macOS-x64.dmg
```

- Apple Silicon Mac: `arm64`
- Intel Mac: `x64`

macOS surumu yayinlanmadiysa Windows release assetleri macOS icin kullanilamaz.

## Kurulum notlari

- Windows icin Setup surumu onerilir.
- Portable surum kurulum gerektirmez, fakat ileri kullanicilar icindir.
- Node.js veya Python ayrica kurmaniz gerekmez.
- Ilk acilista sirket bilgileri ve PIN olusturulur.

## Veriler nerede saklanir?

Windows desktop modda veriler su klasorde saklanir:

```text
%APPDATA%/MuhasebeTakip/
```

macOS desktop mod hedef klasoru:

```text
~/Library/Application Support/MuhasebeTakip/
```

Uygulamayi kaldirmak bu veri klasorlerini otomatik silmemelidir.

## Yedekleme uyarisi

GitHub sadece uygulama kodunu ve release paketlerini saklar. Veritabaniniz ve yuklenen dosyalariniz local bilgisayarinizda saklanir.

Duzenli olarak uygulama icinden `Ayarlar > Yedekleme > Tam Yedek Indir` ile tam yedek alin.
