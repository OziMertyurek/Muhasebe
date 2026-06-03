import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f7f4] text-[#16201b]">
      <Sidebar />
      <main className="min-h-screen px-4 py-5 md:pl-72 md:pr-6 lg:py-7">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
