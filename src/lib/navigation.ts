import {
  Banknote,
  BarChart3,
  CalendarClock,
  CreditCard,
  FileText,
  Home,
  Landmark,
  Receipt,
  RefreshCw,
  Settings,
  Users,
} from "lucide-react";

export const navigationItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    label: "Cariler",
    href: "/cariler",
    icon: Users,
  },
  {
    label: "Faturalar",
    href: "/faturalar",
    icon: FileText,
  },
  {
    label: "Tahsilat / Ödeme",
    href: "/tahsilat-odeme",
    icon: Banknote,
  },
  {
    label: "Giderler",
    href: "/giderler",
    icon: Receipt,
  },
  {
    label: "Sabit Giderler",
    href: "/sabit-giderler",
    icon: RefreshCw,
  },
  {
    label: "Kasa & Banka",
    href: "/kasa-banka",
    icon: Landmark,
  },
  {
    label: "Kredi Kartları",
    href: "/kredi-kartlari",
    icon: CreditCard,
  },
  {
    label: "Önemli Tarihler",
    href: "/onemli-tarihler",
    icon: CalendarClock,
  },
  {
    label: "Raporlar",
    href: "/raporlar",
    icon: BarChart3,
  },
  {
    label: "Ayarlar",
    href: "/ayarlar",
    icon: Settings,
  },
];
