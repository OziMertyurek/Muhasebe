# Electron Gelistirme ve Paketleme Notlari

Bu klasor Electron wrapper ve paketli desktop denemeleri icindir. Dev/prod calisma, portable build ve NSIS setup installer hedefleri desteklenir.

Kullanim:

```bash
npm run electron:dev
```

`npm run electron:dev` once `http://localhost:3000` adresinde calisan bir server olup olmadigini kontrol eder. Port 3000 zaten doluysa mevcut server'i kullanir. Server yoksa `npm run dev` komutunu child process olarak baslatir ve server hazir olunca Electron penceresinde uygulamayi acar.

Production denemesi:

```bash
npm run build
npm run electron:prod
```

`npm run electron:prod` port 3000 bos ise `.next/standalone/server.js` dosyasini Node child process olarak baslatir. Build yoksa veya production server acilamazsa Electron penceresinde Turkce hata ekrani gorunur.

Packaged Node runtime:

- Portable ve installer build sirasinda calisan `node.exe`, `resources/node/node.exe` altina kopyalanir.
- Paketli uygulama standalone server ve desktop DB bootstrap icin once bu bundled Node runtime'i kullanir.
- Bundled runtime bulunamazsa sistem `node.exe` fallback olarak denenir.
- Node runtime hic bulunamazsa uygulama sessiz kapanmaz; hata `AppData/Roaming/MuhasebeTakip/logs/startup.log` dosyasina yazilir ve Turkce hata ekrani gosterilir.

Runtime resolver onceligi:

1. Platform/arch uyumlu bundled runtime
2. Sistem runtime fallback
3. Turkce hata/uyari

Beklenen Node runtime pathleri:

```text
Windows: resources/node/node.exe
macOS arm64: resources/node/darwin-arm64/bin/node
macOS x64: resources/node/darwin-x64/bin/node
Linux fallback: resources/node/linux-x64/bin/node
```

Packaged Python / MarkItDown runtime:

- Portable ve installer build sirasinda `prepare:bundled-python`, yerel Python runtime'ini `build/python` altina hazirlar.
- `scripts/electron-after-pack.js`, bu runtime'i packaged app icinde `resources/python` altina kopyalar.
- Paketli uygulama AI fatura okuma icin once `resources/python/python.exe` runtime'ini kullanir.
- Bundled Python bulunamazsa sistem `py` / `python` fallback olarak denenir ve System Status uyari gosterir.
- `build/python`, `dist/` ve packaged ciktidir; Git'e alinmaz.

Beklenen Python runtime pathleri:

```text
Windows: resources/python/python.exe
macOS arm64: resources/python/darwin-arm64/bin/python3
macOS x64: resources/python/darwin-x64/bin/python3
Linux fallback: resources/python/linux-x64/bin/python3
```

Windows `node.exe` ve Windows Python runtime macOS paketlerinde kullanilamaz. macOS arm64 ve x64 runtime dosyalari Mac uzerinde ayri hazirlanip test edilmelidir.

Notlar:

- Electron sadece kendi baslattigi Next.js server process'ini kapatir.
- Port 3000 zaten aciksa mevcut server'i kullanir ve onu kapatmaya calismaz.
- Next.js server belirlenen surede acilmazsa Electron penceresinde Turkce hata ekrani gorunur.
- Kaynak modda veritabani yolu, upload klasoru ve `DATABASE_URL` degistirilmez.
- Paketli modda AppData altinda desktop veritabani bootstrap edilir ve mevcut AppData DB uzerine yazilmaz.

Portable build:

```bash
npm run build
npm run dist:portable
```

Windows setup installer:

```bash
npm run build
npm run dist:installer
```

Installer masaustu ve Start Menu kisayolu olusturur. Kaldirma sirasinda AppData altindaki `MuhasebeTakip` verisi otomatik silinmez.

Packaged app download handling:

- Paketli Electron uygulamasi backup ZIP, veritabani yedegi, CSV export ve PDF export indirmelerini `Downloads/MuhasebeTakip` klasorune kaydeder.
- Dosya adlari path traversal riskine karsi temizlenir.
- Ayni dosya adi daha once varsa mevcut dosyanin uzerine yazilmaz; dosya adina sirali ek eklenir.
- Backup ve export UI baglantilari native anchor olarak tutulmalidir; attachment route'lari Next.js client-side navigation ile acilmamalidir.
- Backend backup/export route auth davranisi degistirilmez.
