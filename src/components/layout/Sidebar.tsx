"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Train,
  Key,
  Users,
  DollarSign,
  ShoppingCart,
  Warehouse,
  BarChart3,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Bosh sahifa", icon: LayoutDashboard },
  { href: "/wagons", label: "Vagonlar", icon: Train },
  { href: "/codes", label: "Kodlar", icon: Key },
  { href: "/partners", label: "Hamkorlar", icon: Users },
  { href: "/cash", label: "Kassa", icon: DollarSign },
  { href: "/sales", label: "Savdo", icon: ShoppingCart },
  { href: "/warehouse", label: "Ombor", icon: Warehouse },
  { href: "/reports", label: "Hisobotlar", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-60 min-h-screen bg-slate-900 flex flex-col">
      <div className="px-5 py-6">
        <h1 className="text-white font-bold text-lg leading-tight">Wood ERP</h1>
        <p className="text-slate-400 text-xs mt-1">Yog&apos;och savdo tizimi</p>
      </div>

      <nav className="flex-1 px-3 pb-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
