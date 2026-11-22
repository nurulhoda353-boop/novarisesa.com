"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus2, LogOut, Table2 } from "lucide-react";
import { useAuth } from "./Auth";

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, canManage, signOut } = useAuth();
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Muqeem Records", icon: Table2, active: pathname === "/" || pathname.startsWith("/records") },
    ...(canManage ? [{ href: "/new", label: "Entry Muqeem", icon: FilePlus2, active: pathname === "/new" }] : []),
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/novarise-white.png" alt="NOVARISE" />
          <p className="sidebar-title">Muqeem Control</p>
        </div>
        <nav className="nav">
          {items.map(({ href, label, icon: Icon, active }) => (
            <Link key={href} href={href} className={active ? "active" : ""}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">{user.full_name}</div>
          <div className="mail">{user.email}</div>
          <button onClick={signOut}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
