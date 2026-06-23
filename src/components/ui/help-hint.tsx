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
  linkLabel = "Detayli rehberi ac",
}: HelpHintProps) {
  return (
    <aside className="rounded-lg border border-[#dce2dc] bg-[#fbfcfa] p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#e8f2ed] text-[#14543f]">
            <Lightbulb className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[#16201b]">{title}</h2>
            <ul className="mt-2 grid gap-1.5 text-sm leading-6 text-[#607167] md:grid-cols-3">
              {items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8ea99b]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#46534b] transition hover:border-[#8ea99b] hover:text-[#16201b]"
          >
            {linkLabel}
          </Link>
        ) : null}
      </div>
    </aside>
  );
}