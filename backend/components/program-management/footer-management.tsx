"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, ImageUp, LoaderCircle, Monitor, Plus, Rocket, Save, Smartphone, Trash2, Undo2 } from "lucide-react";
import { PublicFooter } from "@/components/public-site/public-footer";
import { PucukRebungAccent, Selembayung } from "@/components/public-site/motif";
import { BrandLogo } from "@/components/public-site/brand-logo";
import { MotifPreview } from "@/components/program-management/motif-preview";
import { ScaledPreview } from "@/components/program-management/scaled-preview";
import { STATIC_LOGO_SRC } from "@/lib/public-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { PublicCta, PublicHomepage } from "@/db/public-homepage";
import {
  FOOTER_LIMITS, FOOTER_MOTIFS, FOOTER_THEMES, SOCIAL_IN_SETTINGS, SOCIAL_LABELS, normalizeFooterConfig, resolveFooter,
  type ContactKey, type FooterColumn, type FooterConfig, type FooterLink,
} from "@/lib/public-footer";

/*
 * Editor FOOTER BUILDER (Website Publik → Footer).
 * Alur: Edit → Simpan Draft → Preview (desktop/mobile) → Publish. Website publik hanya membaca versi Published.
 * Preview dirender di browser dari state editor memakai PublicFooter & resolver yang sama dengan publik.
 */

type SectionMeta = { id: number; status: string; isVisible: boolean; publishedAt: string | null; updatedAt: string | null; hasImage: boolean; publishedHasImage: boolean; hasUnpublishedChanges: boolean };
type Payload = { section: SectionMeta | null; draft: FooterConfig; published: FooterConfig | null; settings: PublicHomepage["settings"]; navigation: { header: PublicCta[]; footer: PublicCta[] }; logos: { globalSrc: string | null } };
type EditorTab = "identity" | "columns" | "contact" | "social" | "cta" | "bottom" | "appearance";

const API = "/api/public-site/admin/footer";
const TABS: { id: EditorTab; label: string }[] = [
  { id: "identity", label: "Identitas" }, { id: "columns", label: "Kolom & Link" }, { id: "contact", label: "Kontak" },
  { id: "social", label: "Sosial Media" }, { id: "cta", label: "CTA" }, { id: "bottom", label: "Bottom Bar" }, { id: "appearance", label: "Tampilan" },
];
const CONTACT_LABELS: Record<ContactKey, string> = { whatsapp: "WhatsApp", email: "Email", phone: "Telepon", address: "Alamat", maps: "Google Maps" };
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
const renumber = <T extends { sortOrder: number }>(list: T[]) => list.map((item, index) => ({ ...item, sortOrder: (index + 1) * 10 }));
const ordered = <T extends { sortOrder: number }>(list: T[]) => [...list].sort((a, b) => a.sortOrder - b.sortOrder);
function move<T>(list: T[], index: number, delta: number) {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
function orderedConfig(config: FooterConfig): FooterConfig {
  return {
    ...config,
    columns: ordered(config.columns).map((c) => ({ ...c, items: ordered(c.items) })),
    social: { ...config.social, items: ordered(config.social.items) },
    bottomBar: { ...config.bottomBar, links: ordered(config.bottomBar.links) },
  };
}
function withSortOrders(config: FooterConfig): FooterConfig {
  return {
    ...config,
    columns: renumber(config.columns).map((c) => ({ ...c, items: renumber(c.items) })),
    social: { ...config.social, items: renumber(config.social.items) },
    bottomBar: { ...config.bottomBar, links: renumber(config.bottomBar.links) },
  };
}

function Field({ label, hint, children, id }: { label: string; hint?: string; children: React.ReactNode; id?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
function Toggle({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} data-testid={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-sm font-normal">{label}</Label>
    </div>
  );
}
function Segmented<T extends string | number>({ value, options, onChange, testId }: { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (value: T) => void; testId: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" data-testid={testId}>
      {options.map((option) => (
        <button key={String(option.value)} type="button" role="radio" aria-checked={value === option.value} onClick={() => onChange(option.value)}
          data-testid={`${testId}-${option.value}`}
          className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${value === option.value ? "border-primary bg-primary text-white" : "bg-white hover:bg-muted"}`}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
function SourceSwitch({ value, onChange, testId }: { value: "settings" | "custom"; onChange: (value: "settings" | "custom") => void; testId: string }) {
  return (
    <Segmented testId={testId} value={value} onChange={onChange}
      options={[{ value: "settings", label: "Sumber: Pengaturan Website" }, { value: "custom", label: "Sumber: Custom Footer" }]} />
  );
}
function RowActions({ index, length, onMove, onDelete, testId }: { index: number; length: number; onMove: (delta: number) => void; onDelete: () => void; testId: string }) {
  return (
    <div className="flex shrink-0 gap-1">
      <Button type="button" variant="outline" size="icon-sm" aria-label="Naikkan" disabled={index === 0} onClick={() => onMove(-1)} data-testid={`${testId}-up`}><ArrowUp /></Button>
      <Button type="button" variant="outline" size="icon-sm" aria-label="Turunkan" disabled={index === length - 1} onClick={() => onMove(1)} data-testid={`${testId}-down`}><ArrowDown /></Button>
      <Button type="button" variant="outline" size="icon-sm" aria-label="Hapus" className="text-red-600" onClick={onDelete} data-testid={`${testId}-delete`}><Trash2 /></Button>
    </div>
  );
}

function LinkRows({ links, onChange, testId, max }: { links: FooterLink[]; onChange: (links: FooterLink[]) => void; testId: string; max: number }) {
  const update = (index: number, patch: Partial<FooterLink>) => onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  return (
    <div className="space-y-2">
      {links.map((link, index) => {
        const external = /^https?:\/\//i.test(link.url.trim());
        return (
          <div key={link.id} className="grid gap-2 rounded-xl border bg-slate-50/60 p-3 md:grid-cols-[1fr_1.4fr_auto]" data-testid={`${testId}-${index}`}>
            <Input aria-label="Label" placeholder="Label" value={link.label} maxLength={FOOTER_LIMITS.label} onChange={(e) => update(index, { label: e.target.value })} data-testid={`${testId}-${index}-label`} />
            <div className="grid gap-1">
              <Input aria-label="URL" placeholder="/tentang atau https://…" value={link.url} maxLength={FOOTER_LIMITS.url}
                onChange={(e) => update(index, { url: e.target.value, linkType: /^https?:\/\//i.test(e.target.value.trim()) ? "external" : "internal" })} data-testid={`${testId}-${index}-url`} />
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${external ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{external ? "Eksternal" : "Internal"}</span>
                <Toggle id={`${testId}-${index}-newtab`} checked={external || link.openNewTab} onChange={(v) => update(index, { openNewTab: v })} label={external ? "Tab baru (otomatis)" : "Buka di tab baru"} />
                <Toggle id={`${testId}-${index}-visible`} checked={link.isVisible} onChange={(v) => update(index, { isVisible: v })} label="Aktif" />
              </div>
            </div>
            <RowActions index={index} length={links.length} testId={`${testId}-${index}`} onMove={(d) => onChange(move(links, index, d))} onDelete={() => onChange(links.filter((_, i) => i !== index))} />
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" disabled={links.length >= max} data-testid={`${testId}-add`}
        onClick={() => onChange([...links, { id: uid("link"), label: "", url: "", linkType: "internal", openNewTab: false, isVisible: true, sortOrder: (links.length + 1) * 10 }])}>
        <Plus />Tambah Link {links.length >= max ? `(maks. ${max})` : ""}
      </Button>
    </div>
  );
}

export default function FooterManagement() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [config, setConfig] = useState<FooterConfig | null>(null);
  const [savedJson, setSavedJson] = useState("");
  const [tab, setTab] = useState<EditorTab>("identity");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewSource, setPreviewSource] = useState<"draft" | "live">("draft");
  const [busy, setBusy] = useState<"" | "save" | "publish" | "unpublish" | "logo" | "visibility">("");
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [logoVersion, setLogoVersion] = useState(0);

  async function load() {
    setLoadError("");
    try {
      const response = await fetch(API);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Footer belum dapat dimuat.");
      const draft = orderedConfig(data.draft);
      setPayload(data);
      setConfig(draft);
      setSavedJson(data.section ? JSON.stringify(withSortOrders(draft)) : "");
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "Footer belum dapat dimuat.");
    }
  }
  useEffect(() => {
    let cancelled = false;
    fetch(API).then(async (response) => {
      const data = await response.json();
      if (cancelled) return;
      if (!response.ok) { setLoadError(data.error || "Footer belum dapat dimuat."); return; }
      const draft = orderedConfig(data.draft);
      setPayload(data);
      setConfig(draft);
      setSavedJson(data.section ? JSON.stringify(withSortOrders(draft)) : "");
    }).catch(() => { if (!cancelled) setLoadError("Footer belum dapat dimuat."); });
    return () => { cancelled = true; };
  }, []);

  const section = payload?.section ?? null;
  const dirty = config ? JSON.stringify(withSortOrders(config)) !== savedJson : false;
  const clientErrors = useMemo(() => (config ? normalizeFooterConfig(withSortOrders(config), true).errors : []), [config]);
  const draftLogo = section?.hasImage ? `/api/public-site/admin/section?id=${section.id}&v=${logoVersion}` : null;
  const globalLogo = payload?.logos?.globalSrc ?? null;
  const previewFooter = useMemo(() => {
    if (!payload || !config) return null;
    const navLinks = payload.navigation.footer.length ? payload.navigation.footer : payload.navigation.header;
    if (previewSource === "live") {
      const liveCustom = payload.published && payload.section?.publishedHasImage ? `/api/public-site/image?section=footer&slot=main&v=${logoVersion}` : null;
      return resolveFooter(payload.published, payload.settings, navLinks, { customSrc: liveCustom, globalSrc: globalLogo });
    }
    return resolveFooter(normalizeFooterConfig(withSortOrders(config), false).value, payload.settings, navLinks, { customSrc: draftLogo, globalSrc: globalLogo });
  }, [payload, config, previewSource, draftLogo, globalLogo, logoVersion]);

  if (loadError) {
    return <div data-testid="footer-load-error" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{loadError} <Button size="sm" variant="outline" className="ml-2" onClick={() => void load()}>Coba lagi</Button></div>;
  }
  if (!payload || !config) {
    return <div data-testid="footer-loading" className="space-y-3">{[0, 1, 2].map((k) => <div key={k} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>;
  }

  const set = (patch: Partial<FooterConfig>) => setConfig({ ...config, ...patch });
  const setIdentity = (patch: Partial<FooterConfig["identity"]>) => set({ identity: { ...config.identity, ...patch } });
  const setContact = (patch: Partial<FooterConfig["contact"]>) => set({ contact: { ...config.contact, ...patch } });
  const setCta = (patch: Partial<FooterConfig["cta"]>) => set({ cta: { ...config.cta, ...patch } });
  const setBottom = (patch: Partial<FooterConfig["bottomBar"]>) => set({ bottomBar: { ...config.bottomBar, ...patch } });
  const setAppearance = (patch: Partial<FooterConfig["appearance"]>) => set({ appearance: { ...config.appearance, ...patch } });
  const setColumns = (columns: FooterColumn[]) => set({ columns });
  const updateColumn = (index: number, patch: Partial<FooterColumn>) => setColumns(config.columns.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  const s = payload.settings;

  async function saveDraft() {
    if (!config) return;
    const body = withSortOrders(config);
    const check = normalizeFooterConfig(body, true);
    if (check.errors.length) { setErrors(check.errors); setMessage(""); return; }
    setBusy("save"); setErrors([]); setMessage("");
    try {
      const response = await fetch(API, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ config: body }) });
      const data = await response.json();
      if (!response.ok) { setErrors(data.errors || [data.error || "Draft belum dapat disimpan."]); return; }
      await load();
      setMessage("Draft footer tersimpan. Website publik belum berubah sampai Anda menekan Publish.");
    } finally { setBusy(""); }
  }
  async function patch(action: "publish" | "unpublish" | "visibility", extra: Record<string, unknown> = {}) {
    setBusy(action); setErrors([]); setMessage("");
    try {
      const response = await fetch(API, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const data = await response.json();
      if (!response.ok) { setErrors(data.errors || [data.error || "Aksi gagal."]); return; }
      await load();
      setMessage(action === "publish" ? "Footer dipublish dan kini tampil di seluruh halaman publik." : action === "unpublish" ? "Footer builder ditarik dari publik. Website memakai footer bawaan." : "Pengaturan tampil footer diperbarui.");
    } finally { setBusy(""); }
  }
  /** Muat ulang metadata tanpa membuang isian editor yang belum disimpan (hanya mode logo yang diselaraskan). */
  async function refreshKeepingEdits(logoMode: "inherit" | "custom") {
    const local = config;
    await load();
    if (local) setConfig({ ...local, identity: { ...local.identity, logoMode } });
  }
  async function uploadLogo(file: File) {
    setBusy("logo"); setErrors([]); setMessage("");
    try {
      const form = new FormData();
      form.set("target", "footer");
      form.set("file", file);
      const response = await fetch("/api/public-site/admin/logo", { method: "POST", body: form });
      if (!response.ok) { const data = await response.json().catch(() => ({})); setErrors([data.error || "Logo belum dapat diunggah."]); return; }
      setLogoVersion((v) => v + 1);
      await refreshKeepingEdits("custom");
      setMessage("Logo khusus footer terunggah ke DRAFT. Klik Publish agar tampil di website.");
    } finally { setBusy(""); }
  }
  async function removeCustomLogo() {
    setBusy("logo"); setErrors([]); setMessage("");
    try {
      const response = await fetch("/api/public-site/admin/logo", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ target: "footer" }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); setErrors([data.error || "Logo belum dapat dihapus."]); return; }
      setLogoVersion((v) => v + 1);
      await refreshKeepingEdits("inherit");
      setMessage("Draft kembali memakai Logo Utama Website. Klik Publish agar berlaku di website.");
    } finally { setBusy(""); }
  }

  const statusLabel = !section ? "Belum pernah disimpan — publik memakai footer bawaan"
    : section.status === "published" ? (section.hasUnpublishedChanges ? "Published · ada perubahan draft belum dipublish" : "Published · tampil di website")
    : "Draft · belum tampil di website";

  return (
    <div className="space-y-6" data-testid="footer-builder">
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Footer Builder</h2>
            <p className="mt-1 text-sm text-muted-foreground">Seluruh isi footer website publik. Alur: Edit → Simpan Draft → Preview → Publish.</p>
            <p className="mt-2 text-sm"><span className="font-semibold">Status:</span> <span data-testid="footer-status">{statusLabel}</span>{dirty ? <span data-testid="footer-dirty" className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Perubahan belum disimpan</span> : null}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void saveDraft()} disabled={busy !== ""} data-testid="footer-save-draft-button">{busy === "save" ? <LoaderCircle className="animate-spin" /> : <Save />}Simpan Draft</Button>
            <Button variant="outline" onClick={() => void patch("publish")} disabled={busy !== "" || !section || dirty} data-testid="footer-publish-button"
              title={dirty ? "Simpan draft terlebih dahulu" : undefined}>{busy === "publish" ? <LoaderCircle className="animate-spin" /> : <Rocket />}Publish</Button>
            {section?.status === "published" ? (
              <Button variant="outline" onClick={() => void patch("unpublish")} disabled={busy !== ""} data-testid="footer-unpublish-button"><Undo2 />Tarik dari Publik</Button>
            ) : null}
          </div>
        </div>
        {section ? (
          <div className="mt-4">
            <Toggle id="footer-visible-switch" checked={section.isVisible} onChange={(v) => void patch("visibility", { isVisible: v })}
              label={section.isVisible ? "Footer builder aktif (versi Published dipakai website)" : "Footer builder disembunyikan — website memakai footer bawaan"} />
          </div>
        ) : null}
        {message ? <div data-testid="footer-message" role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}
        {errors.length ? (
          <div data-testid="footer-errors" role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-semibold">Periksa kembali isian berikut:</p>
            <ul className="mt-1 list-disc pl-5">{errors.slice(0, 8).map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        ) : clientErrors.length ? (
          <p data-testid="footer-client-errors" className="mt-3 text-xs text-amber-700">{clientErrors.length} isian perlu diperbaiki sebelum disimpan: {clientErrors[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border bg-white p-6">
          <div className="flex flex-wrap gap-2 border-b pb-4" role="tablist">
            {TABS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} data-testid={`footer-tab-${item.id}`}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold ${tab === item.id ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>{item.label}</button>
            ))}
          </div>

          <div className="mt-5 space-y-5">
            {tab === "identity" ? (
              <>
                <Toggle id="footer-identity-visible" checked={config.identity.isVisible} onChange={(v) => setIdentity({ isVisible: v })} label="Tampilkan blok identitas" />
                <SourceSwitch testId="footer-identity-source" value={config.identity.sourceMode} onChange={(v) => setIdentity({ sourceMode: v })} />
                {config.identity.sourceMode === "settings" ? (
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm" data-testid="footer-identity-inherited">
                    <p className="font-semibold">Diambil otomatis dari Pengaturan Website:</p>
                    <p className="mt-1">{s.siteName} · {s.siteTagline || "—"}</p>
                    <p className="text-muted-foreground">{s.siteDescription || "—"}</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <Field label="Nama organisasi" id="footer-org"><Input id="footer-org" data-testid="footer-org-input" value={config.identity.organizationName} maxLength={FOOTER_LIMITS.name} onChange={(e) => setIdentity({ organizationName: e.target.value })} /></Field>
                    <Field label="Tagline" id="footer-tagline"><Input id="footer-tagline" data-testid="footer-tagline-input" value={config.identity.tagline} maxLength={FOOTER_LIMITS.tagline} onChange={(e) => setIdentity({ tagline: e.target.value })} /></Field>
                    <Field label="Deskripsi singkat" id="footer-desc"><Textarea id="footer-desc" data-testid="footer-description-input" value={config.identity.description} maxLength={FOOTER_LIMITS.description} onChange={(e) => setIdentity({ description: e.target.value })} /></Field>
                  </div>
                )}
                <Field label="Hashtag" id="footer-hashtag" hint="Contoh: #RiangGembira. Kosongkan untuk menyembunyikan."><Input id="footer-hashtag" data-testid="footer-hashtag-input" value={config.identity.hashtag} maxLength={FOOTER_LIMITS.hashtag} onChange={(e) => setIdentity({ hashtag: e.target.value })} /></Field>
                <div className="grid gap-3 rounded-xl border p-4" data-testid="footer-logo-settings">
                  <p className="text-sm font-semibold">Logo Footer</p>
                  <Toggle id="footer-logo-visible" checked={config.identity.showLogo} onChange={(v) => setIdentity({ showLogo: v })} label="Tampilkan logo" />
                  <Segmented testId="footer-logo-mode" value={config.identity.logoMode} onChange={(v) => setIdentity({ logoMode: v })}
                    options={[{ value: "inherit", label: "Logo Utama Website" }, { value: "custom", label: "Logo Khusus Footer" }]} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-muted-foreground">Logo Utama Website {globalLogo ? "" : "(belum diatur → logo bawaan TDA)"}</p>
                      <div className="mt-2 grid h-16 place-items-center rounded-lg bg-white">
                        <BrandLogo sources={[globalLogo ?? "", STATIC_LOGO_SRC]} alt="Logo Utama Website" width={120} height={52} className="h-12 w-28 object-contain" testId="footer-logo-global-thumb" />
                      </div>
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-muted-foreground">Logo Khusus Footer (draft)</p>
                      <div className="mt-2 grid h-16 place-items-center rounded-lg bg-tda-navy">
                        {draftLogo ? <BrandLogo sources={[draftLogo]} alt="Logo khusus footer" width={120} height={52} className="h-12 w-28 object-contain" testId="footer-logo-custom-thumb" />
                          : <span className="text-xs text-white/70">Belum ada</span>}
                      </div>
                    </div>
                  </div>
                  {config.identity.logoMode === "custom" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold ${busy ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}>
                        {busy === "logo" ? <LoaderCircle className="size-4 animate-spin" /> : <ImageUp className="size-4" />}{section?.hasImage ? "Ganti logo khusus" : "Unggah logo khusus"}
                        <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" data-testid="footer-logo-input" disabled={busy !== ""}
                          onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadLogo(file); e.target.value = ""; }} />
                      </label>
                      {section?.hasImage ? (
                        <Button type="button" variant="outline" size="sm" disabled={busy !== ""} onClick={() => void removeCustomLogo()} data-testid="footer-logo-reset-button"><Undo2 />Kembali ke Logo Utama</Button>
                      ) : null}
                      <p className="w-full text-xs text-muted-foreground">PNG/JPG/WebP maks. 5 MB — otomatis diperkecil (WebP, maks. 640 px). Cocok untuk versi logo putih/terang di footer gelap.</p>
                      {!section?.hasImage ? <p className="w-full text-xs text-amber-700" data-testid="footer-logo-custom-missing">Belum ada logo khusus — website tetap memakai Logo Utama sampai logo khusus diunggah.</p> : null}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground" data-testid="footer-logo-inherit-note">Mengikuti Logo Utama di Pengaturan Website — otomatis ikut berubah bila Logo Utama diganti.</p>
                  )}
                </div>
              </>
            ) : null}

            {tab === "columns" ? (
              <>
                <p className="text-sm text-muted-foreground">Jumlah kolom bebas (maks. {FOOTER_LIMITS.columns}), masing-masing maks. {FOOTER_LIMITS.itemsPerColumn} link. URL internal diawali “/”, eksternal diawali “https://”.</p>
                {config.columns.map((column, index) => (
                  <div key={column.id} className="rounded-2xl border p-4" data-testid={`footer-column-editor-${index}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <Input aria-label="Judul kolom" className="max-w-xs font-semibold" placeholder="Judul kolom" value={column.title} maxLength={FOOTER_LIMITS.title}
                        onChange={(e) => updateColumn(index, { title: e.target.value })} data-testid={`footer-column-${index}-title`} />
                      <Toggle id={`footer-column-${index}-visible`} checked={column.isVisible} onChange={(v) => updateColumn(index, { isVisible: v })} label="Aktif" />
                      <div className="ml-auto"><RowActions index={index} length={config.columns.length} testId={`footer-column-${index}`} onMove={(d) => setColumns(move(config.columns, index, d))} onDelete={() => setColumns(config.columns.filter((_, i) => i !== index))} /></div>
                    </div>
                    <div className="mt-3"><LinkRows links={column.items} max={FOOTER_LIMITS.itemsPerColumn} testId={`footer-column-${index}-item`} onChange={(items) => updateColumn(index, { items })} /></div>
                  </div>
                ))}
                <Button type="button" variant="outline" disabled={config.columns.length >= FOOTER_LIMITS.columns} data-testid="footer-add-column-button"
                  onClick={() => setColumns([...config.columns, { id: uid("kolom"), title: "", isVisible: true, sortOrder: (config.columns.length + 1) * 10, items: [] }])}>
                  <Plus />Tambah Kolom
                </Button>
              </>
            ) : null}

            {tab === "contact" ? (
              <>
                <Toggle id="footer-contact-visible" checked={config.contact.isVisible} onChange={(v) => setContact({ isVisible: v })} label="Tampilkan blok kontak" />
                <Field label="Judul blok" id="footer-contact-title"><Input id="footer-contact-title" data-testid="footer-contact-title-input" value={config.contact.title} maxLength={FOOTER_LIMITS.title} onChange={(e) => setContact({ title: e.target.value })} /></Field>
                <SourceSwitch testId="footer-contact-source" value={config.contact.sourceMode} onChange={(v) => setContact({ sourceMode: v })} />
                {config.contact.sourceMode === "settings" ? (
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm" data-testid="footer-contact-inherited">
                    <p className="font-semibold">WhatsApp, email, dan alamat mengikuti Pengaturan Website (otomatis ikut berubah):</p>
                    <p className="mt-1">WA: {s.whatsappLabel || "—"} · Email: {s.email || "—"}</p>
                    <p className="text-muted-foreground">{s.addressLines.join(", ") || "—"}</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="WhatsApp (custom)" id="footer-wa"><Input id="footer-wa" data-testid="footer-whatsapp-input" value={config.contact.whatsapp} maxLength={30} placeholder="0812…" onChange={(e) => setContact({ whatsapp: e.target.value })} /></Field>
                    <Field label="Email (custom)" id="footer-email"><Input id="footer-email" data-testid="footer-email-input" value={config.contact.email} maxLength={FOOTER_LIMITS.email} onChange={(e) => setContact({ email: e.target.value })} /></Field>
                    <div className="md:col-span-2"><Field label="Alamat (custom)" id="footer-address"><Textarea id="footer-address" data-testid="footer-address-input" value={config.contact.address} maxLength={FOOTER_LIMITS.address} onChange={(e) => setContact({ address: e.target.value })} /></Field></div>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Telepon" id="footer-phone" hint="Tidak ada di Pengaturan Website → disimpan di footer."><Input id="footer-phone" data-testid="footer-phone-input" value={config.contact.phone} maxLength={FOOTER_LIMITS.phone} placeholder="(0761) …" onChange={(e) => setContact({ phone: e.target.value })} /></Field>
                  <Field label="URL Google Maps" id="footer-maps" hint={config.contact.sourceMode === "settings" ? "Kosong = otomatis dari alamat Pengaturan Website." : "https://maps.app.goo.gl/…"}><Input id="footer-maps" data-testid="footer-maps-input" value={config.contact.mapsUrl} maxLength={FOOTER_LIMITS.url} onChange={(e) => setContact({ mapsUrl: e.target.value })} /></Field>
                </div>
                <div className="flex flex-wrap gap-4 rounded-xl border p-4">
                  {(Object.keys(CONTACT_LABELS) as ContactKey[]).map((key) => (
                    <Toggle key={key} id={`footer-contact-show-${key}`} checked={config.contact.show[key]} onChange={(v) => setContact({ show: { ...config.contact.show, [key]: v } })} label={CONTACT_LABELS[key]} />
                  ))}
                </div>
              </>
            ) : null}

            {tab === "social" ? (
              <>
                <Toggle id="footer-social-visible" checked={config.social.isVisible} onChange={(v) => set({ social: { ...config.social, isVisible: v } })} label="Tampilkan ikon sosial media" />
                <SourceSwitch testId="footer-social-source" value={config.social.sourceMode} onChange={(v) => set({ social: { ...config.social, sourceMode: v } })} />
                <div className="space-y-2">
                  {config.social.items.map((item, index) => {
                    const inherited = config.social.sourceMode === "settings" && SOCIAL_IN_SETTINGS.includes(item.platform);
                    const settingsUrl = { instagram: s.instagramUrl, youtube: s.youtubeUrl, linkedin: s.linkedinUrl, tiktok: s.tiktokUrl, facebook: null }[item.platform];
                    const setItems = (items: typeof config.social.items) => set({ social: { ...config.social, items } });
                    return (
                      <div key={item.platform} className="grid items-center gap-2 rounded-xl border p-3 md:grid-cols-[140px_1fr_auto_auto]" data-testid={`footer-social-${item.platform}`}>
                        <span className="text-sm font-semibold">{SOCIAL_LABELS[item.platform]}</span>
                        {inherited ? (
                          <span className="truncate text-sm text-muted-foreground" data-testid={`footer-social-${item.platform}-inherited`}>Dari Pengaturan: {settingsUrl || "belum diisi (tidak ditampilkan)"}</span>
                        ) : (
                          <Input aria-label={`URL ${SOCIAL_LABELS[item.platform]}`} placeholder="https://…" value={item.url} maxLength={FOOTER_LIMITS.url} data-testid={`footer-social-${item.platform}-url`}
                            onChange={(e) => setItems(config.social.items.map((x, i) => (i === index ? { ...x, url: e.target.value } : x)))} />
                        )}
                        <Toggle id={`footer-social-${item.platform}-visible`} checked={item.isVisible} onChange={(v) => setItems(config.social.items.map((x, i) => (i === index ? { ...x, isVisible: v } : x)))} label="Aktif" />
                        <div className="flex gap-1">
                          <Button type="button" variant="outline" size="icon-sm" aria-label="Naikkan" disabled={index === 0} onClick={() => setItems(move(config.social.items, index, -1))}><ArrowUp /></Button>
                          <Button type="button" variant="outline" size="icon-sm" aria-label="Turunkan" disabled={index === config.social.items.length - 1} onClick={() => setItems(move(config.social.items, index, 1))}><ArrowDown /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Facebook belum ada di Pengaturan Website → URL-nya selalu disimpan di footer. Ikon hanya tampil bila aktif dan URL valid (https).</p>
              </>
            ) : null}

            {tab === "cta" ? (
              <>
                <Toggle id="footer-cta-visible" checked={config.cta.isVisible} onChange={(v) => setCta({ isVisible: v })} label="Tampilkan CTA footer" />
                <Field label="Judul" id="footer-cta-title"><Input id="footer-cta-title" data-testid="footer-cta-title-input" value={config.cta.title} maxLength={FOOTER_LIMITS.ctaTitle} onChange={(e) => setCta({ title: e.target.value })} /></Field>
                <Field label="Deskripsi" id="footer-cta-desc"><Textarea id="footer-cta-desc" data-testid="footer-cta-description-input" value={config.cta.description} maxLength={FOOTER_LIMITS.ctaDescription} onChange={(e) => setCta({ description: e.target.value })} /></Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Label tombol" id="footer-cta-label"><Input id="footer-cta-label" data-testid="footer-cta-label-input" value={config.cta.buttonLabel} maxLength={FOOTER_LIMITS.buttonLabel} onChange={(e) => setCta({ buttonLabel: e.target.value })} /></Field>
                  <Field label="URL tombol" id="footer-cta-url"><Input id="footer-cta-url" data-testid="footer-cta-url-input" value={config.cta.buttonUrl} maxLength={FOOTER_LIMITS.url} placeholder="/form/member" onChange={(e) => setCta({ buttonUrl: e.target.value })} /></Field>
                </div>
              </>
            ) : null}

            {tab === "bottom" ? (
              <>
                <Toggle id="footer-bottom-visible" checked={config.bottomBar.isVisible} onChange={(v) => setBottom({ isVisible: v })} label="Tampilkan bottom bar" />
                <Field label="Teks copyright" id="footer-copyright" hint="Gunakan {year} untuk tahun berjalan otomatis."><Input id="footer-copyright" data-testid="footer-copyright-input" value={config.bottomBar.copyright} maxLength={FOOTER_LIMITS.copyright} onChange={(e) => setBottom({ copyright: e.target.value })} /></Field>
                <div className="flex flex-wrap gap-2">
                  {["Kebijakan Privasi", "Syarat & Ketentuan", "Disclaimer"].map((label) => (
                    <Button key={label} type="button" size="sm" variant="outline" disabled={config.bottomBar.links.length >= FOOTER_LIMITS.bottomLinks || config.bottomBar.links.some((l) => l.label === label)}
                      data-testid={`footer-bottom-quick-${label.split(" ")[0].toLowerCase()}`}
                      onClick={() => setBottom({ links: [...config.bottomBar.links, { id: uid("legal"), label, url: "", linkType: "internal", openNewTab: false, isVisible: true, sortOrder: (config.bottomBar.links.length + 1) * 10 }] })}>
                      <Plus />{label}
                    </Button>
                  ))}
                </div>
                <LinkRows links={config.bottomBar.links} max={FOOTER_LIMITS.bottomLinks} testId="footer-bottom-link" onChange={(links) => setBottom({ links })} />
              </>
            ) : null}

            {tab === "appearance" ? (
              <>
                <Field label="Layout kolom (desktop)"><Segmented testId="footer-layout" value={config.appearance.layout} onChange={(v) => setAppearance({ layout: v })} options={[3, 4, 5].map((n) => ({ value: n as 3 | 4 | 5, label: `${n} kolom` }))} /></Field>
                <Field label="Tema"><Segmented testId="footer-theme" value={config.appearance.theme} onChange={(v) => setAppearance({ theme: v })} options={FOOTER_THEMES} /></Field>
                <Field label="Motif Melayu (aksen)">
                  <div className="grid grid-cols-3 gap-3" data-testid="footer-motif">
                    {FOOTER_MOTIFS.map((option) => (
                      <button key={option.value} type="button" onClick={() => setAppearance({ motif: option.value })} aria-pressed={config.appearance.motif === option.value}
                        data-testid={`footer-motif-${option.value}`}
                        className={`grid place-items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${config.appearance.motif === option.value ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted"}`}>
                        <span className="grid h-20 w-full place-items-center rounded-lg bg-[#1E2A8A] text-[#C7D1FF]">
                          {option.value === "selembayung" ? <Selembayung className="h-16 w-24" opacity={0.9} /> : option.value === "pucuk-rebung" ? <PucukRebungAccent className="h-16 w-14" opacity={0.9} /> : <span className="text-xs opacity-70">—</span>}
                        </span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Intensitas motif" hint="Subtle = 6% · Medium = 10% (aksen, bukan latar penuh)."><Segmented testId="footer-intensity" value={config.appearance.motifIntensity} onChange={(v) => setAppearance({ motifIntensity: v })} options={[{ value: "subtle", label: "Subtle" }, { value: "medium", label: "Medium" }]} /></Field>
              </>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border bg-white p-6" data-testid="footer-preview">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-base font-bold"><Eye className="size-4" />Preview</h3>
            <div className="flex flex-wrap gap-2">
              <Segmented testId="footer-preview-source" value={previewSource} onChange={setPreviewSource}
                options={[{ value: "draft", label: "Draft (editor)" }, { value: "live", label: "Live (published)" }]} />
              <Segmented testId="footer-preview-mode" value={previewMode} onChange={setPreviewMode}
                options={[{ value: "desktop", label: <span className="inline-flex items-center gap-1"><Monitor className="size-4" />Desktop</span> }, { value: "mobile", label: <span className="inline-flex items-center gap-1"><Smartphone className="size-4" />Mobile</span> }]} />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground" data-testid="footer-preview-note">
            {previewSource === "draft" ? "Simulasi isian editor (termasuk yang belum disimpan). Tidak mengubah website." : payload.published ? "Versi yang sedang tampil di website publik." : "Belum ada versi published — website memakai footer bawaan (ditampilkan di bawah)."}
          </p>
          <div className="tda-public mt-4 overflow-hidden rounded-xl border bg-transparent" onClickCapture={(e) => { if ((e.target as HTMLElement).closest("a")) e.preventDefault(); }}>
            {previewFooter ? (
              previewMode === "desktop" ? (
                <ScaledPreview width={1280} testId="footer-preview-desktop-frame"><PublicFooter footer={previewFooter} mode="desktop" idPrefix="preview-" /></ScaledPreview>
              ) : (
                <div className="mx-auto w-[390px] max-w-full"><PublicFooter footer={previewFooter} mode="mobile" idPrefix="preview-" /></div>
              )
            ) : null}
          </div>
        </div>
      </div>

      <MotifPreview />
    </div>
  );
}
