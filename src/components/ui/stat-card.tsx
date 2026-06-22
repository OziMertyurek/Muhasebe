import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { clsx } from "clsx";

type StatCardProps = {
  title: string;
  value: ReactNode;
  description: ReactNode;
  tone: "positive" | "warning" | "neutral" | "danger";
  icon: LucideIcon;
};

const toneClasses = {
  positive: {
    card: "border-[#b9d8c7]",
    accent: "bg-[#1f6f54]",
    icon: "bg-[#e8f2ed] text-[#14543f]",
  },
  warning: {
    card: "border-[#ead7a8]",
    accent: "bg-[#c99224]",
    icon: "bg-[#fff4dc] text-[#765116]",
  },
  neutral: {
    card: "border-[#dce2dc]",
    accent: "bg-[#607167]",
    icon: "bg-[#ecf0f5] text-[#34445c]",
  },
  danger: {
    card: "border-[#e0c4bf]",
    accent: "bg-[#b9473d]",
    icon: "bg-[#fdecea] text-[#8b2f28]",
  },
};

export function StatCard({
  title,
  value,
  description,
  tone,
  icon: Icon,
}: StatCardProps) {
  const toneClass = toneClasses[tone];

  return (
    <article
      className={clsx(
        "relative min-h-40 overflow-hidden rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md",
        toneClass.card,
      )}
    >
      <span className={clsx("absolute inset-x-0 top-0 h-1", toneClass.accent)} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#647067]">{title}</p>
          <p className="mt-3 text-2xl font-semibold leading-tight tracking-normal text-[#16201b]">
            {value}
          </p>
        </div>
        <div
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
            toneClass.icon,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-5 text-[#647067]">{description}</p>
    </article>
  );
}
