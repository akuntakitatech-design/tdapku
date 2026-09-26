import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays } from "lucide-react";
import { listPublicPrograms } from "@/db/public-programs";
import { getPublicHomepage, type PublicCta, type PublicHomepage, type PublicSectionBlock } from "@/db/public-homepage";
import { PublicGallery } from "@/components/public-media-showcase";
import { BusinessSpotlight } from "@/components/public-site/business-spotlight";
import { HighlightMarquee } from "@/components/public-site/highlight-marquee";
import { HeroBackdrop, type HeroSlide } from "@/components/public-site/hero-backdrop";
import { programFlyerUrl, responsiveImage } from "@/lib/public-image";
import { PublicHeader } from "@/components/public-site/public-header";
import { PublicFooter } from "@/components/public-site/public-footer";

/*
 * Homepage publik — FINAL design (executive business community). Konten CMS hanya dari section published + visible
 * (db/public-homepage.ts, READ-ONLY). Urutan mengikuti hierarchy final: Hero → Proof → Program → Tentang → Direktori →
 * Spotlight → Testimoni → Galeri → Footer (dengan Footer CTA). Visual lama (banner kegiatan, akses cepat, divider/ornamen lama) tidak
 * lagi di-render; data CMS/R2 terkait TETAP tersimpan dan tidak diubah.
 */
export const dynamic = "force-dynamic";

const DEFAULT_TITLE = "TDA Pekanbaru 9.0 — Tumbuh dan Berkolaborasi";
const DEFAULT_DESCRIPTION = "Portal program, kegiatan, dan pendaftaran member TDA Pekanbaru 9.0.";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPublicHomepage().catch(() => null);
  const title = data?.settings.seoTitle || DEFAULT_TITLE;
  const description = data?.settings.seoDescription || DEFAULT_DESCRIPTION;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", locale: "id_ID", images: [] },
  };
}

function dateLabel(value: string | null) {
  if (!value) return "Jadwal segera diumumkan";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T00:00:00+07:00`));
}

function CtaButton({ cta, variant, testId, arrow }: { cta: PublicCta; variant: "primary" | "outline" | "light" | "ghost-dark"; testId: string; arrow?: boolean }) {
  const external = /^https?:\/\//i.test(cta.href);
  return (
    <a href={cta.href} data-testid={testId} className={`tda-btn tda-btn-${variant}`}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {cta.label}
      {variant === "primary" || arrow ? <ArrowRight className="size-4" /> : null}
    </a>
  );
}

/*
 * Sumber foto Hero: foto Hero CMS yang PUBLISHED (jika ada) → foto kegiatan statis bawaan (/public/hero, WebP
 * 960/1920) sebagai fallback aman. Tidak membaca draft.
 */
// Slide 1 = foto grup SERTINAH TDA Pekanbaru 9.0 (sementara, sampai file DSC09958 diunggah), lalu foto kegiatan lain.
const HERO_FALLBACK_SLIDES: HeroSlide[] = [
  { n: 3, alt: "Foto grup SERTINAH TDA Pekanbaru 9.0", position: "center 68%" },
  { n: 1, alt: "Serah terima bendera TDA Pekanbaru 9.0", position: "58% 40%" },
  { n: 2, alt: "Kegiatan TDA Pekanbaru", position: "center 40%" },
  { n: 4, alt: "Anggota TDA Pekanbaru", position: "center 40%" },
].map(({ n, alt, position }) => ({
  src: `/hero/tda-hero-${n}-1920.webp`,
  srcSet: `/hero/tda-hero-${n}-960.webp 960w, /hero/tda-hero-${n}-1920.webp 1920w`,
  alt,
  position,
}));

function resolveHeroSlides(images: { src: string; alt: string }[]): { source: "cms" | "fallback"; slides: HeroSlide[] } {
  const cms = images.filter((image) => image.src.startsWith("/")).slice(0, 5);
  // Foto CMS (asli bisa 5–8 MB) → versi WebP responsif via optimizer; slide 1 tetap satu-satunya yang eager/priority.
  return cms.length
    ? { source: "cms", slides: cms.map((image) => ({ ...image, ...responsiveImage(image.src, [640, 828, 1080, 1920], 1920), position: "center 40%" })) }
    : { source: "fallback", slides: HERO_FALLBACK_SLIDES };
}

/** Urutan default desain final (dipakai jika baris CMS tidak ada). Admin dapat mengubah via sort_order CMS. */
const DEFAULT_ORDER = { impact: 20, programs: 30, agenda: 40, about: 50, "business-directory": 60, videos: 70, testimonials: 80, gallery: 90 } as const;

function SectionHeading({ block, align = "left", dark = false, testId }: { block: PublicSectionBlock; align?: "left" | "center"; dark?: boolean; testId: string }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {block.eyebrow ? <p className={`tda-kicker ${dark ? "tda-kicker-dark" : ""}`} data-testid={`${testId}-eyebrow`}>{block.eyebrow}</p> : null}
      {block.title ? <h2 data-testid={`${testId}-title`} className={`tda-h2 mt-4 text-balance ${dark ? "text-white" : "text-tda-navy"}`}>{block.title}</h2> : null}
      {block.subtitle ? (
        <p data-testid={`${testId}-subtitle`} className={`mt-4 text-lg font-medium leading-8 ${dark ? "text-[color:var(--tda-on-dark-muted)]" : "text-tda-muted"}`}>{block.subtitle}</p>
      ) : null}
    </div>
  );
}

type Stat = { value: string; label: string };

/**
 * Identity + Proof (setelah Hero). Kiri: identitas (CMS "impact" published → fallback copy final).
 * Kanan: foto kegiatan asli TDA + panel statistik navy yang menumpuk di foto (bukan tabel).
 * Statistik fallback HANYA fakta bersumber nyata: periode kepengurusan (9.0), divisi penggerak (daftar /tentang),
 * jumlah Program & Kegiatan publik (listPublicPrograms). Tidak ada angka karangan.
 */
function ProofSection({ impact, programCount }: { impact: PublicHomepage["impact"]; programCount: number }) {
  const fallbackStats: Stat[] = [
    { value: "9.0", label: "Periode Kepengurusan" },
    { value: "9", label: "Divisi Penggerak" },
    ...(programCount ? [{ value: String(programCount), label: "Program & Kegiatan" }] : []),
  ];
  const stats: Stat[] = (impact?.stats.length ? impact.stats : fallbackStats).slice(0, 4);
  const block: PublicSectionBlock = impact ?? {
    section: "impact", eyebrow: "TDA Pekanbaru", title: "Bertumbuh lebih cepat ketika berjalan bersama.", subtitle: "",
    body: "TDA Pekanbaru menjadi ruang bagi pengusaha untuk belajar, berjejaring, berkolaborasi, dan menciptakan peluang baru.",
    primaryCta: null, secondaryCta: null, image: null, sortOrder: 20,
  };
  const photo = impact?.image || "/hero/tda-hero-2-960.webp";
  const cols = stats.length >= 4 ? "grid-cols-2" : stats.length === 3 ? "grid-cols-[1.3fr_1fr_1fr] sm:grid-cols-3" : "grid-cols-2";
  return (
    <section id="ekosistem" data-testid="section-impact" data-source={impact ? "cms" : "fallback"} className="bg-white py-16 md:py-24">
      <div className="tda-container grid items-center gap-12 lg:grid-cols-[0.82fr_1fr] lg:gap-16">
        <div className="max-w-xl">
          <SectionHeading block={block} testId="impact" />
          {block.body ? <p data-testid="impact-body" className="mt-6 whitespace-pre-line text-lg font-medium leading-8 text-tda-muted">{block.body}</p> : null}
          {impact?.primaryCta ? (
            <div className="mt-9"><CtaButton cta={impact.primaryCta} variant="outline" testId="impact-primary-cta" /></div>
          ) : (
            <Link href="/tentang" data-testid="impact-about-link" className="tda-link group mt-9 inline-flex items-center gap-2 text-sm">
              Kenali TDA Pekanbaru <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          )}
        </div>

        <div className="relative lg:pb-14">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--tda-radius-lg)] bg-tda-navy lg:aspect-[5/4]">
            {/* eslint-disable-next-line @next/next/no-img-element -- foto kegiatan (CMS/WebP statis), container ber-rasio tetap → tanpa CLS */}
            <img {...(impact?.image ? responsiveImage(photo, [640, 828, 1080, 1200]) : { src: photo, srcSet: "/hero/tda-hero-2-960.webp 960w, /hero/tda-hero-2-1920.webp 1920w" })}
              sizes="(min-width: 1024px) 640px, 100vw" alt="Pengurus dan anggota TDA Pekanbaru pada Serah Terima Amanah 8.0 ke 9.0" data-testid="impact-image"
              loading="lazy" decoding="async" className="size-full object-cover object-[center_62%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-tda-navy/45 via-transparent to-transparent" aria-hidden="true" />
          </div>
          <dl data-testid="impact-stats"
            className={`relative mx-4 -mt-12 grid ${cols} rounded-[var(--tda-radius-md)] bg-tda-navy px-2 py-6 text-white shadow-[var(--tda-shadow-md)] sm:mx-8 lg:absolute lg:bottom-0 lg:left-[-3rem] lg:right-auto lg:mx-0 lg:mt-0 lg:min-w-[440px] lg:px-4 lg:py-8`}>
            {stats.map((stat, index) => (
              <div key={stat.label + index} data-testid={`impact-stat-${index}`}
                className={`min-w-0 px-2.5 sm:px-5 ${index % (stats.length >= 4 ? 2 : stats.length) ? "border-l border-white/15" : ""} ${stats.length >= 4 && index >= 2 ? "mt-6" : ""}`}>
                <dt className="sr-only">{stat.label}</dt>
                <dd data-testid={`impact-stat-${index}-value`} className="tda-display text-[34px] leading-none sm:text-[44px]">{stat.value}</dd>
                <dd data-testid={`impact-stat-${index}-label`} className="mt-2 text-xs font-semibold leading-snug text-tda-soft sm:text-sm">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

type Program = Awaited<ReturnType<typeof listPublicPrograms>>[number];

/** Program unggulan — sumber data existing (listPublicPrograms, featured lebih dulu) tidak diubah; hanya tampilan. */
function ProgramsSection({ programs }: { programs: Program[] }) {
  return (
    <section id="programs" data-testid="section-programs" className="tda-section bg-tda-bg-soft">
      <div className="tda-container">
        <div className="flex items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="tda-kicker">Program &amp; Kegiatan</p>
            <h2 className="tda-h2 mt-4 text-balance text-tda-navy">Program unggulan untuk bisnis yang terus bertumbuh.</h2>
          </div>
          <Link href="/program" data-testid="programs-see-all-link" className="tda-link hidden shrink-0 items-center gap-1 text-sm sm:inline-flex">
            Semua program <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program, index) => {
            const title = program.publicTitle || program.programTitle;
            return (
              <Link key={program.programCode} href={`/program/${program.programCode.toLowerCase()}`} data-testid={`program-card-${index}`}
                className="tda-focus group flex flex-col overflow-hidden rounded-[var(--tda-radius-lg)] bg-white shadow-[var(--tda-shadow-sm)] transition-shadow duration-200 hover:shadow-[var(--tda-shadow-md)]">
                <div className="relative aspect-[4/3] overflow-hidden bg-tda-navy">
                  {program.flyerKey ? (
                    /* next/image: thumbnail WebP sesuai lebar kartu (bukan file asli 2–3,7 MB). API flyer tidak berubah. */
                    <Image src={programFlyerUrl(program.programCode, program.flyerKey)} alt={`Flyer ${title}`} fill
                      sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="tda-intro-glow flex size-full items-end p-6">
                      <p className="tda-display text-[28px] leading-[1.1] text-white">{title}</p>
                    </div>
                  )}
                  {program.isFeatured ? <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-tda-navy">Unggulan</span> : null}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-tda-indigo">{program.divisionName}</p>
                  <h3 className="mt-3 text-lg font-semibold leading-snug text-tda-navy">{title}</h3>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-tda-muted">{program.tagline || "Lihat informasi lengkap program TDA Pekanbaru."}</p>
                  <p className="mt-5 flex items-center justify-between gap-3 border-t tda-hairline pt-4 text-sm font-semibold text-tda-muted">
                    <span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-tda-indigo" />{dateLabel(program.eventDate || program.startDate)}</span>
                    <ArrowUpRight className="size-4 text-tda-indigo transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/program" data-testid="programs-see-all-mobile-link" className="tda-btn tda-btn-primary sm:hidden">Semua Program <ArrowRight className="size-4" /></Link>
          <Link href="/kalender" data-testid="programs-calendar-link" className="tda-btn tda-btn-outline">Lihat Kalender Kegiatan <CalendarDays className="size-4" /></Link>
        </div>
      </div>
    </section>
  );
}

/** Agenda terdekat — tampil hanya jika section CMS "agenda" published + visible. Item = Program existing yang akan datang. */
function AgendaSection({ block, programs }: { block: PublicSectionBlock; programs: Program[] }) {
  const month = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "Asia/Jakarta" });
  return (
    <section id="agenda" data-testid="section-agenda" className="tda-section bg-white">
      <div className="tda-container grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHeading block={block} testId="agenda" />
          {block.body ? <p className="mt-5 max-w-md whitespace-pre-line leading-8 text-tda-muted">{block.body}</p> : null}
          <Link href="/kalender" data-testid="agenda-calendar-link" className="tda-btn tda-btn-outline mt-8">Buka Kalender <CalendarDays className="size-4" /></Link>
        </div>
        <ol className="border-t tda-hairline">
          {programs.map((program, index) => {
            const date = new Date(`${program.eventDate || program.startDate}T00:00:00+07:00`);
            return (
              <li key={program.programCode} className="border-b tda-hairline">
                <Link href={`/program/${program.programCode.toLowerCase()}`} data-testid={`agenda-item-${index}`}
                  className="tda-focus group grid grid-cols-[64px_1fr_auto] items-center gap-5 py-6">
                  <span className="text-center">
                    <span className="tda-display block text-[40px] leading-none text-tda-navy">{String(date.getDate()).padStart(2, "0")}</span>
                    <span className="mt-1 block text-xs font-bold uppercase tracking-[0.14em] text-tda-indigo">{month.format(date)}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold uppercase tracking-[0.14em] text-tda-muted">{program.divisionName}</span>
                    <span className="mt-1 block text-lg font-semibold leading-snug text-tda-navy">{program.publicTitle || program.programTitle}</span>
                  </span>
                  <ArrowUpRight className="size-5 text-tda-indigo transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/** Tentang TDA — section CMS "about" (published) → fallback teks profil existing (/tentang) + foto kegiatan statis. */
function AboutSection({ block }: { block: PublicSectionBlock | null }) {
  const about: PublicSectionBlock = block ?? {
    section: "about", eyebrow: "Tentang TDA Pekanbaru", title: "Rumah bertumbuh bagi pengusaha Pekanbaru.", subtitle: "",
    body: "Tangan Di Atas (TDA) Pekanbaru adalah komunitas pengusaha yang menjadi ruang belajar, membangun relasi, berbagi pengalaman, dan membuka peluang kolaborasi bisnis.",
    primaryCta: { label: "Kenali TDA Pekanbaru", href: "/tentang" }, secondaryCta: null, image: null, sortOrder: 30,
  };
  const image = about.image || "/hero/tda-hero-4-960.webp";
  return (
    <section id="tentang" data-testid="section-about" data-source={block ? "cms" : "fallback"} className="tda-section bg-white">
      <div className="tda-container grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--tda-radius-lg)] bg-tda-navy sm:aspect-[4/3] lg:aspect-[4/5]">
          {/* eslint-disable-next-line @next/next/no-img-element -- container ber-rasio tetap; gambar CMS atau WebP statis */}
          <img {...(about.image ? responsiveImage(image, [640, 828, 1080, 1200]) : { src: image, srcSet: "/hero/tda-hero-4-960.webp 960w, /hero/tda-hero-4-1920.webp 1920w" })}
            sizes="(min-width: 1024px) 560px, 100vw" alt={about.title || "Tentang TDA Pekanbaru"} data-testid="about-image"
            loading="lazy" decoding="async" className="size-full object-cover" />
        </div>
        <div>
          <SectionHeading block={about} testId="about" />
          {about.body ? <p data-testid="about-body" className="mt-6 max-w-xl whitespace-pre-line text-lg font-medium leading-8 text-tda-muted">{about.body}</p> : null}
          {about.primaryCta || about.secondaryCta ? (
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              {about.primaryCta ? <CtaButton cta={about.primaryCta} variant="primary" testId="about-primary-cta" /> : null}
              {about.secondaryCta ? <CtaButton cta={about.secondaryCta} variant="outline" testId="about-secondary-cta" /> : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ShowcaseSection({ id, testId, block, tone, children }: { id: string; testId: string; block: PublicSectionBlock; tone: "white" | "soft"; children: React.ReactNode }) {
  return (
    <section id={id} data-testid={testId} className={`tda-section overflow-hidden ${tone === "soft" ? "bg-tda-bg-soft" : "bg-white"}`}>
      <div className="tda-container">
        <SectionHeading block={block} testId={id} />
        {block.body ? <p className="mt-4 max-w-3xl whitespace-pre-line leading-7 text-tda-muted">{block.body}</p> : null}
        {children}
      </div>
    </section>
  );
}

export default async function Home() {
  const [data, programsResult] = await Promise.all([
    getPublicHomepage(),
    listPublicPrograms().catch(() => []),
  ]);
  const programs = programsResult.slice(0, 3);
  const { hero, settings } = data;
  const heroSlides = resolveHeroSlides(hero.images);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const upcoming = programsResult
    .filter((program) => (program.eventDate || program.startDate || "") >= today)
    .sort((a, b) => (a.eventDate || a.startDate).localeCompare(b.eventDate || b.startDate))
    .slice(0, 4);

  // Urutan: sort_order CMS (berlaku langsung di publik) → fallback DEFAULT_ORDER. Section non-CMS (Program) memakai
  // baris CMS "programs" hanya untuk posisi & visibilitas; datanya tetap dari sumber existing.
  const slot = (key: keyof typeof DEFAULT_ORDER) => ({
    visible: data.layout[key]?.isVisible ?? true,
    order: data.layout[key]?.sortOrder ?? DEFAULT_ORDER[key],
  });
  const middle: { key: keyof typeof DEFAULT_ORDER; order: number; node: React.ReactNode }[] = [];
  const add = (key: keyof typeof DEFAULT_ORDER, node: React.ReactNode, order = slot(key).order) => middle.push({ key, order, node });
  if (slot("impact").visible) add("impact", <ProofSection key="impact" impact={data.impact} programCount={programsResult.length} />);
  if (slot("programs").visible && programs.length) add("programs", <ProgramsSection key="programs" programs={programs} />);
  if (data.agenda && upcoming.length) add("agenda", <AgendaSection key="agenda" block={data.agenda} programs={upcoming} />, data.agenda.sortOrder);
  if (slot("about").visible) add("about", <AboutSection key="about" block={data.about} />);
  if (data.directory) add("business-directory", (
    <ShowcaseSection key="directory" id="direktori" testId="section-business-directory" block={data.directory} tone="soft">
      <HighlightMarquee items={data.directory.items} variant="business" />
    </ShowcaseSection>
  ), data.directory.sortOrder);
  if (data.spotlight) add("videos", (
    <ShowcaseSection key="spotlight" id="spotlight" testId="section-business-spotlight" block={data.spotlight} tone="white">
      <BusinessSpotlight items={data.spotlight.items} />
    </ShowcaseSection>
  ), data.spotlight.sortOrder);
  if (data.testimonials) add("testimonials", (
    <ShowcaseSection key="testimonials" id="testimoni" testId="section-testimonials" block={data.testimonials} tone="soft">
      <HighlightMarquee items={data.testimonials.items} variant="testimonial" />
    </ShowcaseSection>
  ), data.testimonials.sortOrder);
  // Galeri = media CMS (public_media aktif), tanpa baris section → posisi default.
  if (data.gallery.length) add("gallery", <PublicGallery key="gallery" items={data.gallery} />, DEFAULT_ORDER.gallery);
  middle.sort((a, b) => a.order - b.order || DEFAULT_ORDER[a.key] - DEFAULT_ORDER[b.key]);

  return (
    <main className="tda-public min-h-screen" data-testid="public-homepage">
      <PublicHeader siteName={settings.siteName} navigation={data.navigation} current="/" logo={data.headerLogo} />
      {/* 1. HERO — full-bleed: foto kegiatan sebagai background slider + konten overlay di kiri. */}
      <section id="hero" data-testid="section-hero" data-source={hero.fromCms ? "cms" : "fallback"}
        data-media-source={heroSlides.source} className="tda-hero relative isolate flex overflow-hidden bg-tda-navy text-white">
        <HeroBackdrop slides={heroSlides.slides} intervalMs={hero.intervalMs} />
        <div className="tda-hero-overlay pointer-events-none absolute inset-0 z-[1]" aria-hidden="true" />
        <div className="tda-container relative z-[2] flex flex-col justify-center pb-28 pt-16 md:pb-32 md:pt-20">
          <div className="max-w-[680px]">
            {hero.eyebrow ? (
              <p data-testid="hero-eyebrow" className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.24em] text-tda-soft">
                <span className="h-px w-10 bg-tda-soft/70" aria-hidden="true" />{hero.eyebrow}
              </p>
            ) : null}
            <h1 data-testid="hero-title" className="tda-hero-title mt-6 text-balance text-white">{hero.title}</h1>
            {hero.subtitle ? <p data-testid="hero-subtitle" className="mt-5 max-w-xl text-lg font-semibold leading-8 text-tda-soft">{hero.subtitle}</p> : null}
            {hero.body ? <p data-testid="hero-body" className="tda-hero-lead mt-6 max-w-[560px] whitespace-pre-line">{hero.body}</p> : null}
            {hero.primaryCta || hero.secondaryCta ? (
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {hero.primaryCta ? <CtaButton cta={hero.primaryCta} variant="light" arrow testId="hero-primary-cta" /> : null}
                {hero.secondaryCta ? <CtaButton cta={hero.secondaryCta} variant="ghost-dark" testId="hero-secondary-cta" /> : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* 2+. Section tengah — urutan & visibilitas mengikuti CMS (sort_order + is_visible); DEFAULT_ORDER = desain final. */}
      {middle.map((item) => item.node)}

      {/* CTA bergabung lama (section "cta" CMS) tidak di-render lagi: ajakan bergabung cukup di Footer CTA (hindari CTA ganda).
          Data CMS section "cta" tetap tersimpan, tidak diubah. */}
      <PublicFooter footer={data.footer} />
    </main>
  );
}
