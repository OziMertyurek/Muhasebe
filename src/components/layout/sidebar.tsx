"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, LogOut } from "lucide-react";
import { clsx } from "clsx";
import { navigationItems } from "@/lib/navigation";
import { appInfo } from "@/lib/app-info";

const navigationGroups = [
  {
    title: "Genel",
    hrefs: ["/", "/companies", "/invoices", "/payments", "/expenses"],
  },
  {
    title: "Operasyon",
    hrefs: [
      "/recurring-expenses",
      "/accounts",
      "/accounts?type=CREDIT_CARD",
      "/important-dates",
      "/files",
      "/ai-extraction",
    ],
  },
  {
    title: "Analiz",
    hrefs: ["/reports", "/help", "/settings"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function isItemActive(href: string) {
    const [path, queryString] = href.split("?");

    if (path === "/") {
      return pathname === "/";
    }

    const pathMatches = pathname === path || pathname.startsWith(`${path}/`);

    if (!pathMatches) {
      return false;
    }

    if (queryString) {
      const expectedParams = new URLSearchParams(queryString);

      for (const [key, value] of expectedParams.entries()) {
        if (searchParams.get(key) !== value) {
          return false;
        }
      }

      return true;
    }

    if (path === "/accounts" && searchParams.get("type") === "CREDIT_CARD") {
      return false;
    }

    return true;
  }

  return (
    <aside
      data-tour="sidebar"
      className="border-b border-[#dce2dc] bg-white md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r"
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-[#e5e9e5] px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#dce2dc] bg-[#fbfcfa] text-[#14543f]">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#16201b]">Muhasebe Takip</p>
            <p className="text-xs text-[#647067]">Yerel şirket paneli</p>
          </div>
        </div>

        <nav
          aria-label="Ana menü"
          className="flex gap-2 overflow-x-auto px-3 py-3 md:flex-1 md:flex-col md:gap-3 md:overflow-y-auto"
        >
          {navigationGroups.map((group) => (
            <div key={group.title} className="flex gap-1 md:flex-col">
              <p className="hidden px-3 text-[11px] font-semibold uppercase tracking-normal text-[#8a978d] md:block">
                {group.title}
              </p>
              {navigationItems
                .filter((item) => group.hrefs.includes(item.href))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = isItemActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-tour={
                        item.href === "/companies"
                          ? "companies"
                          : item.href === "/invoices"
                            ? "invoices"
                            : item.href === "/ai-extraction"
                              ? "ai-extraction"
                              : item.href === "/settings"
                                ? "system-status"
                                : item.href === "/help"
                                  ? "help"
                                  : undefined
                      }
                      aria-current={isActive ? "page" : undefined}
                      className={clsx(
                        "group relative flex h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium transition md:h-9",
                        isActive
                          ? "bg-[#f4f7f4] text-[#14543f] shadow-[inset_2px_0_0_#8ea99b]"
                          : "text-[#46534b] hover:bg-[#f1f4f1] hover:text-[#16201b]",
                      )}
                    >
                      <Icon
                        className={clsx(
                          "h-4 w-4 shrink-0",
                          isActive
                            ? "text-[#1f6f54]"
                            : "text-[#647067] group-hover:text-[#46534b]",
                        )}
                      />
                      <span className="whitespace-nowrap">{item.label}</span>
                      {"badge" in item ? (
                        <span className="ml-auto rounded-sm border border-[#dce2dc] bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-normal text-[#607167]">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
            </div>
          ))}
          <Link
            href="/cikis"
            className="flex h-11 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium text-[#46534b] transition hover:bg-[#f1f4f1] hover:text-[#16201b] md:hidden"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Çıkış Yap</span>
          </Link>
        </nav>

        <div className="hidden border-t border-[#e5e9e5] px-5 py-4 text-xs text-[#647067] md:block">
          <Link
            href="/cikis"
            className="mb-3 flex h-9 items-center justify-center gap-2 rounded-md border border-[#cfd8cf] bg-white px-3 text-sm font-semibold text-[#46534b] transition hover:bg-[#f7f9f7] hover:text-[#16201b]"
          >
            <LogOut className="h-4 w-4" />
            Çıkış Yap
          </Link>
          <p className="font-semibold text-[#16201b]">v{appInfo.version}</p>
          <p>{appInfo.mode} kullanım</p>
        </div>
      </div>
    </aside>
  );
}
