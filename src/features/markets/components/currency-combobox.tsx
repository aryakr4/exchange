"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Currency } from "@/features/markets/currencies";

/**
 * A searchable currency picker. The trigger shows the selected currency with
 * its flag; opening it reveals a filter box that matches on country name OR
 * code, so someone can type "Mexico" or "MXN" — whichever they think in.
 */
export function CurrencyCombobox({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (code: string) => void;
  options: Currency[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((c) => c.code === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (c) =>
        c.country.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [options, query]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus the filter box when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery("");
  }, [open]);

  function choose(code: string) {
    onChange(code);
    setOpen(false);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="border-input bg-background hover:bg-accent flex h-11 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="text-base leading-none">
            {selected?.flag ?? "🏳️"}
          </span>
          <span className="truncate">
            <span className="font-medium">{selected?.code ?? value}</span>
            {selected ? (
              <span className="text-muted-foreground ml-1.5 hidden sm:inline">
                {selected.country}
              </span>
            ) : null}
          </span>
        </span>
        <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      </button>

      {open ? (
        <div className="bg-popover absolute z-50 mt-1 w-full min-w-[15rem] overflow-hidden rounded-md border shadow-lg">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a country or code…"
              className="h-10 w-full bg-transparent text-sm outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="text-muted-foreground px-3 py-6 text-center text-sm">
                No match for “{query}”
              </li>
            ) : (
              filtered.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.code === value}
                    onClick={() => choose(c.code)}
                    className="hover:bg-accent flex w-full items-center gap-3 px-3 py-2 text-left text-sm"
                  >
                    <span aria-hidden="true" className="text-base leading-none">
                      {c.flag}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{c.code}</span>
                      <span className="text-muted-foreground ml-2">{c.country}</span>
                    </span>
                    <Check
                      className={cn(
                        "size-4 shrink-0 text-brand",
                        c.code === value ? "opacity-100" : "opacity-0"
                      )}
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
