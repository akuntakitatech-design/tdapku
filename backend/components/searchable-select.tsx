"use client";

import { useId, useMemo, useState } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { matchesSearch } from "@/components/search-field";

/**
 * SEARCHABLE DROPDOWN STANDAR BACKOFFICE — pengganti <select> untuk memilih RECORD/REFERENSI (Program, Event, Rekening, dll.).
 * - Kolom "Cari…" langsung fokus saat dibuka; filter multi-field (label + deskripsi + keywords), case-insensitive, trim, parsial.
 * - Keyboard: ↑/↓ pindah, Enter pilih, Esc tutup (cmdk + Radix Popover). Mobile: popover mengikuti lebar trigger, list bisa discroll.
 * - Nilai yang disimpan TIDAK berubah (string value yang sama dengan <option value> sebelumnya) → kontrak data/form tetap.
 * - Client-side: dipakai untuk daftar yang memang sudah dimuat penuh oleh halaman. Render dibatasi MAX_RENDER item.
 * Enum kecil (status, ya/tidak) TETAP memakai select biasa.
 */
export type SearchableOption = {
  value: string;
  label: string;
  /** Baris kedua (mis. divisi, bank). Ikut dicari. */
  description?: string;
  /** Kata kunci tambahan yang ikut dicari tetapi tidak ditampilkan. */
  keywords?: Array<string | number | null | undefined>;
  disabled?: boolean;
};

const MAX_RENDER = 100;

export function SearchableSelect({
  id, value, onChange, options, placeholder = "Pilih…", searchPlaceholder = "Cari…", emptyOption, testId,
  disabled = false, required = false, className = "", emptyText = "Tidak ada data yang cocok.", ariaLabel, name,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** Opsi "kosong" yang bisa dipilih (mis. "Semua rekening", "Transaksi Umum Program"). value biasanya "" / "all" / "0". */
  emptyOption?: { value: string; label: string };
  testId: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  emptyText?: string;
  ariaLabel?: string;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();

  const selected = options.find((option) => option.value === value) ?? (emptyOption && emptyOption.value === value ? emptyOption : null);
  const selectedDescription = selected && "description" in selected ? (selected as SearchableOption).description : undefined;
  const filtered = useMemo(
    () => options.filter((option) => matchesSearch(query, [option.label, option.description, ...(option.keywords ?? [])])),
    [options, query],
  );
  const visible = filtered.slice(0, MAX_RENDER);
  const showEmptyOption = emptyOption && !query.trim();

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className={cn("relative min-w-0", className)}>
      <Popover modal open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={ariaLabel}
            disabled={disabled}
            data-testid={testId}
            data-value={value}
            className={cn(
              "flex min-h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm",
              "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              open && "ring-2 ring-ring",
            )}
          >
            <span className={cn("min-w-0 flex-1", !selected || selected === emptyOption ? "text-muted-foreground" : "")}>
              <span className="block truncate">{selected ? selected.label : placeholder}</span>
              {selectedDescription ? <span className="block truncate text-xs text-muted-foreground">{selectedDescription}</span> : null}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="z-[200] w-[var(--radix-popover-trigger-width)] min-w-[min(18rem,calc(100vw-2rem))] max-w-[calc(100vw-1rem)] p-0"
          onOpenAutoFocus={(event) => { event.preventDefault(); (event.currentTarget as HTMLElement | null)?.querySelector("input")?.focus(); }}
        >
          <CommandPrimitive shouldFilter={false} loop className="flex flex-col overflow-hidden rounded-md" label={ariaLabel || searchPlaceholder}>
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 shrink-0 opacity-50" aria-hidden />
              <CommandPrimitive.Input
                value={query}
                onValueChange={setQuery}
                placeholder={searchPlaceholder}
                data-testid={`${testId}-search`}
                className="h-11 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} aria-label="Hapus pencarian" data-testid={`${testId}-search-clear`}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <CommandPrimitive.List id={listId} className="max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain p-1" data-testid={`${testId}-list`}>
              {showEmptyOption ? (
                <OptionRow option={emptyOption} selected={value === emptyOption.value} onSelect={choose} testId={`${testId}-option-empty`} />
              ) : null}
              {visible.map((option) => (
                <OptionRow key={option.value} option={option} selected={option.value === value} onSelect={choose} testId={`${testId}-option-${option.value}`} />
              ))}
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground" data-testid={`${testId}-empty`}>{emptyText}</p>
              ) : null}
              {filtered.length > MAX_RENDER ? (
                <p className="px-3 py-2 text-center text-xs text-muted-foreground">Menampilkan {MAX_RENDER} dari {filtered.length} — ketik untuk mempersempit.</p>
              ) : null}
            </CommandPrimitive.List>
          </CommandPrimitive>
        </PopoverContent>
      </Popover>
      {required ? (
        // Validasi form bawaan browser tetap berjalan seperti <select required> sebelumnya.
        <input tabIndex={-1} aria-hidden name={name} value={value && value !== emptyOption?.value ? value : ""} required onChange={() => undefined}
          onInvalid={() => setOpen(true)}
          className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0" />
      ) : null}
    </div>
  );
}

function OptionRow({ option, selected, onSelect, testId }: {
  option: SearchableOption | { value: string; label: string }; selected: boolean; onSelect: (value: string) => void; testId: string;
}) {
  const description = "description" in option ? option.description : undefined;
  const disabled = "disabled" in option ? option.disabled : false;
  return (
    <CommandPrimitive.Item
      value={`opt-${option.value}`}
      disabled={disabled}
      onSelect={() => onSelect(option.value)}
      data-testid={testId}
      className="flex cursor-pointer items-start gap-2 rounded-sm px-2 py-2 text-sm outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    >
      <Check className={cn("mt-0.5 size-4 shrink-0", selected ? "opacity-100" : "opacity-0")} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block break-words font-medium">{option.label}</span>
        {description ? <span className="block break-words text-xs text-muted-foreground">{description}</span> : null}
      </span>
    </CommandPrimitive.Item>
  );
}
