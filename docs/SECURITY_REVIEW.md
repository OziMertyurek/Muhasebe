# Security Review

## v2.1.1 Security Hardening Ozeti

Bu dokuman v2.1.1 security hardening calismasi oncesinde kapatilan riskleri, npm audit bulgularini ve genis dagitim icin kalan guvenlik notlarini ozetler.

Kod davranisi v2.1.1 Faz 3 kapsaminda degistirilmemistir; bu dosya audit ve release hazirligi icin dokumantasyon amaclidir.

## Kapatilan Riskler

- Export CSV/PDF route'lari artik local PIN oturumu ister.
- AI extraction POST route'lari artik local PIN oturumu ister.
- Packaged/production Electron server `127.0.0.1` uzerinden dinleyecek sekilde sinirlandirildi.
- PIN login akisi icin gecici rate limit eklendi.
- 5 hatali PIN denemesinden sonra 5 dakika kilit uygulanir.
- State-changing local route handler istekleri icin Host/Origin/Referer kontrolu eklendi.
- Diagnostics/hata raporu akisi `.env`, gercek `DATABASE_URL`, tam path ve kullanici dosyalarini rapora dahil etmeyecek sekilde korunur.

## npm audit Ozeti

`npm audit --json` sonucu:

- Critical: 0
- High: 1
- Moderate: 5
- Low: 0
- Total: 6

### Bulgular

| Paket | Seviye | Direct mi? | Zincir | Runtime etkisi | Fix durumu | v2.1.1 engeli |
|---|---:|---|---|---|---|---|
| `hono` | High | Transitive | `prisma` -> `@prisma/dev`/dev tooling zinciri | Uygulama Hono server olarak calismiyor; packaged desktop runtime icin dogrudan kullanici request yuzeyi degil. | `fixAvailable: true`; ancak zincir Prisma dev tooling kaynakli. Ayrica test branch gerekir. | Hayir |
| `@hono/node-server` | Moderate | Transitive | `prisma` -> `@prisma/dev` | Prisma dev tooling zinciri; packaged app route serving bu paketle yapilmiyor. | Onerilen fix `prisma@6.19.3` ve semver-major/downgrade riski tasiyor. | Hayir |
| `@prisma/dev` | Moderate | Transitive | `prisma` | Dev tooling; runtime desktop app icin dogrudan request yuzeyi degil. | Onerilen fix Prisma major/downgrade; otomatik fix uygulanmadi. | Hayir |
| `prisma` | Moderate | Direct | root dependency | CLI/dev/build/migration araci; packaged runtime Prisma Client kullanir. | Onerilen fix `prisma@6.19.3`; mevcut v7 hattindan geriye/major test gerektirir. | Hayir |
| `next` | Moderate | Direct | `next` -> bundled `postcss` | Next runtime kullaniliyor; advisory PostCSS stringify XSS baglaminda. Uygulama kullanici CSS stringify yuzeyi sunmuyor. | Audit fix `next@9.3.3` oneriyor; guvenli degil, otomatik fix uygulanmadi. | Hayir |
| `postcss` | Moderate | Transitive | `next` -> `postcss` | Build/runtime dependency; kullanici kontrollu CSS stringify yuzeyi yok. | Next zinciri uzerinden riskli fix onerisi. | Hayir |

### Degerlendirme

- Critical bulgu yok.
- High bulgu `hono` transitive zincirinden geliyor ve bu uygulamanin Electron/Next packaged request yuzeyinde dogrudan Hono static server olarak kullanilmiyor.
- Otomatik fix onerileri Next/Prisma gibi cekirdek paketlerde riskli major/downgrade hareketi oneriyor.
- v2.1.1 icin release blocker gorulmedi.
- Dependency guncellemeleri ayri bir test branch uzerinde, full Windows/macOS build ve smoke test ile ele alinmalidir.

## npm outdated Ozeti

Onemli paketlerde patch/minor guncellemeler goruldu:

- `next`: 16.2.7 -> 16.2.9
- `eslint-config-next`: 16.2.7 -> 16.2.9
- `better-sqlite3`: 12.10.0 -> 12.11.1
- `tailwindcss`: 4.3.0 -> 4.3.1
- `@tailwindcss/postcss`: 4.3.0 -> 4.3.1
- `lucide-react`: 1.17.0 -> 1.21.0
- `pdfkit`: 0.19.0 -> 0.19.1
- `@types/react`: 19.2.16 -> 19.2.17
- `@types/node`: 25.9.1 -> 25.9.4 wanted, 26.0.0 latest
- `eslint`: 9.39.4 current/wanted, 10.5.0 latest

Major update isteyen veya ayri test isteyen basliklar:

- `eslint` 10.x ayri lint test branch gerektirir.
- `@types/node` 26.x tip etkisi nedeniyle ayri test gerektirir.
- Next/Electron/Prisma gibi cekirdek runtime paketleri icin patch bile olsa Windows packaged, installer, portable ve macOS workflow testleri tamamlanmadan release'e alinmamalidir.

## Bilinen Kalan Riskler

- SQLite DB sifreli degildir; bilgisayar veya AppData klasorune erisimi olan kisi veriye erisebilir.
- Windows code signing henuz yoktur; SmartScreen/guven uyarilari gorulebilir.
- macOS signing/notarization henuz yoktur; Gatekeeper uyarisi gorulebilir.
- Auto-update mekanizmasi yoktur; kullanicilar release dosyalarini manuel indirir.
- Dependency audit bulgulari incelendi, ancak cekirdek paket guncellemesi v2.1.1 kapsaminda yapilmadi.

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
