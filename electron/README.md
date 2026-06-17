# Electron Gelistirme Denemesi

Bu klasor ilk Electron wrapper denemesi icindir. Installer, setup.exe veya AppData veritabani gecisi bu asamada yoktur.

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

`npm run electron:prod` port 3000 bos ise `npm run start` komutunu child process olarak baslatir. Build yoksa veya production server acilamazsa Electron penceresinde Turkce hata ekrani gorunur.

Notlar:

- Electron sadece kendi baslattigi Next.js server process'ini kapatir.
- Port 3000 zaten aciksa mevcut server'i kullanir ve onu kapatmaya calismaz.
- Next.js server belirlenen surede acilmazsa Electron penceresinde Turkce hata ekrani gorunur.
- Veritabani yolu, upload klasoru ve `DATABASE_URL` degistirilmez.
- Installer ve paketleme sonraki asamada ele alinacaktir.
