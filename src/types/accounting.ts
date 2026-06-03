export type DashboardStatId =
  | "receivable"
  | "payable"
  | "net"
  | "unpaidInvoices"
  | "monthlyExpenses"
  | "upcomingDates";

export type DashboardStat = {
  id: DashboardStatId;
  title: string;
  value: string;
  description: string;
  tone: "positive" | "warning" | "neutral" | "danger";
};

export type QuickAction = {
  title: string;
  description: string;
};

export type UpcomingDate = {
  title: string;
  detail: string;
  date: string;
};
