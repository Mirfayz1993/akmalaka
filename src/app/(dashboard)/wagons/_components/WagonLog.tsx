"use client";

interface TransportLog {
  id: number;
  action: string;
  createdAt: Date | string | null;
}

interface WagonLogProps {
  logs: TransportLog[];
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WagonLog({ logs }: WagonLogProps) {
  if (logs.length === 0) {
    return <p className="text-xs text-slate-400 py-2">{"Tarix yo'q"}</p>;
  }

  // Eng yangi — yuqorida
  const sorted = [...logs].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="space-y-2">
      {sorted.map((log) => (
        <div key={log.id} className="flex items-start gap-3 text-sm">
          <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
          <div>
            <p className="text-slate-800">{log.action}</p>
            <p className="text-xs text-slate-400 mt-0.5">{formatDate(log.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
