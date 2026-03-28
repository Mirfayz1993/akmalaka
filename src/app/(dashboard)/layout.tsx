import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 bg-slate-50 p-6 overflow-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}
