import { TableSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="p-6">
      <div className="h-8 w-40 bg-slate-200 rounded animate-pulse mb-6" />
      <TableSkeleton rows={8} />
    </div>
  );
}
