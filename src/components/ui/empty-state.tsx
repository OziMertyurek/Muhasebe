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
    <div className="m-3 flex flex-col items-center rounded-md border border-dashed border-[#cfd8cf] bg-[#fbfcfa] px-5 py-8 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#dce2dc] bg-white text-[#607167]">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-sm font-semibold text-[#223028]">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-5 text-[#647067]">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex h-9 items-center rounded-md bg-[#1f6f54] px-3 text-sm font-semibold text-white transition hover:bg-[#195d47] focus:outline-none focus:ring-2 focus:ring-[#8ea99b] focus:ring-offset-2"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
