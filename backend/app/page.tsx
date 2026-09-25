import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarDays, UserPlus, UsersRound } from "lucide-react";
import { listPublicPrograms } from "@/db/public-programs";
import { getPublicHomepage, type PublicCta, type PublicHomepage, type PublicSectionBlock } from "@/db/public-homepage";
import { PublicGallery, PublicMediaShowcase } from "@/components/public-media-showcase";
import { BusinessSpotlight } from "@/components/public-site/business-spotlight";
import { HighlightMarquee } from "@/components/public-site/highlight-marquee";
import { HeroMedia } from "@/components/public-site/hero-media";
import { PublicHeader } from "@/components/public-site/public-header";
import { PublicFooter } from "@/components/public-site/public-footer";
import { BungaCengkih, PucukRebung, SikuKeluangDivider } from "@/components/public-site/motif";

/*
 * Homepage publik — Website 00 (design system) + Website 01 (CMS existing → live, READ-ONLY).
 * Konten CMS hanya dari section published + visible (lihat db/public-homepage.ts).
 * Program terbaru = implementasi existing (listPublicPrograms) → DEFERRED TO WEBSITE 03.
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

function CtaButton({ cta, variant, testId }: { cta: PublicCta; variant: "primary" | "outline" | "light" | "ghost-dark"; testId: string }) {
  const external = /^https?:\/\//i.test(cta.href);
  return (
    <a href={cta.href} data-testid={testId} className={`tda-btn tda-btn-${variant}`}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {cta.label}
      {variant === "primary" ? <ArrowRight className="size-4" /> : null}
    </a>
  );
}

function SectionHeading({ block, align = "left", dark = false, testId }: { block: PublicSectionBlock; align?: "left" | "center"; dark?: boolean; testId: string }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {block.eyebrow ? (
        <p className={`tda-eyebrow ${dark ? "text-tda-soft" : ""}`} data-testid={`${testId}-eyebrow`}>
          <BungaCengkih strong className={`size-4 ${dark ? "text-tda-soft" : ""}`} />
          {block.eyebrow}
        </p>
      ) : null}
      {block.title ? <h2 data-testid={`${testId}-title`} className={`tda-h2 mt-3 ${dark ? "text-white" : "text-tda-navy"}`}>{block.title}</h2> : null}
      {block.subtitle ? (
        <p data-testid={`${testId}-subtitle`} className={`mt-4 text-lg leading-8 ${dark ? "text-[color:var(--tda-on-dark-muted)]" : "text-tda-muted"}`}>{block.subtitle}</p>
      ) : null}
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, text, testId }: { href: string; icon: typeof CalendarDays; title: string; text: string; testId: string }) {
  return (
    <a href={href} data-testid={testId} className="tda-card tda-card-link tda-focus group flex flex-col p-6">
      <span className="grid size-12 place-items-center rounded-2xl bg-tda-bg-tint text-tda-indigo">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-5 text-lg font-bold text-tda-navy">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-tda-muted">{text}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-tda-indigo">
        Buka <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
      </span>
    </a>
  );
}

function AboutSection({ block }: { block: PublicSectionBlock }) {
  return (
    <section id="tentang" data-testid="section-about" className="tda-section bg-white">
      <div className={`tda-container grid items-center gap-10 ${block.image ? "lg:grid-cols-[1.05fr_0.95fr] lg:gap-16" : ""}`}>
        <div>
          <SectionHeading block={block} testId="about" />
          {block.body ? <p data-testid="about-body" className="mt-5 max-w-2xl whitespace-pre-line text-base leading-8 text-tda-muted">{block.body}</p> : null}
          {block.primaryCta || block.secondaryCta ? (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {block.primaryCta ? <CtaButton cta={block.primaryCta} variant="primary" testId="about-primary-cta" /> : null}
              {block.secondaryCta ? <CtaButton cta={block.secondaryCta} variant="outline" testId="about-secondary-cta" /> : null}
            </div>
          ) : null}
        </div>
        {block.image ? (
          <div className="relative">
            <PucukRebung className="absolute -left-10 -top-10 hidden h-44 w-44 lg:block" />
            <img src={block.image} alt={block.title || "Tentang TDA Pekanbaru"} data-testid="about-image" loading="lazy"
              className="relative aspect-[4/3] w-full rounded-[var(--tda-radius-lg)] object-cover shadow-[var(--tda-shadow-md)]" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ImpactSection({ impact }: { impact: NonNullable<PublicHomepage["impact"]> }) {
  return (
    <section id="ekosistem" data-testid="section-impact" className="tda-section bg-tda-bg-soft">
      <div className="tda-container">
        <div className="relative overflow-hidden rounded-[var(--tda-radius-lg)] bg-tda-navy px-6 py-12 text-white md:px-12 md:py-16">
          <PucukRebung strong className="absolute -right-10 -top-12 h-56 w-56 text-tda-soft" />
          <div className={`relative grid gap-10 ${impact.image ? "lg:grid-cols-[1.1fr_0.9fr] lg:items-center" : ""}`}>
            <div>
              <SectionHeading block={impact} dark testId="impact" />
              {impact.body ? <p data-testid="impact-body" className="mt-5 max-w-2xl whitespace-pre-line leading-7 text-[color:var(--tda-on-dark-muted)]">{impact.body}</p> : null}
              <dl className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:gap-5">
                {impact.stats.map((stat, index) => (
                  <div key={stat.label + index} data-testid={`impact-stat-${index}`} className="min-w-0 rounded-2xl border border-white/15 bg-white/[0.06] p-4 sm:p-5">
                    <dt className="sr-only">{stat.label}</dt>
                    <dd data-testid={`impact-stat-${index}-value`} className="tda-display break-words text-[clamp(20px,5.2vw,40px)] leading-none text-white">{stat.value}</dd>
                    <dd data-testid={`impact-stat-${index}-label`} className="mt-2 text-sm font-semibold text-tda-soft">{stat.label}</dd>
                  </div>
                ))}
              </dl>
              {impact.primaryCta ? <div className="mt-8"><CtaButton cta={impact.primaryCta} variant="light" testId="impact-primary-cta" /></div> : null}
            </div>
            {impact.image ? (
              <img src={impact.image} alt={impact.title || "Ekosistem TDA Pekanbaru"} data-testid="impact-image" loading="lazy"
                className="aspect-[4/3] w-full rounded-2xl object-cover" />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

type Program = Awaited<ReturnType<typeof listPublicPrograms>>[number];

/** DEFERRED TO WEBSITE 03 — sumber data existing (Program Kerja publikasi) tidak diubah, hanya tampilan. */
function ProgramsSection({ programs }: { programs: Program[] }) {
  return (
    <section id="programs" data-testid="section-programs" className="tda-section bg-white">
      <div className="tda-container">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="tda-eyebrow"><BungaCengkih strong className="size-4" />Pilihan untuk Anda</p>
            <h2 className="tda-h2 mt-3 text-tda-navy">Program terbaru</h2>
          </div>
          <Link href="/program" data-testid="programs-see-all-link" className="tda-link hidden items-center gap-1 text-sm sm:inline-flex">
            Lihat semuanya <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program, index) => (
            <Link key={program.programCode} href={`/program/${program.programCode.toLowerCase()}`} data-testid={`program-card-${index}`}
              className="tda-card tda-card-link tda-focus group overflow-hidden">
              <div className="aspect-[16/10] overflow-hidden bg-tda-bg-tint">
                {program.flyerKey ? (
                  <img src={`/api/public-programs/${program.programCode}/flyer`} alt={`Flyer ${program.publicTitle || program.programTitle}`}
                    loading="lazy" className="size-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <div className="relative flex size-full flex-col justify-between p-6 text-tda-navy">
                    <PucukRebung className="absolute -bottom-8 -right-8 h-40 w-40" />
                    <BookOpenCheck className="size-8 text-tda-indigo" />
                    <h3 className="tda-display text-2xl leading-tight">{program.publicTitle || program.programTitle}</h3>
                  </div>
                )}
              </div>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-tda-indigo">{program.divisionName}</p>
                <h3 className="mt-2 text-lg font-bold text-tda-navy">{program.publicTitle || program.programTitle}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-tda-muted">{program.tagline || "Lihat informasi lengkap program TDA Pekanbaru."}</p>
                <p className="mt-4 flex items-center gap-2 border-t border-[color:var(--tda-border)] pt-4 text-sm font-semibold text-tda-muted">
                  <CalendarDays className="size-4 text-tda-indigo" />
                  {dateLabel(program.eventDate || program.startDate)}
                </p>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/program" data-testid="programs-see-all-mobile-link" className="tda-btn tda-btn-outline mt-6 w-full sm:hidden">
          Lihat Semua Program <ArrowRight className="size-4" />
        </Link>
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

  // Section CMS tengah mengikuti sort_order CMS; Program existing di posisi 40 (urutan section "programs").
  const middle: { order: number; node: React.ReactNode }[] = [];
  if (data.about) middle.push({ order: data.about.sortOrder, node: <AboutSection key="about" block={data.about} /> });
  if (data.impact) middle.push({ order: data.impact.sortOrder, node: <ImpactSection key="impact" impact={data.impact} /> });
  if (programs.length) middle.push({ order: 40, node: <ProgramsSection key="programs" programs={programs} /> });
  if (data.spotlight) middle.push({
    order: data.spotlight.sortOrder,
    node: (
      <ShowcaseSection key="spotlight" id="spotlight" testId="section-business-spotlight" block={data.spotlight} tone="soft">
        <BusinessSpotlight items={data.spotlight.items} />
      </ShowcaseSection>
    ),
  });
  if (data.directory) middle.push({
    order: data.directory.sortOrder,
    node: (
      <ShowcaseSection key="directory" id="direktori" testId="section-business-directory" block={data.directory} tone="white">
        <HighlightMarquee items={data.directory.items} variant="business" />
      </ShowcaseSection>
    ),
  });
  if (data.testimonials) middle.push({
    order: data.testimonials.sortOrder,
    node: (
      <ShowcaseSection key="testimonials" id="testimoni" testId="section-testimonials" block={data.testimonials} tone="soft">
        <HighlightMarquee items={data.testimonials.items} variant="testimonial" />
      </ShowcaseSection>
    ),
  });
  middle.sort((a, b) => a.order - b.order);

  return (
    <main className="tda-public min-h-screen" data-testid="public-homepage">
      <PublicHeader siteName={settings.siteName} navigation={data.navigation} current="/" />
      <PublicMediaShowcase items={data.banners} />

      {/* HERO */}
      <section id="hero" data-testid="section-hero" data-source={hero.fromCms ? "cms" : "fallback"} className="relative overflow-hidden bg-tda-bg-soft">
        <div className="absolute -right-40 top-1/2 hidden size-[720px] -translate-y-1/2 rounded-full blur-3xl lg:block"
          style={{ background: "radial-gradient(circle, rgba(199,209,255,0.7) 0%, rgba(199,209,255,0) 70%)" }} aria-hidden="true" />
        <PucukRebung className="absolute -right-8 -top-10 h-64 w-64 md:h-80 md:w-80" testId="hero-motif" />
        <div className="tda-container relative grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
          <div>
            {hero.eyebrow ? (
              <p data-testid="hero-eyebrow" className="inline-flex items-center gap-2 rounded-full border border-[color:var(--tda-border-strong)] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-tda-indigo">
                <BungaCengkih strong className="size-4" />{hero.eyebrow}
              </p>
            ) : null}
            <h1 data-testid="hero-title" className="tda-h1 mt-6 text-tda-navy">{hero.title}</h1>
            {hero.subtitle ? <p data-testid="hero-subtitle" className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-tda-indigo">{hero.subtitle}</p> : null}
            {hero.body ? <p data-testid="hero-body" className="tda-lead mt-5 max-w-2xl whitespace-pre-line">{hero.body}</p> : null}
            {hero.primaryCta || hero.secondaryCta ? (
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                {hero.primaryCta ? <CtaButton cta={hero.primaryCta} variant="primary" testId="hero-primary-cta" /> : null}
                {hero.secondaryCta ? <CtaButton cta={hero.secondaryCta} variant="outline" testId="hero-secondary-cta" /> : null}
              </div>
            ) : null}
          </div>
          <HeroMedia images={hero.images} intervalMs={hero.intervalMs} />
        </div>
      </section>

      {/* Akses cepat (existing, hardcoded) */}
      <section data-testid="section-quick-links" className="bg-white py-12 md:py-16">
        <div className="tda-container grid gap-5 md:grid-cols-3">
          <QuickLink href="/tentang" icon={UsersRound} title="Profil TDA Pekanbaru" testId="quick-link-profil"
            text="Kenali komunitas, semangat, divisi, dan ruang kolaborasi TDA Pekanbaru." />
          <QuickLink href="/kalender" icon={CalendarDays} title="Kalender Kegiatan" testId="quick-link-kalender"
            text="Lihat agenda kegiatan publik berdasarkan bulan, divisi, dan jenis acara." />
          <QuickLink href="/member" icon={UserPlus} title="Pendaftaran Member" testId="quick-link-member"
            text="Registrasi Member Baru, Member Existing, dan Kelas Reguler." />
        </div>
      </section>

      <SikuKeluangDivider className="tda-container" testId="divider-motif" />

      {middle.map((item) => item.node)}

      {data.gallery.length ? <PublicGallery items={data.gallery} /> : null}

      {/* CTA bergabung */}
      <section id="join" data-testid="section-join-cta" data-source={data.cta.fromCms ? "cms" : "fallback"} className="bg-white pb-16 pt-6 md:pb-20 md:pt-10">
        <div className="tda-container">
          <div className="relative overflow-hidden rounded-[var(--tda-radius-lg)] border border-[color:var(--tda-border)] bg-tda-bg-tint px-6 py-12 md:px-12">
            <div className="absolute -right-16 -top-16 hidden size-56 rounded-full opacity-90 lg:block" style={{ backgroundImage: "var(--tda-gradient)" }} aria-hidden="true" />
            <PucukRebung strong className="absolute -right-4 -top-6 hidden h-44 w-44 text-white lg:block" />
            <PucukRebung className="absolute -bottom-16 left-1/3 hidden h-40 w-40 md:block" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl lg:pr-40">
                {data.cta.eyebrow ? <p className="tda-eyebrow" data-testid="join-cta-eyebrow">{data.cta.eyebrow}</p> : null}
                <h2 data-testid="join-cta-title" className="tda-h2 mt-2 text-tda-navy">{data.cta.title}</h2>
                {data.cta.subtitle ? <p data-testid="join-cta-subtitle" className="mt-3 text-lg font-semibold text-tda-indigo">{data.cta.subtitle}</p> : null}
                {data.cta.body ? <p data-testid="join-cta-body" className="mt-3 whitespace-pre-line leading-7 text-tda-muted">{data.cta.body}</p> : null}
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                {data.cta.primaryCta ? <CtaButton cta={data.cta.primaryCta} variant="primary" testId="join-cta-primary-button" /> : null}
                {data.cta.secondaryCta ? <CtaButton cta={data.cta.secondaryCta} variant="outline" testId="join-cta-secondary-button" /> : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter settings={settings} navigation={data.navigation} />
    </main>
  );
}
