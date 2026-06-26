import type { ReactNode } from "react";
import { clsx } from "clsx";

type StatusTone = "positive" | "warning" | "neutral" | "danger";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusTone;
};

const toneClasses: Record<StatusTone, string> = {
  positive: "border-[#cfe0d5] bg-[#f6faf7] text-[#14543f]",
  warning: "border-[#e5d8b8] bg-[#fdf9ee] text-[#765116]",
  neutral: "border-[#d8ded8] bg-[#f8f9f7] text-[#46534b]",
  danger: "border-[#e2cfcb] bg-[#fff9f7] text-[#8b2f28]",
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex min-h-6 items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold leading-none",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
