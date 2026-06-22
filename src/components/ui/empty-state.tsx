import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: LucideIcon;
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon: Icon = Inbox,
}: EmptyStateProps) {
  return (
    <div className="m-4 flex flex-col items-center rounded-lg border border-dashed border-[#cfd8cf] bg-[#fbfcfa] px-6 py-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-[#dce2dc] bg-white text-[#607167] shadow-sm">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-semibold text-[#223028]">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#647067]">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex h-10 items-center rounded-md bg-[#1f6f54] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195d47] focus:outline-none focus:ring-2 focus:ring-[#8ea99b] focus:ring-offset-2"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
