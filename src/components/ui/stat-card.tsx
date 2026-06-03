import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  tone: "positive" | "warning" | "neutral" | "danger";
  icon: LucideIcon;
};

const toneClasses = {
  positive: "bg-[#e8f2ed] text-[#14543f]",
  warning: "bg-[#fff4dc] text-[#765116]",
  neutral: "bg-[#ecf0f5] text-[#34445c]",
  danger: "bg-[#fdecea] text-[#8b2f28]",
};

export function StatCard({
  title,
  value,
  description,
  tone,
  icon: Icon,
}: StatCardProps) {
  return (
    <article className="rounded-lg border border-[#dce2dc] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#647067]">{title}</p>
          <p className="mt-3 text-2xl font-semibold tracking-normal text-[#16201b]">{value}</p>
        </div>
        <div className={clsx("flex h-10 w-10 items-center justify-center rounded-md", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-5 text-[#647067]">{description}</p>
    </article>
  );
}
