import Link from "next/link";
import { Lightbulb } from "lucide-react";

export type HelpHintProps = {
  title: string;
  items: string[];
  href?: string;
  linkLabel?: string;
};

export function HelpHint({
  title,
  items,
  href,
  linkLabel = "Rehber",
}: HelpHintProps) {
  return (
    <aside className="rounded-md border border-[#dce2dc] bg-white px-3 py-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-2">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#607167]" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#16201b]">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-[#607167]">
              {items.slice(0, 3).join(" · ")}
            </p>
          </div>
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md px-2.5 text-xs font-semibold text-[#1f6f54] transition hover:bg-[#f1f4f1] hover:text-[#195d47]"
          >
            {linkLabel}
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
