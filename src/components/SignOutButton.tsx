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
    <button onClick={onClick} className="text-sm text-slate-600 hover:text-slate-900">
      Sign out
    </button>
  );
}
