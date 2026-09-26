"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, ImageUp, LoaderCircle, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * IDENTITAS WEBSITE → Favicon / Icon Browser (Website Publik → Pengaturan Website).
 * Disimpan di kolom existing public_site_settings.favicon_key → berlaku langsung untuk seluruh website publik.
 * Ganti / Kembali ke Default hanya mengubah referensi aktif; file lama di storage TIDAK dihapus.
 */
const API = "/api/public-site/admin/favicon";
const DEFAULT_FAVICON = "/favicon.svg";

export function FaviconManagement() {
  const [state, setState] = useState<{ hasFavicon: boolean; href: string } | null>(null);
  const [busy, setBusy] = useState<"" | "upload" | "reset">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(API, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Favicon belum dapat dimuat.");
    return data as { hasFavicon: boolean; href: string };
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().then((data) => { if (!cancelled) { setState(data); setPreviewFailed(false); } })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Favicon belum dapat dimuat."); });
    return () => { cancelled = true; };
  }, [load]);

  async function upload(file: File) {
    setBusy("upload"); setError(""); setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(API, { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error || "Favicon belum dapat diunggah."); return; }
      setState({ hasFavicon: true, href: data.href });
      setPreviewFailed(false);
      setMessage("Favicon baru aktif di seluruh website publik. Muat ulang tab website untuk melihatnya.");
    } catch {
      setError("Favicon belum dapat diunggah. Periksa koneksi lalu coba lagi.");
    } finally { setBusy(""); }
  }

  async function reset() {
    setBusy("reset"); setError(""); setMessage("");
    try {
      const response = await fetch(API, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error || "Favicon belum dapat dikembalikan ke default."); return; }
      setState({ hasFavicon: false, href: data.href || DEFAULT_FAVICON });
      setPreviewFailed(false);
      setMessage("Website kembali memakai favicon default TDA.");
    } catch {
      setError("Favicon belum dapat dikembalikan ke default.");
    } finally { setBusy(""); }
  }

  const src = !state || previewFailed ? DEFAULT_FAVICON : state.href;

  return (
    <section className="rounded-2xl border bg-white p-6" data-testid="favicon-settings">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Identitas Website — Favicon / Icon Browser</h2>
          <p className="mt-1 text-sm text-muted-foreground">Icon kecil yang tampil di tab browser dan bookmark untuk seluruh website publik.</p>
        </div>
        {state ? (
          <Badge variant={state.hasFavicon ? "default" : "secondary"} data-testid="favicon-status">
            {state.hasFavicon ? "Custom" : "Default"}
          </Badge>
        ) : null}
      </div>

      {!state && !error ? <div className="mt-5 h-24 animate-pulse rounded-xl bg-muted" data-testid="favicon-loading" /> : null}

      {state ? (
        <div className="mt-5 grid gap-5 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex items-center gap-4" data-testid="favicon-preview">
            <div className="grid size-20 place-items-center rounded-xl border bg-muted/40">
              {/* eslint-disable-next-line @next/next/no-img-element -- preview favicon kecil (SVG/ICO/PNG) tidak lewat optimizer */}
              <img src={src} alt="Preview favicon" width={48} height={48} className="size-12 object-contain" data-testid="favicon-preview-image"
                onError={() => setPreviewFailed(true)} />
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element -- simulasi ukuran tab browser 16px */}
              <img src={src} alt="" width={16} height={16} className="size-4 object-contain" />
              <span className="truncate">TDA Pekanbaru</span>
              <Globe className="size-3 shrink-0 opacity-40" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm" disabled={busy !== ""}>
                <label className="cursor-pointer" data-testid="favicon-upload-button">
                  {busy === "upload" ? <LoaderCircle className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
                  {state.hasFavicon ? "Ganti favicon" : "Unggah favicon"}
                  <input type="file" accept=".png,.svg,.ico,image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon" className="sr-only"
                    data-testid="favicon-input" disabled={busy !== ""}
                    onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} />
                </label>
              </Button>
              {state.hasFavicon ? (
                <Button type="button" variant="outline" size="sm" disabled={busy !== ""} onClick={() => void reset()} data-testid="favicon-reset-button">
                  {busy === "reset" ? <LoaderCircle className="size-4 animate-spin" /> : <Undo2 className="size-4" />}Kembali ke Default
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="favicon-helper">
              Gunakan icon persegi untuk hasil terbaik di browser. Format PNG, SVG, atau ICO — maks. 512 KB. Favicon lama tetap disimpan (tidak dihapus).
            </p>
            {previewFailed && state.hasFavicon ? (
              <p className="text-xs text-amber-700" data-testid="favicon-fallback-note">File favicon custom tidak dapat dibuka — website otomatis memakai favicon default.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status" data-testid="favicon-message">{message}</p> : null}
      {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert" data-testid="favicon-error">{error}</p> : null}
    </section>
  );
}
