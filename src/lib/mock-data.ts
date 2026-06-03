import type { DashboardStat, QuickAction, UpcomingDate } from "@/types/accounting";

export const dashboardStats: DashboardStat[] = [
  {
    id: "receivable",
    title: "Toplam alacak",
    value: "₺128.400",
    description: "Henüz tahsil edilmemiş müşteri bakiyesi.",
    tone: "positive",
  },
  {
    id: "payable",
    title: "Toplam borç",
    value: "₺42.750",
    description: "Ödenecek fatura ve giderlerin toplamı.",
    tone: "danger",
  },
  {
    id: "net",
    title: "Net durum",
    value: "₺85.650",
    description: "Alacak ve borç arasındaki örnek fark.",
    tone: "neutral",
  },
  {
    id: "unpaidInvoices",
    title: "Ödenmemiş faturalar",
    value: "9 adet",
    description: "Vadesi bekleyen ya da geciken faturalar.",
    tone: "warning",
  },
  {
    id: "monthlyExpenses",
    title: "Bu ayki giderler",
    value: "₺18.920",
    description: "Tek seferlik ve sabit gider örnek toplamı.",
    tone: "neutral",
  },
  {
    id: "upcomingDates",
    title: "Yaklaşan önemli tarihler",
    value: "4 kayıt",
    description: "Vergi, kart ve sözleşme hatırlatmaları.",
    tone: "warning",
  },
];

export const recentActions: QuickAction[] = [
  {
    title: "Ben fatura kestim",
    description: "Müşteriye kesilen satış faturasını manuel girin.",
  },
  {
    title: "Bana fatura kesildi",
    description: "Tedarikçi veya hizmet faturası kaydı oluşturun.",
  },
  {
    title: "Para aldım",
    description: "Tahsilatı cari hesap ve kasa/banka ile ilişkilendirin.",
  },
  {
    title: "Para ödedim",
    description: "Ödeme hareketini fatura, gider veya kart hesabına bağlayın.",
  },
];

export const upcomingDates: UpcomingDate[] = [
  {
    title: "KDV ödeme günü",
    detail: "Vergi hatırlatması",
    date: "26 Haz",
  },
  {
    title: "Şirket kredi kartı",
    detail: "Son ödeme tarihi",
    date: "10 Tem",
  },
  {
    title: "Ofis kira sözleşmesi",
    detail: "Sözleşme bitiş kontrolü",
    date: "31 Tem",
  },
];
