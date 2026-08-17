"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { GlobalSearch } from "@/components/GlobalSearch";
import { SettingsIcon, MenuIcon, XIcon } from "@/components/ui/icons";
import type { ModuleKey } from "@/lib/constants/modules";

type NavItem = { href: string; label: string; module: ModuleKey };

export function AppNav({
  items,
  userName,
  initialDark,
}: {
  items: NavItem[];
  userName: string;
  initialDark: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function linkClass(href: string) {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return `rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-brand/10 text-brand dark:bg-brand/20"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    }`;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <Image src="/icon.png" alt="" width={28} height={28} priority />
          <span className="font-semibold text-slate-900 dark:text-slate-100">Channel Portal</span>
        </Link>
        <div className="hidden flex-1 justify-center md:flex">
          <GlobalSearch />
        </div>

        {/* Desktop nav */}
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
          <span className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <Link href="/settings" aria-label="Account settings" className={linkClass("/settings").replace("px-2.5 py-1.5", "p-1.5")}>
            <SettingsIcon className="h-4 w-4" />
          </Link>
          <ThemeToggle initialDark={initialDark} />
          <span className="ml-1 text-sm text-slate-600 dark:text-slate-400">{userName}</span>
          <SignOutButton />
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="ml-auto rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
        >
          {mobileOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
          <div className="mb-3 md:hidden">
            <GlobalSearch />
          </div>
          <nav className="flex flex-col gap-1">
            {items.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={linkClass(item.href)}>
                {item.label}
              </Link>
            ))}
            <Link href="/settings" onClick={() => setMobileOpen(false)} className={linkClass("/settings")}>
              Account Settings
            </Link>
          </nav>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
            <span className="text-sm text-slate-600 dark:text-slate-400">{userName}</span>
            <div className="flex items-center gap-2">
              <ThemeToggle initialDark={initialDark} />
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
