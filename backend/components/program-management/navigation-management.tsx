"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, LoaderCircle, Monitor, Pencil, Plus, Power, Smartphone, Trash2 } from "lucide-react";
import { PublicHeader } from "@/components/public-site/public-header";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  NAV_HREF_MAX, NAV_LABEL_MAX, NAV_LOCATIONS, NAV_SORT_MAX, NAV_SORT_MIN,
  resolvePublicNavigation, validateNavigationInput,
  type NavigationInput, type NavigationLocation, type NavigationRow,
} from "@/lib/public-navigation";
import { FALLBACK_HEADER_CTA, FALLBACK_SITE } from "@/lib/public-site-content";

/*
 * Editor Navigasi Website Publik (Website 02A).
 * - Sumber: public_navigation_items (schema existing). Tanpa draft di DB: is_active 1 = tampil publik, 0 = tidak.
 * - Preview = simulasi LOKAL dari state form (tanpa request tulis) memakai PublicHeader & aturan yang sama
 *   dengan website publik (lib/public-navigation.ts).
 */

type FormState = { location: NavigationLocation; label: string; href: string; sortOrder: string; isActive: boolean };
type FieldErrors = Partial<Record<keyof NavigationInput, string>>;

const API = "/api/public-site/admin/navigation";
const PREVIEW_PATHS = [
  { value: "/", label: "Beranda (/)" },
  { value: "/tentang", label: "Profil (/tentang)" },
  { value: "/program", label: "Program (/program)" },
  { value: "/program/contoh", label: "Detail Program (/program/…)" },
  { value: "/kalender", label: "Kalender (/kalender)" },
];

async function request<T>(method: string, body?: unknown): Promise<T> {
  const response = await fetch(API, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "Permintaan gagal.") as Error & { fieldErrors?: FieldErrors };
    error.fieldErrors = payload.fieldErrors;
    throw error;
  }
  return payload as T;
}

function sortRows(rows: NavigationRow[]) {
  return [...rows].sort((a, b) =>
    (a.location === b.location ? 0 : a.location === "header" ? -1 : 1) ||
    Number(a.sortOrder) - Number(b.sortOrder) || Number(a.id) - Number(b.id));
}

function PreviewFrame({ title, icon: Icon, children, testId }: { title: string; icon: typeof Monitor; children: React.ReactNode; testId: string }) {
  return (
    <div data-testid={testId} className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground"><Icon className="size-4" />{title}</p>
      {children}
    </div>
  );
}

export default function NavigationManagement({ siteName }: { siteName?: string }) {
  const [items, setItems] = useState<NavigationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({ location: "header", label: "", href: "", sortOrder: "10", isActive: false });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NavigationRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewPath, setPreviewPath] = useState("/");

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const payload = await request<{ items: NavigationRow[] }>("GET");
      setItems(payload.items || []);
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "Menu navigasi belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    request<{ items: NavigationRow[] }>("GET")
      .then((payload) => { if (!cancelled) setItems(payload.items || []); })
      .catch((reason) => { if (!cancelled) setLoadError(reason instanceof Error ? reason.message : "Menu navigasi belum dapat dimuat."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const sorted = useMemo(() => sortRows(items), [items]);

  // Preview LOKAL: gabungkan state form (belum disimpan) ke daftar tersimpan. Tidak ada request tulis.
  const previewRows = useMemo<NavigationRow[]>(() => {
    if (!formOpen) return items;
    const draft: NavigationRow = {
      id: editingId ?? Number.MAX_SAFE_INTEGER, location: form.location, label: form.label, href: form.href.trim(),
      parentId: editingId ? items.find((item) => item.id === editingId)?.parentId ?? null : null,
      sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive ? 1 : 0,
    };
    return editingId ? items.map((item) => (item.id === editingId ? draft : item)) : [...items, draft];
  }, [formOpen, items, editingId, form]);

  const preview = useMemo(() => resolvePublicNavigation(previewRows), [previewRows]);
  const live = useMemo(() => resolvePublicNavigation(items), [items]);
  const previewNavigation = { header: preview.header, footer: preview.footer, headerCta: { ...FALLBACK_HEADER_CTA } };

  function openCreate() {
    const headerSorts = items.filter((item) => item.location === "header").map((item) => Number(item.sortOrder) || 0);
    const next = Math.min(NAV_SORT_MAX, (headerSorts.length ? Math.max(...headerSorts) : 0) + 10);
    setEditingId(null);
    setForm({ location: "header", label: "", href: "", sortOrder: String(next), isActive: false });
    setFieldErrors({});
    setError("");
    setMessage("");
    setFormOpen(true);
  }

  function openEdit(item: NavigationRow) {
    setEditingId(item.id);
    setForm({ location: item.location, label: item.label, href: item.href, sortOrder: String(item.sortOrder), isActive: Number(item.isActive) === 1 });
    setFieldErrors({});
    setError("");
    setMessage("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingId(null);
    setFieldErrors({});
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = validateNavigationInput({ ...form });
    if (!parsed.ok) {
      setFieldErrors(parsed.errors);
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = await request<{ item: NavigationRow }>(editingId ? "PUT" : "POST", editingId ? { id: editingId, ...parsed.value } : parsed.value);
      setItems((current) => (editingId ? current.map((item) => (item.id === editingId ? payload.item : item)) : [...current, payload.item]));
      setMessage(editingId ? "Menu berhasil disimpan." : "Menu berhasil ditambahkan.");
      setFormOpen(false);
      setEditingId(null);
      setFieldErrors({});
    } catch (reason) {
      const typed = reason as Error & { fieldErrors?: FieldErrors };
      if (typed.fieldErrors) setFieldErrors(typed.fieldErrors);
      setError(typed.message || "Menu belum dapat disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: NavigationRow) {
    setBusyId(item.id);
    setError("");
    setMessage("");
    try {
      const next = Number(item.isActive) !== 1;
      const payload = await request<{ item: NavigationRow }>("PATCH", { id: item.id, isActive: next });
      setItems((current) => current.map((row) => (row.id === item.id ? payload.item : row)));
      setMessage(next ? `Menu "${item.label}" diaktifkan dan tampil di website publik.` : `Menu "${item.label}" dinonaktifkan dan tidak tampil di website publik.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Status menu belum dapat diperbarui.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      await request("DELETE", { id: deleteTarget.id });
      setItems((current) => current.filter((row) => row.id !== deleteTarget.id));
      setMessage(`Menu "${deleteTarget.label}" dihapus. Halaman tujuannya tidak ikut terhapus.`);
      setDeleteTarget(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Menu belum dapat dihapus.");
    } finally {
      setDeleting(false);
    }
  }

  const stepSort = (delta: number) =>
    setForm((current) => ({ ...current, sortOrder: String(Math.min(NAV_SORT_MAX, Math.max(NAV_SORT_MIN, (Number(current.sortOrder) || 0) + delta))) }));

  // Klik di dalam preview tidak boleh meninggalkan editor (perubahan belum disimpan).
  const blockLinks = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest("a")) event.preventDefault();
  };

  return (
    <div className="space-y-6" data-testid="navigation-cms">
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Menu Navigasi Website</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Menu <strong>Aktif</strong> langsung tampil di header/footer website publik setelah disimpan. Menu <strong>Nonaktif</strong> tidak tampil.
              Bila tidak ada menu header aktif, website memakai menu bawaan (Profil, Program, Kalender).
            </p>
          </div>
          <Button onClick={openCreate} data-testid="nav-add-button"><Plus />Tambah Menu</Button>
        </div>

        {message ? <div data-testid="nav-message" role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}
        {error ? <div data-testid="nav-error" role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <div className="mt-5">
          {loading ? (
            <div data-testid="nav-loading" className="space-y-2">
              {[0, 1, 2].map((key) => <div key={key} className="h-16 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : loadError ? (
            <div data-testid="nav-load-error" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {loadError} <Button variant="outline" size="sm" className="ml-2" onClick={() => void load()} data-testid="nav-retry-button">Coba lagi</Button>
            </div>
          ) : sorted.length === 0 ? (
            <div data-testid="nav-empty" className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Belum ada menu tersimpan. Website publik saat ini memakai menu bawaan. Klik <strong>Tambah Menu</strong> untuk mulai mengelola navigasi.
            </div>
          ) : (
            <ul className="divide-y rounded-xl border" data-testid="nav-list">
              {sorted.map((item) => {
                const active = Number(item.isActive) === 1;
                return (
                  <li key={item.id} data-testid={`nav-item-${item.id}`} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span data-testid={`nav-item-${item.id}-label`} className="font-semibold">{item.label}</span>
                        <span data-testid={`nav-item-${item.id}-status`} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {active ? "Aktif" : "Nonaktif"}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{item.location === "header" ? "Header" : "Footer"}</span>
                        {item.parentId ? <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Sub-menu (tidak ditampilkan)</span> : null}
                      </div>
                      <p className="mt-1 break-all text-sm text-muted-foreground">
                        <span data-testid={`nav-item-${item.id}-href`}>{item.href}</span> · Urutan <span data-testid={`nav-item-${item.id}-sort`}>{item.sortOrder}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)} data-testid={`nav-item-${item.id}-edit-button`}><Pencil />Edit</Button>
                      <Button variant="outline" size="sm" disabled={busyId === item.id} onClick={() => void toggleActive(item)} data-testid={`nav-item-${item.id}-toggle-button`}>
                        {busyId === item.id ? <LoaderCircle className="animate-spin" /> : <Power />}{active ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setDeleteTarget(item)} data-testid={`nav-item-${item.id}-delete-button`}><Trash2 />Hapus</Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {formOpen ? (
        <form onSubmit={save} noValidate className="rounded-2xl border bg-white p-6" data-testid="nav-form">
          <h3 className="text-base font-bold">{editingId ? "Edit Menu" : "Tambah Menu"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Perubahan baru tersimpan setelah menekan <strong>Simpan</strong>. Lihat hasilnya di Preview di bawah terlebih dahulu.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="nav-label">Label Menu</Label>
              <Input id="nav-label" data-testid="nav-form-label-input" value={form.label} maxLength={NAV_LABEL_MAX} aria-invalid={Boolean(fieldErrors.label)}
                placeholder="Contoh: Tentang" onChange={(event) => setForm({ ...form, label: event.target.value })} />
              {fieldErrors.label ? <p data-testid="nav-form-label-error" className="text-xs text-red-600">{fieldErrors.label}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nav-href">URL / Path</Label>
              <Input id="nav-href" data-testid="nav-form-href-input" value={form.href} maxLength={NAV_HREF_MAX} aria-invalid={Boolean(fieldErrors.href)}
                placeholder="/tentang atau https://…" onChange={(event) => setForm({ ...form, href: event.target.value })} />
              {fieldErrors.href ? <p data-testid="nav-form-href-error" className="text-xs text-red-600">{fieldErrors.href}</p>
                : <p className="text-xs text-muted-foreground">Halaman internal diawali “/”, tautan eksternal diawali “https://”.</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nav-sort">Urutan</Label>
              <div className="flex items-center gap-2">
                <Input id="nav-sort" data-testid="nav-form-sort-input" type="number" inputMode="numeric" min={NAV_SORT_MIN} max={NAV_SORT_MAX} step={1}
                  className="w-32" value={form.sortOrder} aria-invalid={Boolean(fieldErrors.sortOrder)} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} />
                <Button type="button" variant="outline" size="icon-sm" aria-label="Naikkan urutan (lebih awal)" onClick={() => stepSort(-10)} data-testid="nav-form-sort-up"><ArrowUp /></Button>
                <Button type="button" variant="outline" size="icon-sm" aria-label="Turunkan urutan (lebih akhir)" onClick={() => stepSort(10)} data-testid="nav-form-sort-down"><ArrowDown /></Button>
              </div>
              {fieldErrors.sortOrder ? <p data-testid="nav-form-sort-error" className="text-xs text-red-600">{fieldErrors.sortOrder}</p>
                : <p className="text-xs text-muted-foreground">Angka kecil tampil lebih dulu ({NAV_SORT_MIN}–{NAV_SORT_MAX}).</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nav-location">Lokasi</Label>
              <NativeSelect id="nav-location" data-testid="nav-form-location-select" value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value === "footer" ? "footer" : "header" })}>
                {NAV_LOCATIONS.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
              </NativeSelect>
            </div>
            <div className="flex items-center gap-3 md:col-span-2">
              <Switch id="nav-active" data-testid="nav-form-active-switch" checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
              <Label htmlFor="nav-active">{form.isActive ? "Aktif — tampil di website publik setelah disimpan" : "Nonaktif — tidak tampil di website publik"}</Label>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="submit" disabled={saving} data-testid="nav-form-save-button">{saving ? <LoaderCircle className="animate-spin" /> : null}{editingId ? "Simpan Perubahan" : "Simpan Menu"}</Button>
            <Button type="button" variant="outline" disabled={saving} onClick={closeForm} data-testid="nav-form-cancel-button">Batal</Button>
          </div>
        </form>
      ) : null}

      <div className="rounded-2xl border bg-white p-6" data-testid="nav-preview">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold"><Eye className="size-4" />Preview Navigasi</h3>
            <p className="mt-1 text-sm text-muted-foreground" data-testid="nav-preview-mode">
              {formOpen ? "Simulasi dengan isian form yang BELUM disimpan (tidak ada data yang ditulis)." : "Tampilan navigasi yang sedang tampil di website publik."}
              {preview.headerFromFallback ? " Header memakai menu bawaan karena belum ada menu header aktif." : ""}
            </p>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="nav-preview-path" className="text-xs">Simulasi halaman aktif</Label>
            <NativeSelect id="nav-preview-path" size="sm" data-testid="nav-preview-path-select" value={previewPath} onChange={(event) => setPreviewPath(event.target.value)}>
              {PREVIEW_PATHS.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
            </NativeSelect>
          </div>
        </div>

        <div className="tda-public mt-5 space-y-6 bg-transparent" onClickCapture={blockLinks}>
          <PreviewFrame title="Desktop Header" icon={Monitor} testId="nav-preview-desktop">
            <div className="overflow-x-auto rounded-xl border bg-tda-bg-soft">
              <div className="min-w-[860px]">
                <PublicHeader siteName={siteName || FALLBACK_SITE.siteName} navigation={previewNavigation} current={previewPath} mode="desktop" idPrefix="preview-desktop-" />
              </div>
            </div>
          </PreviewFrame>
          <PreviewFrame title="Mobile Menu" icon={Smartphone} testId="nav-preview-mobile">
            <div className="w-[360px] max-w-full overflow-hidden rounded-[28px] border bg-tda-bg-soft pb-[320px]">
              <PublicHeader siteName={siteName || FALLBACK_SITE.siteName} navigation={previewNavigation} current={previewPath} mode="mobile" idPrefix="preview-mobile-" />
            </div>
          </PreviewFrame>
          {formOpen ? (
            <p className="text-xs text-muted-foreground" data-testid="nav-preview-live-summary">
              Saat ini tampil di publik: {live.header.map((link) => link.label).join(" · ")}{live.headerFromFallback ? " (menu bawaan)" : ""}.
            </p>
          ) : null}
        </div>
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent data-testid="nav-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus menu ini?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-sm">
                <p>Label: <strong className="text-foreground" data-testid="nav-delete-label">{deleteTarget?.label}</strong></p>
                <p>URL: <strong className="break-all text-foreground" data-testid="nav-delete-href">{deleteTarget?.href}</strong></p>
                <p className="pt-2">Hanya item menu yang dihapus. Halaman tujuan tetap ada.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} data-testid="nav-delete-cancel-button">Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleting} data-testid="nav-delete-confirm-button"
              onClick={(event) => { event.preventDefault(); void confirmDelete(); }}>
              {deleting ? <LoaderCircle className="animate-spin" /> : null}Hapus Menu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
