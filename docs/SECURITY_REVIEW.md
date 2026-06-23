# Security Review

## v2.1.1 Security Hardening Ozeti

Bu dokuman v2.1.1 security hardening calismasinda kapatilan riskleri, npm audit bulgularinin durumunu ve genis dagitim icin kalan guvenlik notlarini ozetler.

## Kapatilan Riskler

- Export CSV/PDF route'lari artik local PIN oturumu ister.
- AI extraction POST route'lari artik local PIN oturumu ister.
- Packaged/production Electron server `127.0.0.1` uzerinden dinleyecek sekilde sinirlandirildi.
- PIN login akisi icin gecici rate limit eklendi.
- 5 hatali PIN denemesinden sonra 5 dakika kilit uygulanir.
- State-changing local route handler istekleri icin Host/Origin/Referer kontrolu eklendi.
- Diagnostics/hata raporu akisi `.env`, gercek `DATABASE_URL`, tam path ve kullanici dosyalarini rapora dahil etmeyecek sekilde korunur.

## npm audit Durumu

Son kontrol sonucu:

- Critical: 0
- High: 0
- Moderate: 0
- Low: 0
- Total: 0

`npm audit` artik `found 0 vulnerabilities` sonucunu verir.

## Uygulanan Dependency Duzeltmeleri

`npm audit fix` ve kontrollu npm override yaklasimi kullanildi. `npm audit fix --force` calistirilmadi.

- `hono` lockfile uzerinde `4.12.26` surumune yukseldi.
- `next` lockfile uzerinde `16.2.9` surumune yukseldi.
- `postcss` transitive dependency icin `8.5.10` override eklendi.
- `@hono/node-server` transitive dependency icin `1.19.13` override eklendi.
- `hono` transitive dependency icin `4.12.26` override eklendi.

Override gerekcesi:

- `@hono/node-server` ve `hono` bulgulari Prisma CLI/dev tooling zincirinden geliyordu.
- `postcss` bulgusu Next icindeki nested dependency zincirinden geliyordu.
- `npm audit fix --force`, Next/Prisma icin riskli breaking change/downgrade oneriyordu.
- Override ile yalnizca vulnerable transitive paketler guvenli surume sabitlendi.

## Dogrulama

Dependency duzeltmeleri sonrasinda su kontroller gecti:

- `npm audit`
- `npm run lint`
- `npm run build`
- `npm run prisma:generate`
- `npx prisma migrate status`
- `npm run dist:portable`
- `npm run dist:installer`

Security smoke test sonucu:

- Auth yokken `/exports/companies` 401 doner.
- Auth yokken AI extraction POST route 401 doner.
- Kotu Origin ile local POST 403 doner.
- Kotu Host ile protected route 403 doner.
- 5 hatali PIN denemesinden sonra login route 429 doner.
- Production standalone server `127.0.0.1:3000` uzerinden dinler.
- `0.0.0.0:3000` listener gorulmedi.

## npm outdated Ozeti

Onemli paketlerde patch/minor guncellemeler gorulebilir. Security acisindan acil olmayan guncellemeler ayri test branch uzerinde ele alinmalidir.

Major update isteyen veya ayri test isteyen basliklar:

- `eslint` 10.x ayri lint test branch gerektirir.
- `@types/node` 26.x tip etkisi nedeniyle ayri test gerektirir.
- Next/Electron/Prisma gibi cekirdek runtime paketleri icin patch bile olsa Windows packaged, installer, portable ve macOS workflow testleri tamamlanmadan release'e alinmamalidir.

## Bilinen Kalan Riskler

- SQLite DB sifreli degildir; bilgisayar veya AppData klasorune erisimi olan kisi veriye erisebilir.
- Windows code signing henuz yoktur; SmartScreen/guven uyarilari gorulebilir.
- macOS signing/notarization henuz yoktur; Gatekeeper uyarisi gorulebilir.
- Auto-update mekanizmasi yoktur; kullanicilar release dosyalarini manuel indirir.

## Kullaniciya Oneriler

- Uygulamayi guvenilir ve kisiye ait bilgisayarda kullanin.
- Bilgisayar kullanici hesabini guclu parola/PIN ile koruyun.
- Disk sifreleme kullanilabiliyorsa etkinlestirin.
- Duzenli olarak `Ayarlar > Yedekleme > Tam Yedek Indir` ile tam yedek alin.
- Yedek ZIP dosyalarini guvenli, tercihen sifreli bir yerde saklayin.
- Hata raporu paylasmadan once raporda hassas veri olmadigini yine de kontrol edin.

## Genis Dagitim Icin Gelecek Isler

- Windows code signing.
- macOS notarization.
- SQLite DB encryption veya OS-level encrypted storage degerlendirmesi.
- Auto-update guvenligi ve imzali update akisi.
- Dependency update branch'i ve tam regresyon testi.
- Server Actions icin ek Origin/CSRF audit'i.