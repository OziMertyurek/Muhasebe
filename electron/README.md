# Electron Gelistirme Denemesi

Bu klasor ilk Electron wrapper denemesi icindir. Installer, setup.exe veya AppData veritabani gecisi bu asamada yoktur.

Kullanim:

```bash
npm run dev
npm run electron:dev
```

`npm run dev` mevcut Next.js uygulamasini `http://localhost:3000` adresinde baslatir. `npm run electron:dev` bu adresi Electron penceresinde acar.

Notlar:

- Electron bu asamada Next.js server'i otomatik baslatmaz.
- Next.js server calismiyorsa Electron penceresinde Turkce hata ekrani gorunur.
- Veritabani yolu, upload klasoru ve `DATABASE_URL` degistirilmez.
- Installer ve paketleme sonraki asamada ele alinacaktir.
