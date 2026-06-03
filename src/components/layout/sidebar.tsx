"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";
import { clsx } from "clsx";
import { navigationItems } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-[#dce2dc] bg-white md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-[#dce2dc] px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#1f6f54] text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#16201b]">Muhasebe Takip</p>
            <p className="text-xs text-[#647067]">Yerel şirket paneli</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 py-3 md:flex-1 md:flex-col md:overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex h-11 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                  isActive
                    ? "bg-[#e8f2ed] text-[#14543f]"
                    : "text-[#46534b] hover:bg-[#f1f4f1] hover:text-[#16201b]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
