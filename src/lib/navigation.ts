import {
  Banknote,
  BarChart3,
  CalendarClock,
  CreditCard,
  FolderArchive,
  FileText,
  HelpCircle,
  Home,
  Landmark,
  Package,
  Receipt,
  RefreshCw,
  ScanText,
  Settings,
  Users,
} from "lucide-react";

export const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
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
    href: "/expenses",
    icon: Receipt,
  },
  {
    label: "Urunler / Stok",
    href: "/products",
    icon: Package,
  },
  {
    label: "Sabit Giderler",
    href: "/recurring-expenses",
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
    href: "/important-dates",
    icon: CalendarClock,
  },
  {
    label: "Dosya Arşivi",
    href: "/files",
    icon: FolderArchive,
  },
  {
    label: "AI Fatura Okuma",
    href: "/ai-extraction",
    icon: ScanText,
    badge: "V1",
  },
  {
    label: "Raporlar",
    href: "/reports",
    icon: BarChart3,
  },
  {
    label: "Yardim",
    href: "/help",
    icon: HelpCircle,
  },
  {
    label: "Ayarlar",
    href: "/settings",
    icon: Settings,
  },
];
