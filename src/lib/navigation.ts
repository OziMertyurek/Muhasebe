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
    href: "/companies",
    icon: Users,
  },
  {
    label: "Faturalar",
    href: "/invoices",
    icon: FileText,
  },
  {
    label: "Tahsilat / Ödeme",
    href: "/payments",
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
    href: "/accounts",
    icon: Landmark,
  },
  {
    label: "Kredi Kartları",
    href: "/accounts?type=CREDIT_CARD",
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
