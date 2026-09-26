"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageUp, LoaderCircle, Monitor, Rocket, Save, Smartphone, Trash2, Undo2 } from "lucide-react";
import { PublicHeader } from "@/components/public-site/public-header";
import { BrandLogo } from "@/components/public-site/brand-logo";
import { ScaledPreview } from "@/components/program-management/scaled-preview";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublicNavigation } from "@/db/public-homepage";
import { LOGO_ALT_MAX, LOGO_SIZES, STATIC_LOGO_SRC, resolveHeaderLogo, type HeaderConfig } from "@/lib/public-logo";

/*
 * LOGO WEBSITE (Website Publik → Pengaturan Website).
 * - Logo Utama: public_site_settings.logo_key — berlaku langsung untuk Header/Footer yang memakai "Logo Utama".
 * - Logo Header: inherit / custom (section "header"), alt text, ukuran preset. Edit → Simpan Draft → Preview → Publish.
 * Footer punya pengaturan logo sendiri di tab Footer (Identitas → Logo Footer).
 */
type SectionMeta = { id: number; status: string; publishedAt: string | null; hasImage: boolean; publishedHasImage: boolean; hasUnpublishedChanges: boolean };
type Payload = { section: SectionMeta | null; draft: HeaderConfig; published: HeaderConfig | null; global: { hasLogo: boolean; src: string | null }; siteName: string; navigation: PublicNavigation };

const HEADER_API = "/api/public-site/admin/header";
const LOGO_API = "/api/public-site/admin/logo";

function Pill<T extends string>({ value, current, onClick, children, testId }: { value: T; current: T; onClick: (v: T) => void; children: React.ReactNode; testId: string }) {
  const active = value === current;
  return (
    <button type="button" role="radio" aria-checked={active} onClick={() => onClick(value)} data-testid={testId}
      className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${active ? "border-primary bg-primary text-white" : "bg-white hover:bg-muted"}`}>{children}</button>
  );
}

export default function LogoManagement() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [config, setConfig] = useState<HeaderConfig | null>(null);
  const [savedJson, setSavedJson] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [source, setSource] = useState<"draft" | "live">("draft");
  const [version, setVersion] = useState(0);

  const load = useCallback(async (keepLocal?: HeaderConfig | null) => {
    setLoadError("");
    try {
      const response = await fetch(HEADER_API);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pengaturan logo belum dapat dimuat.");
      setPayload(data);
      setSavedJson(data.section ? JSON.stringify(data.draft) : "");
      setConfig(keepLocal ?? data.draft);
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "Pengaturan logo belum dapat dimuat.");
    }
  }, []);
  useEffect(() => {
    // Muat awal: setState hanya di callback promise (bukan sinkron di body effect).
    let cancelled = false;
    fetch(HEADER_API).then(async (response) => {
      const data = await response.json();
      if (cancelled) return;
      if (!response.ok) { setLoadError(data.error || "Pengaturan logo belum dapat dimuat."); return; }
      setPayload(data);
      setSavedJson(data.section ? JSON.stringify(data.draft) : "");
      setConfig(data.draft);
    }).catch(() => { if (!cancelled) setLoadError("Pengaturan logo belum dapat dimuat."); });
    return () => { cancelled = true; };
  }, []);

  if (loadError) return <div data-testid="logo-load-error" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{loadError} <Button size="sm" variant="outline" className="ml-2" onClick={() => void load()}>Coba lagi</Button></div>;
  if (!payload || !config) return <div data-testid="logo-loading" className="h-40 animate-pulse rounded-2xl bg-muted" />;

  const section = payload.section;
  const dirty = JSON.stringify(config) !== savedJson;
  const globalSrc = payload.global.src ? `${payload.global.src}${payload.global.src.includes("?") ? "&" : "?"}r=${version}` : null;
  const draftCustom = section?.hasImage ? `/api/public-site/admin/section?id=${section.id}&v=${version}` : null;
  const liveCustom = section?.publishedHasImage ? `/api/public-site/image?section=header&slot=main&v=${version}` : null;
  const previewLogo = source === "draft"
    ? resolveHeaderLogo(config, payload.siteName, draftCustom, globalSrc)
    : resolveHeaderLogo(payload.published, payload.siteName, liveCustom, globalSrc);

  async function call(label: string, run: () => Promise<Response>, success: string, keep?: HeaderConfig | null) {
    setBusy(label); setError(""); setMessage("");
    try {
      const response = await run();
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error || "Aksi gagal."); return false; }
      setVersion((v) => v + 1);
      await load(keep);
      setMessage(success);
      return true;
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
      return false;
    } finally { setBusy(""); }
  }
  const upload = (target: "global" | "header", file: File) => {
    const form = new FormData();
    form.set("target", target);
    form.set("file", file);
    return call(`upload-${target}`, () => fetch(LOGO_API, { method: "POST", body: form }),
      target === "global" ? "Logo Utama diperbarui dan langsung berlaku untuk Header/Footer yang memakai Logo Utama." : "Logo khusus header terunggah ke DRAFT. Klik Publish agar tampil di website.",
      target === "header" && config ? { ...config, logo: { ...config.logo, mode: "custom" } } : config);
  };
  const remove = (target: "global" | "header") => call(`remove-${target}`,
    () => fetch(LOGO_API, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ target }) }),
    target === "global" ? "Logo Utama dihapus. Website memakai logo bawaan TDA sebagai pengaman." : "Draft header kembali memakai Logo Utama. Klik Publish agar berlaku.",
    target === "header" && config ? { ...config, logo: { ...config.logo, mode: "inherit" } } : config);
  const setLogo = (patch: Partial<HeaderConfig["logo"]>) => setConfig({ ...config, logo: { ...config.logo, ...patch } });

  const status = !section ? "Belum pernah disimpan — header memakai Logo Utama"
    : section.status === "published" ? (section.hasUnpublishedChanges ? "Published · ada perubahan draft belum dipublish" : "Published · tampil di website")
    : "Draft · belum tampil di website";
  const fileButton = (target: "global" | "header", label: string) => (
    <label className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold ${busy ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}>
      {busy === `upload-${target}` ? <LoaderCircle className="size-4 animate-spin" /> : <ImageUp className="size-4" />}{label}
      <input type="file" accept=".png,.jpg,.jpeg,.webp" className="sr-only" data-testid={`logo-${target}-input`} disabled={busy !== ""}
        onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(target, file); e.target.value = ""; }} />
    </label>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" data-testid="logo-management">
      <div className="space-y-6">
        <section className="rounded-2xl border bg-white p-6" data-testid="logo-global-card">
          <h2 className="text-lg font-bold">Logo Utama Website</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sumber logo default untuk Header dan Footer. Berlaku langsung setelah diunggah.</p>
          <div className="mt-4 grid h-24 place-items-center rounded-xl border bg-slate-50">
            <BrandLogo sources={[globalSrc ?? "", STATIC_LOGO_SRC]} alt="Logo Utama Website" width={176} height={80} className="h-20 w-44 object-contain" testId="logo-global-preview" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground" data-testid="logo-global-status">{payload.global.hasLogo ? "Logo Utama aktif." : "Belum diatur — website memakai logo bawaan TDA (pengaman)."}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {fileButton("global", payload.global.hasLogo ? "Ganti Logo Utama" : "Unggah Logo Utama")}
            {payload.global.hasLogo ? (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="outline" size="sm" disabled={busy !== ""} data-testid="logo-global-remove-button"><Trash2 />Hapus</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Logo Utama?</AlertDialogTitle>
                    <AlertDialogDescription>Header/Footer yang memakai Logo Utama akan menampilkan logo bawaan TDA. File logo tetap disimpan di storage (tidak dihapus).</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="logo-global-remove-cancel">Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void remove("global")} data-testid="logo-global-remove-confirm">Hapus Logo Utama</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">PNG/JPG/WebP maks. 5 MB. Otomatis diperkecil ke WebP (maks. 640 px) agar website ringan. Disarankan latar transparan.</p>
        </section>

        <section className="rounded-2xl border bg-white p-6" data-testid="logo-header-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Logo Header</h2>
              <p className="mt-1 text-sm"><span className="font-semibold">Status:</span> <span data-testid="logo-header-status">{status}</span>
                {dirty ? <span data-testid="logo-header-dirty" className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Perubahan belum disimpan</span> : null}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy !== ""} data-testid="logo-header-save-button"
                onClick={() => void call("save", () => fetch(HEADER_API, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ config }) }), "Draft header tersimpan. Website belum berubah sampai Publish.")}>
                {busy === "save" ? <LoaderCircle className="animate-spin" /> : <Save />}Simpan Draft</Button>
              <Button size="sm" variant="outline" disabled={busy !== "" || !section || dirty} title={dirty ? "Simpan draft terlebih dahulu" : undefined} data-testid="logo-header-publish-button"
                onClick={() => void call("publish", () => fetch(HEADER_API, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "publish" }) }), "Logo header dipublish ke seluruh halaman publik.")}>
                {busy === "publish" ? <LoaderCircle className="animate-spin" /> : <Rocket />}Publish</Button>
            </div>
          </div>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-1.5">
              <Label>Sumber logo</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" data-testid="logo-header-mode">
                <Pill value="inherit" current={config.logo.mode} onClick={(v) => setLogo({ mode: v })} testId="logo-header-mode-inherit">Gunakan Logo Utama</Pill>
                <Pill value="custom" current={config.logo.mode} onClick={(v) => setLogo({ mode: v })} testId="logo-header-mode-custom">Logo Khusus Header</Pill>
              </div>
            </div>
            {config.logo.mode === "custom" ? (
              <div className="grid gap-2 rounded-xl border bg-slate-50 p-3">
                <div className="grid h-16 place-items-center rounded-lg bg-white">
                  {draftCustom ? <BrandLogo sources={[draftCustom]} alt="Logo khusus header" width={130} height={56} className="h-12 w-28 object-contain" testId="logo-header-custom-thumb" />
                    : <span className="text-xs text-muted-foreground">Belum ada logo khusus header</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {fileButton("header", section?.hasImage ? "Ganti logo khusus" : "Unggah logo khusus")}
                  {section?.hasImage ? <Button variant="outline" size="sm" disabled={busy !== ""} onClick={() => void remove("header")} data-testid="logo-header-reset-button"><Undo2 />Kembali ke Logo Utama</Button> : null}
                </div>
              </div>
            ) : <p className="text-xs text-muted-foreground" data-testid="logo-header-inherit-note">Header mengikuti Logo Utama — otomatis ikut berubah bila Logo Utama diganti.</p>}
            <div className="grid gap-1.5">
              <Label htmlFor="logo-header-alt">Alt text</Label>
              <Input id="logo-header-alt" data-testid="logo-header-alt-input" value={config.logo.alt} maxLength={LOGO_ALT_MAX} placeholder={`Logo ${payload.siteName}`} onChange={(e) => setLogo({ alt: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Ukuran tampilan</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" data-testid="logo-header-size">
                {LOGO_SIZES.map((o) => <Pill key={o.value} value={o.value} current={config.logo.size} onClick={(v) => setLogo({ size: v })} testId={`logo-header-size-${o.value}`}>{o.label}</Pill>)}
              </div>
            </div>
          </div>
        </section>
        {message ? <div data-testid="logo-message" role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}
        {error ? <div data-testid="logo-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      </div>

      <section className="min-w-0 rounded-2xl border bg-white p-6" data-testid="logo-header-preview">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold">Preview Header</h3>
          <div className="flex flex-wrap gap-2">
            <Pill value="draft" current={source} onClick={setSource} testId="logo-preview-source-draft">Draft</Pill>
            <Pill value="live" current={source} onClick={setSource} testId="logo-preview-source-live">Live</Pill>
            <Pill value="desktop" current={device} onClick={setDevice} testId="logo-preview-desktop"><span className="inline-flex items-center gap-1"><Monitor className="size-4" />Desktop</span></Pill>
            <Pill value="mobile" current={device} onClick={setDevice} testId="logo-preview-mobile"><span className="inline-flex items-center gap-1"><Smartphone className="size-4" />Mobile</span></Pill>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{source === "draft" ? "Simulasi draft (termasuk yang belum disimpan). Tidak mengubah website." : "Versi yang sedang tampil di website publik."}</p>
        <div className={`tda-public mt-4 overflow-hidden rounded-xl border bg-slate-50 ${device === "mobile" ? "pb-56" : ""}`} onClickCapture={(e) => { if ((e.target as HTMLElement).closest("a,summary")) e.preventDefault(); }}>
          {device === "desktop" ? (
            <ScaledPreview width={1024} testId="logo-preview-desktop-frame">
              <PublicHeader key={`${source}-${version}`} siteName={payload.siteName} navigation={payload.navigation} current="/" mode="desktop" idPrefix="logo-preview-" logo={previewLogo} />
            </ScaledPreview>
          ) : (
            <div className="mx-auto w-[390px] max-w-full">
              <PublicHeader key={`${source}-${version}`} siteName={payload.siteName} navigation={payload.navigation} current="/" mode="mobile" idPrefix="logo-preview-" logo={previewLogo} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
