import type { ReactNode } from "react";
import { clsx } from "clsx";

type StatusTone = "positive" | "warning" | "neutral" | "danger";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusTone;
};

const toneClasses: Record<StatusTone, string> = {
  positive: "border-[#b9d8c7] bg-[#f1faf4] text-[#14543f]",
  warning: "border-[#ead7a8] bg-[#fff8e8] text-[#765116]",
  neutral: "border-[#cfd8cf] bg-[#f6f7f4] text-[#46534b]",
  danger: "border-[#e0c4bf] bg-[#fff7f5] text-[#8b2f28]",
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex min-h-7 items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
