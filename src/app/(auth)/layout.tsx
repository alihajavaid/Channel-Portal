import { cookies } from "next/headers";
import Image from "next/image";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const initialDark = (await cookies()).get("theme")?.value === "dark";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 dark:bg-slate-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle initialDark={initialDark} />
      </div>
      <Image src="/icon.png" alt="Channel Portal" width={56} height={56} priority />
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {children}
      </div>
    </div>
  );
}
