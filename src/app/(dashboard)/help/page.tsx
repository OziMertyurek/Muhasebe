import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  DatabaseBackup,
  FileText,
  LifeBuoy,
  ReceiptText,
  ScanText,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";

export const dynamic = "force-dynamic";

const workflowSteps = [
  "Firma bilgilerini tamamla",
  "Cari ekle",
  "Fatura ekle",
  "Tahsilat veya odeme kaydet",
  "Giderleri isle",
  "Raporlari kontrol et",
  "Tam yedek al",
];

const guideSections = [
  {
    id: "baslangic",
    title: "Baslangic",
    icon: BookOpen,
    description:
      "Muhasebe Takip yerel bilgisayarda calisir. Kayitlar, yuklenen dosyalar ve yedekler sizin bilgisayarinizdaki veri klasorlerinde saklanir.",
    bullets: [
      "PIN uygulama girisini korur; bilgisayar kullanici hesabi da parola veya PIN ile korunmalidir.",
      "Program verileri harici bir sunucuya otomatik gondermez.",
      "Duzenli olarak Tam Yedek Indir akisi kullanilmalidir.",
    ],
  },
  {
    id: "ilk-kurulum",
    title: "Ilk kurulum",
    icon: CheckCircle2,
    description:
      "Ilk acilista sirket bilgileri, varsayilan para birimi, KDV bilgisi ve PIN kurulur.",
    bullets: [
      "Firma adi, vergi bilgileri ve varsayilan ayarlari dikkatli girin.",
      "PIN'i unutmayacaginiz ama tahmin edilmesi zor bir deger olarak belirleyin.",
      "Yedekleme hatirlatmasini okuyup onaylamadan kurulumu tamamlamayin.",
    ],
  },
  {
    id: "cariler",
    title: "Cari ekleme",
    icon: Users,
    description:
      "Musteri, tedarikci veya hem musteri hem tedarikci olan firmalar Cariler ekranindan yonetilir.",
    bullets: [
      "Yeni cari eklerken firma adini ve cari tipini dogru secin.",
      "Vergi no, telefon, e-posta ve adres bilgileri rapor ve ekstre takibini kolaylastirir.",
      "Cari detay sayfasinda bakiye, faturalar, tahsilatlar ve ekstre hareketleri gorunur.",
    ],
  },
  {
    id: "faturalar",
    title: "Fatura ekleme",
    icon: FileText,
    description:
      "Satis ve alis faturalarini Faturalar ekranindan kaydedebilir, durumlarini odeme hareketleriyle takip edebilirsiniz.",
    bullets: [
      "Cari, fatura tipi, tarih, vade, para birimi, tutar ve KDV alanlarini kontrol edin.",
      "Geciken veya kismi odenen faturalar raporlarda ayrica gorunur.",
      "Kaydetmeden once cari, tarih ve tutar bilgilerini mutlaka yeniden kontrol edin.",
    ],
  },
  {
    id: "tahsilat-odeme",
    title: "Tahsilat / odeme kaydi",
    icon: WalletCards,
    description:
      "Para giris ve cikislarini Tahsilat / Odeme ekranindan kaydedin. Ilgili fatura secilirse fatura durumu otomatik takip edilir.",
    bullets: [
      "Islem tipi, cari, tutar, tarih ve odeme yontemini net girin.",
      "Finansal hesap secerek kasa, banka veya kredi karti hareketlerini daha duzenli izleyin.",
      "Yanlis kayit girerseniz silme yerine once detay bilgisini kontrol edin.",
    ],
  },
  {
    id: "giderler",
    title: "Gider ekleme",
    icon: ReceiptText,
    description:
      "Tek seferlik giderleri Giderler ekranindan, duzenli gider sablonlarini Sabit Giderler ekranindan takip edin.",
    bullets: [
      "Kategori, tarih, tutar ve aciklama alanlari rapor kalitesini artirir.",
      "Odendi / Odenmedi durumunu guncel tutun.",
      "Sabit giderler tekrar eden masraflari hatirlamak icin kullanilir.",
    ],
  },
  {
    id: "ai",
    title: "AI fatura okuma",
    icon: ScanText,
    description:
      "AI Fatura Okuma ekrani fatura dosyasindan metin cikarmaya, alanlari kontrol etmeye ve onaydan sonra fatura kaydina donusturmeye yardimci olur.",
    bullets: [
      "Fatura dosyasini yukleyin ve metin cikarma adimini calistirin.",
      "Cikan metni, tutari, tarihi, cari bilgisini ve KDV alanlarini kontrol edin.",
      "Cari eslesmesini mutlaka dogrulayin.",
      "Kaydetmeden once fatura bilgilerini son kez manuel kontrol edin.",
    ],
  },
  {
    id: "raporlar",
    title: "Raporlar",
    icon: DatabaseBackup,
    description:
      "Raporlar ekraninda aylik ozet, alacak/borc durumu, vadesi gelen faturalar, gider kategorileri ve kasa/banka ozeti gorulur.",
    bullets: [
      "Rapor bos gorunuyorsa once ilgili tarih araligi ve filtreleri kontrol edin.",
      "CSV ve PDF ciktilarini gerekli durumlarda disari aktarabilirsiniz.",
      "Farkli para birimleri raporlarda ayri takip edilebilir.",
    ],
  },
  {
    id: "yedekleme",
    title: "Tam yedek alma ve geri yukleme",
    icon: DatabaseBackup,
    description:
      "En onemli aliskanlik duzenli Tam Yedek Indir kullanmaktir. Tam yedek DB, upload dosyalari ve backup bilgisini tek ZIP icinde saklar.",
    bullets: [
      "Yedek ZIP dosyasini guvenli bir yerde saklayin.",
      "Restore islemi mevcut verileri etkileyebilir; bilinmeyen ZIP dosyalariyla restore yapmayin.",
      "Restore oncesinde sistem guvenlik yedegi alir, ancak kritik islemlerden once manuel tam yedek almak en saglisidir.",
    ],
  },
  {
    id: "destek",
    title: "System Status ve Destek Araclari",
    icon: LifeBuoy,
    description:
      "Ayarlar > Sistem Durumu sayfasi veri klasoru, yedekleme, PIN, Python/MarkItDown ve destek araclari durumunu gosterir.",
    bullets: [
      "Veri Klasorunu Ac, uygulama verilerinin saklandigi masaustu veri klasorunu acar.",
      "Log Klasorunu Ac, startup ve uygulama loglarini incelemek icin kullanilir.",
      "Hata Raporu Disa Aktar, hassas veri icermeyecek sekilde tasarlanmis destek raporu olusturur.",
    ],
  },
  {
    id: "guvenlik",
    title: "Guvenlik notlari",
    icon: ShieldCheck,
    description:
      "Uygulama yerel calisir ve PIN ile korunur. Yine de bilgisayar ve yedek dosyalari ayrica guvende tutulmalidir.",
    bullets: [
      "Bilgisayar kullanici hesabinizi parola veya PIN ile koruyun.",
      "Yedek ZIP dosyalarini guvenli ve tercihen sifreli bir yerde saklayin.",
      "DB encryption planlandi, ancak mevcut surumde veritabani dosyasi uygulama seviyesinde sifreli degildir.",
    ],
  },
];

const commonIssues = [
  {
    issue: "Program acilmiyor",
    answer:
      "Uygulamayi tekrar baslatin. Desktop uygulamasinda Ayarlar > Sistem Durumu veya log klasoru acilabiliyorsa startup.log dosyasini kontrol edin.",
  },
  {
    issue: "PIN yanlis diyor",
    answer:
      "PIN'i dikkatli tekrar girin. Cok fazla hatali denemede kisa sureli kilit uygulanir; birkac dakika bekleyip yeniden deneyin.",
  },
  {
    issue: "Yedek indiremiyorum",
    answer:
      "Masaustu uygulamasinda indirmeler Downloads/MuhasebeTakip klasorune kaydedilir. Tarayici modunda indirme izinlerini kontrol edin.",
  },
  {
    issue: "AI fatura okumuyor",
    answer:
      "System Status ekraninda Python ve MarkItDown durumunu kontrol edin. Dosya kalitesi dusukse metin cikarma sonucu eksik olabilir.",
  },
  {
    issue: "Rapor bos gorunuyor",
    answer:
      "Tarih araligi, para birimi ve filtreleri kontrol edin. Ilgili cari, fatura, odeme veya gider kaydi olmayabilir.",
  },
  {
    issue: "macOS Gatekeeper uyarisi cikiyor",
    answer:
      "macOS build henuz signed/notarized degildir. Ilk acilista gerekirse dosyaya sag tiklayip Open secenegini kullanin.",
  },
  {
    issue: "Windows SmartScreen uyarisi cikiyor",
    answer:
      "Windows build henuz code signed degildir. Dosyayi yalnizca resmi GitHub Release sayfasindan indirdiginizden emin olun.",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <section className="border-b border-[#dce2dc] pb-6">
        <p className="text-sm font-medium text-[#607167]">Yardim Merkezi</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-[#16201b]">
              Muhasebe Takip kullanim rehberi
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#647067]">
              Gunluk muhasebe akisini, yedekleme aliskanligini, AI fatura okuma adimlarini
              ve destek araclarini tek sayfada ozetleyen musteri rehberi.
            </p>
          </div>
          <Link
            href="/settings/system-status"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-4 text-sm font-semibold text-[#46534b] shadow-sm transition hover:border-[#8ea99b] hover:text-[#16201b]"
          >
            Sistem Durumuna Git
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-lg border border-[#c7dfcf] bg-[#f4fbf6] p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-[#14543f] shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#16201b]">Baslamadan once</h2>
              <p className="mt-2 text-sm leading-6 text-[#46534b]">
                Program yerel bilgisayarda calisir; verileriniz bu bilgisayarda saklanir.
                PIN uygulamaya girisi korur, fakat bilgisayar kullanici hesabinizin da
                guvenli olmasi gerekir. En iyi koruma duzenli tam yedek almaktir.
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-lg border border-[#ead7a8] bg-[#fffaf0] p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-[#765116] shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#16201b]">Yedek uyarisi</h2>
              <p className="mt-2 text-sm leading-6 text-[#745214]">
                Tam yedek almadan bilgisayar degistirmeyin, restore denemesi yapmayin ve
                onemli verileri silmeyin. Bilinmeyen ZIP dosyalariyla geri yukleme yapmayin.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#16201b]">Onerilen kullanim sirasi</h2>
            <p className="mt-1 text-sm leading-6 text-[#647067]">
              Ilk kurulumdan gunluk kullanima kadar en saglikli akis.
            </p>
          </div>
          <span className="hidden rounded-md border border-[#cfd8cf] bg-[#fbfcfa] px-3 py-1 text-xs font-semibold text-[#607167] sm:inline-flex">
            7 adim
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {workflowSteps.map((step, index) => (
            <div
              key={step}
              className="rounded-lg border border-[#e5e9e5] bg-[#fbfcfa] p-3"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#e8f2ed] text-xs font-bold text-[#14543f]">
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-semibold leading-5 text-[#223028]">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {guideSections.map((section) => {
          const Icon = section.icon;

          return (
            <article
              key={section.id}
              id={section.id}
              className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-[#16201b]">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#647067]">{section.description}</p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-[#46534b]">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#1f6f54]" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#ecf0f5] text-[#34445c]">
            <CircleHelp className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#16201b]">Sik karsilasilan sorunlar</h2>
            <p className="mt-1 text-sm leading-6 text-[#647067]">
              Ilk destek kontrolu icin kisa cevaplar.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {commonIssues.map((item) => (
            <div
              key={item.issue}
              className="rounded-lg border border-[#e5e9e5] bg-[#fbfcfa] p-4"
            >
              <h3 className="text-sm font-semibold text-[#16201b]">{item.issue}</h3>
              <p className="mt-2 text-sm leading-6 text-[#647067]">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}