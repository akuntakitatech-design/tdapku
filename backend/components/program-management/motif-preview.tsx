"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { PucukRebungAccent, PucukRebungBand, Selembayung } from "@/components/public-site/motif";
import { ScaledPreview } from "@/components/program-management/scaled-preview";

/*
 * PRATINJAU MOTIF MELAYU RIAU (review sebelum dipasang luas) — hanya tampilan di backoffice, tidak mengubah website.
 * Varian: A Selembayung saja · B Pucuk Rebung saja · C Kombinasi (Selembayung utama + Pucuk Rebung pendamping).
 * Area: Hero accent, CTA section, Footer, divider. Opacity mengikuti aturan aksen (6% subtle / 10% medium).
 */
type Variant = "selembayung" | "pucuk-rebung" | "kombinasi";
const VARIANTS: { id: Variant; label: string }[] = [
  { id: "selembayung", label: "A · Selembayung" }, { id: "pucuk-rebung", label: "B · Pucuk Rebung" }, { id: "kombinasi", label: "C · Kombinasi" },
];

function Accent({ variant, dark, size, mobile }: { variant: Variant; dark: boolean; size: "hero" | "cta" | "footer"; mobile: boolean }) {
  const tone = dark ? "text-tda-soft" : "text-tda-indigo";
  const opacity = dark ? 0.1 : 0.08;
  const sel = { hero: mobile ? "w-[200px]" : "w-[420px]", cta: mobile ? "w-[170px]" : "w-[300px]", footer: mobile ? "w-[190px]" : "w-[340px]" }[size];
  const reb = { hero: mobile ? "w-[90px]" : "w-[150px]", cta: mobile ? "w-[80px]" : "w-[120px]", footer: mobile ? "w-[90px]" : "w-[140px]" }[size];
  return (
    <>
      {variant !== "pucuk-rebung" ? <Selembayung opacity={opacity} className={`absolute ${size === "cta" ? "-bottom-10 left-[38%]" : "-right-4 top-3"} ${sel} ${tone}`} /> : null}
      {variant === "pucuk-rebung" ? <PucukRebungAccent opacity={opacity} className={`absolute -bottom-6 ${size === "cta" ? "left-[45%]" : "right-4"} ${reb} ${tone}`} /> : null}
      {variant === "kombinasi" ? <PucukRebungAccent opacity={opacity * 0.7} className={`absolute -bottom-8 left-4 ${mobile ? "w-[60px]" : "w-[90px]"} ${tone}`} /> : null}
    </>
  );
}

export function MotifPreview() {
  const [variant, setVariant] = useState<Variant>("selembayung");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const mobile = device === "mobile";
  const pill = (active: boolean) => `rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${active ? "border-primary bg-primary text-white" : "bg-white hover:bg-muted"}`;

  return (
    <section className="rounded-2xl border bg-white p-6" data-testid="motif-preview">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold">Pratinjau Motif Melayu Riau (review)</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Selembayung = motif utama (ornamen puncak atap rumah Melayu Riau), Pucuk Rebung = pendamping. Contoh penempatan sebagai aksen
            opacity 6–10% pada Hero, CTA, Footer, dan divider. Hanya pratinjau — belum dipasang di halaman publik selain pilihan motif Footer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {VARIANTS.map((v) => <button key={v.id} type="button" className={pill(variant === v.id)} aria-pressed={variant === v.id} onClick={() => setVariant(v.id)} data-testid={`motif-preview-variant-${v.id}`}>{v.label}</button>)}
          <button type="button" className={pill(device === "desktop")} aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")} data-testid="motif-preview-desktop"><span className="inline-flex items-center gap-1"><Monitor className="size-4" />Desktop</span></button>
          <button type="button" className={pill(device === "mobile")} aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")} data-testid="motif-preview-mobile"><span className="inline-flex items-center gap-1"><Smartphone className="size-4" />Mobile</span></button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border bg-slate-100 p-4">
        <Frame mobile={mobile}>
        <div className={`tda-public mx-auto space-y-4 bg-transparent ${mobile ? "w-[390px]" : "w-full"}`} data-testid={`motif-preview-canvas-${variant}-${device}`}>
          {/* HERO */}
          <div className="relative overflow-hidden rounded-2xl text-white" style={{ backgroundImage: "var(--tda-gradient)" }}>
            <Accent variant={variant} dark size="hero" mobile={mobile} />
            <div className={`relative ${mobile ? "p-6" : "p-12"}`}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-tda-soft">Hero · contoh</p>
              <p className={`tda-display mt-3 max-w-xl leading-[1.05] ${mobile ? "text-[38px]" : "text-[60px]"}`}>Tumbuh bersama pengusaha Pekanbaru</p>
              <p className="mt-3 max-w-md text-[15px] leading-7 text-[color:var(--tda-on-dark-muted)]">Komunitas untuk belajar, berjejaring, dan naik kelas bersama.</p>
              <span className="tda-btn tda-btn-light mt-5 inline-flex min-h-11 px-5">Gabung TDA</span>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="rounded-2xl bg-white px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-tda-indigo">Divider / section accent · contoh</p>
            <div className="mt-3 flex items-center gap-4">
              <span className="h-px flex-1 bg-[color:var(--tda-border)]" />
              {variant === "pucuk-rebung" ? <PucukRebungBand opacity={0.35} className="max-w-[160px]" />
                : <Selembayung opacity={0.35} className="w-16 text-tda-indigo" />}
              {variant === "kombinasi" ? <PucukRebungBand opacity={0.25} className="max-w-[80px]" /> : null}
              <span className="h-px flex-1 bg-[color:var(--tda-border)]" />
            </div>
            <p className="tda-display mt-3 text-[32px] leading-tight text-tda-navy">Program unggulan</p>
          </div>

          {/* CTA */}
          <div className="relative overflow-hidden rounded-2xl border border-[color:var(--tda-border)] bg-tda-bg-soft">
            <Accent variant={variant} dark={false} size="cta" mobile={mobile} />
            <div className={`relative flex ${mobile ? "flex-col gap-4 p-6" : "items-center justify-between p-10"}`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-tda-indigo">CTA · contoh</p>
                <p className={`tda-display mt-2 leading-tight text-tda-navy ${mobile ? "text-[30px]" : "text-[40px]"}`}>Siap bertumbuh bersama TDA?</p>
              </div>
              <span className="tda-btn tda-btn-primary inline-flex min-h-11 px-5">Gabung Sekarang</span>
            </div>
          </div>

          {/* FOOTER */}
          <div className="relative overflow-hidden rounded-2xl bg-tda-navy text-white">
            <Accent variant={variant} dark size="footer" mobile={mobile} />
            <div className={`relative grid gap-6 ${mobile ? "grid-cols-2 p-6" : "grid-cols-4 p-10"}`}>
              <div className={mobile ? "col-span-2" : ""}>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-tda-soft">Footer · contoh</p>
                <p className="tda-display mt-2 text-[30px] leading-none">TDA Pekanbaru</p>
                <p className="mt-2 text-sm text-[color:var(--tda-on-dark-muted)]">#RiangGembira</p>
              </div>
              {["Jelajahi", "Komunitas", "Kontak"].map((t) => (
                <div key={t}><p className="text-xs font-bold uppercase tracking-[0.18em] text-tda-soft">{t}</p>
                  <p className="mt-2 text-sm text-[color:var(--tda-on-dark-muted)]">Tautan · Tautan</p></div>
              ))}
            </div>
          </div>
        </div>
        </Frame>
      </div>
    </section>
  );
}

function Frame({ mobile, children }: { mobile: boolean; children: React.ReactNode }) {
  return mobile ? <>{children}</> : <ScaledPreview width={1280} testId="motif-preview-desktop-frame">{children}</ScaledPreview>;
}
