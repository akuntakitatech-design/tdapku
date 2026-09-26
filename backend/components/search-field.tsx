"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Field pencarian standar Backoffice: ikon Search, tombol hapus (X), Esc untuk mengosongkan,
 * aman saat kosong. Pencocokan dilakukan oleh pemanggil (lihat `matchesSearch`).
 */
export function SearchField({ value, onChange, placeholder, testId, className = "", label }: {
  value: string; onChange: (value: string) => void; placeholder: string; testId: string; className?: string; label?: string;
}) {
  return (
    <label className={`relative block min-w-0 ${className}`}>
      <span className="sr-only">{label || placeholder}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Escape" && value) { event.preventDefault(); onChange(""); } }}
        placeholder={placeholder}
        aria-label={label || placeholder}
        data-testid={testId}
        className="h-10 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button type="button" onClick={() => onChange("")} aria-label="Hapus pencarian" data-testid={`${testId}-clear`}
          className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-4" />
        </button>
      ) : null}
    </label>
  );
}

/** Normalisasi keyword: trim + lowercase (id-ID). */
export function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("id-ID");
}

/** true bila keyword kosong atau salah satu field mengandung keyword (case-insensitive). */
export function matchesSearch(keyword: string, fields: Array<string | number | null | undefined>) {
  const needle = normalizeSearch(keyword);
  if (!needle) return true;
  return fields.some((field) => field !== null && field !== undefined && String(field).toLocaleLowerCase("id-ID").includes(needle));
}

/** Nilai yang ditunda (debounce) — untuk pencarian server-side. */
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Empty state pencarian: bedakan "tidak ada hasil" dari "belum ada data". */
export function SearchEmptyState({ onClear, testId, message = "Tidak ada hasil untuk pencarian ini." }: { onClear: () => void; testId: string; message?: string }) {
  return (
    <div className="p-10 text-center" data-testid={testId}>
      <p className="text-sm font-semibold">{message}</p>
      <button type="button" onClick={onClear} data-testid={`${testId}-clear`}
        className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <X className="size-4" /> Hapus pencarian
      </button>
    </div>
  );
}
