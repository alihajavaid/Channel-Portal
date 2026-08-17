"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/client/api";

type SearchItem = { id: string; label: string; sublabel: string; href: string };
type SearchResults = { prospects: SearchItem[]; partners: SearchItem[]; customers: SearchItem[]; users: SearchItem[] };

const EMPTY: SearchResults = { prospects: [], partners: [], customers: [], users: [] };
const GROUP_LABELS: Record<keyof SearchResults, string> = {
  prospects: "Prospects",
  partners: "Partners",
  customers: "Customers",
  users: "Users",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(EMPTY);
      return;
    }
    const handle = setTimeout(async () => {
      const { ok, data } = await apiJson<{ data?: SearchResults }>(`/api/search?q=${encodeURIComponent(query)}`);
      if (ok) setResults(data.data ?? EMPTY);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const groups = (Object.keys(GROUP_LABELS) as (keyof SearchResults)[]).filter((k) => results[k].length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          else if (e.key === "Enter") {
            const first = groups[0] && results[groups[0]][0];
            if (first) go(first.href);
          }
        }}
        placeholder="Search…"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 top-full z-30 mt-1 w-80 max-w-[90vw] rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {groups.length === 0 ? (
            <p className="px-2 py-2 text-sm text-slate-500 dark:text-slate-400">No results.</p>
          ) : (
            groups.map((group) => (
              <div key={group} className="mb-1 last:mb-0">
                <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {GROUP_LABELS[group]}
                </div>
                {results[group].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => go(item.href)}
                    className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.label}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{item.sublabel}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
