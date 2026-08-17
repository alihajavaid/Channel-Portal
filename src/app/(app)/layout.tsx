import { cookies } from "next/headers";
import { requireSession } from "@/lib/authz/dal";
import { AppNav } from "@/components/AppNav";
import type { ModuleKey } from "@/lib/constants/modules";

const NAV_ITEMS: { href: string; label: string; module: ModuleKey }[] = [
  { href: "/dashboard", label: "Dashboard", module: "dashboard" },
  { href: "/prospects", label: "Prospects", module: "prospects" },
  { href: "/partners", label: "Partners", module: "partners" },
  { href: "/customers", label: "Customers", module: "customers" },
  { href: "/access", label: "Access Management", module: "access" },
  { href: "/activity", label: "Activity Log", module: "access" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const { user } = session;
  const initialDark = (await cookies()).get("theme")?.value === "dark";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppNav
        items={NAV_ITEMS.filter((item) => user[item.module])}
        userName={user.name}
        initialDark={initialDark}
      />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
