"use client";

interface StatusVariant {
  bg: string;
  text: string;
  label: string;
}

interface StatusBadgeProps {
  status: string;
  variant?: Record<string, StatusVariant>;
}

const defaultVariants: Record<string, StatusVariant> = {
  in_transit: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    label: "Yo'lda",
  },
  at_border: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    label: "Chegarada",
  },
  arrived: {
    bg: "bg-green-100",
    text: "text-green-800",
    label: "Yetib keldi",
  },
  distributed: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    label: "Taqsimlandi",
  },
  active: {
    bg: "bg-red-100",
    text: "text-red-800",
    label: "Faol",
  },
  partially_paid: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    label: "Qisman",
  },
  paid: {
    bg: "bg-green-100",
    text: "text-green-800",
    label: "To'langan",
  },
  sold: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    label: "Sotilgan",
  },
  used: {
    bg: "bg-slate-100",
    text: "text-slate-800",
    label: "Ishlatilgan",
  },
};

export default function StatusBadge({ status, variant }: StatusBadgeProps) {
  const variants = variant ?? defaultVariants;
  const config = variants[status];

  if (!config) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
        {status}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
