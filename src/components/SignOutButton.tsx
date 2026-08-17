"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";

export function SignOutButton() {
  const router = useRouter();

  async function onClick() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      className="ml-3 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
    >
      Sign out
    </button>
  );
}
