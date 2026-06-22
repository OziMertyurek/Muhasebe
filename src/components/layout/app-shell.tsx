import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f6f3] text-[#16201b]">
      <Suspense fallback={<SidebarFallback />}>
        <Sidebar />
      </Suspense>
      <main className="min-h-screen px-4 py-5 md:pl-72 md:pr-6 lg:py-7">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

function SidebarFallback() {
  return (
    <aside className="border-b border-[#dce2dc] bg-white md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-16 items-center px-5">
        <p className="text-sm font-semibold text-[#16201b]">Muhasebe Takip</p>
      </div>
    </aside>
  );
}
