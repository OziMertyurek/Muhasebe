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
    card: "border-[#dce2dc]",
    value: "text-[#14543f]",
    icon: "bg-[#f3f7f4] text-[#14543f]",
  },
  warning: {
    card: "border-[#e4ddc9]",
    value: "text-[#765116]",
    icon: "bg-[#fbf7ed] text-[#765116]",
  },
  neutral: {
    card: "border-[#dce2dc]",
    value: "text-[#16201b]",
    icon: "bg-[#f3f5f4] text-[#46534b]",
  },
  danger: {
    card: "border-[#e5d8d5]",
    value: "text-[#8b2f28]",
    icon: "bg-[#fbf1ef] text-[#8b2f28]",
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
        "rounded-lg border bg-white p-4",
        toneClass.card,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#647067]">{title}</p>
          <p
            className={clsx(
              "mt-3 text-2xl font-semibold leading-tight tracking-normal",
              toneClass.value,
            )}
          >
            {value}
          </p>
        </div>
        <div
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            toneClass.icon,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-5 text-[#647067]">{description}</p>
    </article>
  );
}
