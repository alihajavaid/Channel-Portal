import Link from "next/link";
import { requireSession } from "@/lib/authz/dal";
import { SignOutButton } from "@/components/SignOutButton";
import type { ModuleKey } from "@/lib/constants/modules";

const NAV_ITEMS: { href: string; label: string; module: ModuleKey }[] = [
  { href: "/dashboard", label: "Dashboard", module: "dashboard" },
  { href: "/prospects", label: "Prospects", module: "prospects" },
  { href: "/partners", label: "Partners", module: "partners" },
  { href: "/customers", label: "Customers", module: "customers" },
  { href: "/deliverables", label: "Deliverables", module: "deliverables" },
  { href: "/access", label: "Access Management", module: "access" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const { user } = session;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-semibold text-slate-900">Channel Portal</span>
          <nav className="flex items-center gap-4">
            {NAV_ITEMS.filter((item) => user[item.module]).map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-slate-600 hover:text-slate-900">
                {item.label}
              </Link>
            ))}
            <span className="text-sm text-slate-400">|</span>
            <span className="text-sm text-slate-600">{user.name}</span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
