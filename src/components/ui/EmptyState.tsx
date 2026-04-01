import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {Icon && (
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Icon size={22} className="text-slate-400" aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && (
        <p className="text-xs text-slate-400 mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
