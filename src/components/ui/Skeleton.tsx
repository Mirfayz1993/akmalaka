import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn("animate-pulse bg-slate-200 rounded", className)}
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Yuklanmoqda...">
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 px-4 py-3 flex gap-4">
          {[40, 100, 80, 60, 80].map((w, i) => (
            <Skeleton key={i} className={`h-4 w-${w}`} style={{ width: w }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-4 py-3 border-t border-slate-100 flex gap-4">
            {[40, 100, 80, 60, 80].map((w, i) => (
              <Skeleton key={i} className="h-4" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
