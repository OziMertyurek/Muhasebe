# Muhasebe

Yerel çalışan şirket içi mini muhasebe, cari hesap ve fatura takip sistemi.

## Kurulum

```bash
npm install
```

PowerShell'de `npm.ps1` çalıştırma kısıtı varsa aynı komutları `npm.cmd` ile çalıştırabilirsiniz.

```bash
npm.cmd install
```

## Geliştirme

```bash
npm run dev
```

PowerShell alternatifi:

```bash
npm.cmd run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

## Prisma

`.env.example` dosyasını temel alarak local `.env` oluşturun:

```bash
DATABASE_URL="file:./prisma/dev.db"
```

Ardından geliştirme veritabanı için:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```
