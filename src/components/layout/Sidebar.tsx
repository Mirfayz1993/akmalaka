"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n";
import {
  Train,
  MapPin,
  QrCode,
  DollarSign,
  BookOpen,
  Users,
  BarChart3,
  Home,
  Handshake,
  TrendingUp,
  Globe,
} from "lucide-react";

const navItems = [
  { href: "/", icon: Home, key: "dashboard" as const },
  { href: "/wagons", icon: Train, key: "wagons" as const },
  { href: "/logistics", icon: MapPin, key: "logistics" as const },
  { href: "/codes", icon: QrCode, key: "codes" as const },
  { href: "/sales", icon: TrendingUp, key: "sales" as const },
  { href: "/cash", icon: DollarSign, key: "cash" as const },
  { href: "/debts", icon: BookOpen, key: "debts" as const },
  { href: "/clients", icon: Users, key: "clients" as const },
  { href: "/partners", icon: Handshake, key: "partners" as const },
  { href: "/currency", icon: Globe, key: "currency" as const },
  { href: "/reports", icon: BarChart3, key: "reports" as const },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold">Wood ERP</h1>
        <p className="text-slate-400 text-sm mt-1">
          {locale === "uz" ? "Yog'och savdo tizimi" : "Система торговли древесиной"}
        </p>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={18} />
              <span>{t.nav[item.key]}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-700">
        <div className="flex gap-2">
          <button
            onClick={() => setLocale("uz")}
            className={`flex-1 py-1.5 text-xs rounded ${
              locale === "uz"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            O&apos;zbekcha
          </button>
          <button
            onClick={() => setLocale("ru")}
            className={`flex-1 py-1.5 text-xs rounded ${
              locale === "ru"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Русский
          </button>
        </div>
      </div>
    </aside>
  );
}
