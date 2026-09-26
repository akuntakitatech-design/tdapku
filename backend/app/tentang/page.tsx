import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { PublicShell } from "@/components/public-site/public-shell";
import { PublicPageIntro } from "@/components/public-site/public-page-intro";

// Header/Footer global membaca CMS saat request (sama seperti homepage) — bukan snapshot saat build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tentang TDA Pekanbaru 9.0",
  description: "Kenali TDA Pekanbaru, ekosistem pengusaha untuk belajar, bertumbuh, dan berkolaborasi.",
  openGraph: { title: "Tentang TDA Pekanbaru 9.0", description: "Ekosistem pengusaha Pekanbaru untuk belajar, bertumbuh, dan berkolaborasi.", type: "website", locale: "id_ID", images: [] },
};

/*
 * /tentang — final design system (Deep Navy + Instrument Serif/Manrope). Konten teks sama dengan versi sebelumnya;
 * palet hijau legacy + kartu-kartu lama diganti layout editorial. Presentasi saja (tanpa data/API).
 */
const divisions = ["Edukasi", "TDA Peduli", "Marcomm", "Gen TDA", "Kerjasama Eksternal", "TDA Fun", "Pelayanan Anggota & Data", "TDA Perempuan", "TDA Event"];
const values = [
  { title: "Terhubung", text: "Memperluas relasi lintas bidang usaha dan bertemu partner yang tepat." },
  { title: "Terus Belajar", text: "Mengikuti kelas, mentoring, sharing, dan program pengembangan bisnis." },
  { title: "Berkolaborasi", text: "Membuka peluang kerja sama, referral, dan pertumbuhan bersama anggota." },
];
const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Gedung+Menara+Poltekkes+Kemenkes+Riau+Jl.+Melur+No.+26+Pekanbaru";

export default async function AboutPage() {
  return (
    <PublicShell current="/tentang">
      <main className="bg-white text-tda-ink" data-testid="public-about-page">
        <PublicPageIntro testId="about-intro" eyebrow="Tentang TDA Pekanbaru" title="Rumah bertumbuh bagi pengusaha Pekanbaru."
          lead="Tangan Di Atas (TDA) Pekanbaru adalah komunitas pengusaha yang menjadi ruang belajar, membangun relasi, berbagi pengalaman, dan membuka peluang kolaborasi bisnis." />

        {/* Nilai komunitas — daftar editorial bernomor (bukan kartu). */}
        <section className="tda-section" data-testid="about-values">
          <div className="tda-container">
            <p className="tda-kicker">Semangat kami</p>
            <div className="mt-10 grid border-t tda-hairline md:grid-cols-3">
              {values.map((value, index) => (
                <article key={value.title} data-testid={`about-value-${index}`}
                  className="border-b tda-hairline py-8 md:border-b-0 md:border-r md:px-8 md:py-10 md:first:pl-0 md:last:border-r-0">
                  <p className="text-sm font-semibold tabular-nums text-tda-indigo">0{index + 1}</p>
                  <h2 className="tda-display mt-4 text-[32px] leading-[1.1] text-tda-navy">{value.title}</h2>
                  <p className="mt-3 max-w-sm leading-7 text-tda-muted">{value.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Kepengurusan 9.0 + divisi penggerak */}
        <section className="tda-section bg-tda-bg-soft" data-testid="about-nine">
          <div className="tda-container grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--tda-radius-lg)] bg-tda-navy">
              {/* eslint-disable-next-line @next/next/no-img-element -- aset statis WebP responsif, container ber-rasio tetap */}
              <img src="/hero/tda-hero-2-960.webp" srcSet="/hero/tda-hero-2-960.webp 960w, /hero/tda-hero-2-1920.webp 1920w"
                sizes="(min-width: 1024px) 600px, 100vw" alt="Kegiatan TDA Pekanbaru 9.0" loading="lazy" decoding="async"
                className="size-full object-cover" data-testid="about-nine-image" />
            </div>
            <div>
              <p className="tda-kicker">TDA Pekanbaru 9.0</p>
              <h2 className="tda-h2 mt-4 text-tda-navy">Let&apos;s 9.0 Together</h2>
              <p className="mt-5 leading-8 text-tda-muted">
                Kepengurusan 9.0 membawa semangat <strong className="font-semibold text-tda-navy">#RiangGembira</strong>: bertumbuh dengan riang, berdampak dengan gembira. Program dijalankan lintas divisi agar kebutuhan belajar, jejaring, sosial, dan kolaborasi anggota dapat bergerak bersama.
              </p>
              <h3 className="mt-10 text-sm font-bold uppercase tracking-[0.16em] text-tda-navy">Divisi Penggerak</h3>
              <ul className="mt-4 flex flex-wrap gap-2" data-testid="about-divisions">
                {divisions.map((division) => (
                  <li key={division} className="rounded-full border border-[color:var(--tda-border-strong)] bg-white px-4 py-2 text-sm font-semibold text-tda-navy">{division}</li>
                ))}
              </ul>
              <Link href="/program" data-testid="about-programs-link" className="tda-btn tda-btn-primary mt-10">Lihat Program Kami<ArrowRight className="size-4" /></Link>
            </div>
          </div>
        </section>

        {/* Sekretariat + ajakan bergabung */}
        <section className="tda-section" data-testid="about-contact">
          <div className="tda-container">
            <div className="grid overflow-hidden rounded-[var(--tda-radius-lg)] bg-tda-navy text-white lg:grid-cols-[1.1fr_0.9fr]">
              <div className="p-8 sm:p-12">
                <p className="tda-kicker tda-kicker-dark"><MapPin className="size-4" />Sekretariat</p>
                <h2 className="tda-display mt-5 text-[34px] leading-[1.1] md:text-[40px]">Sekretariat TDA Pekanbaru</h2>
                <address className="mt-5 not-italic leading-8 text-[color:var(--tda-on-dark-muted)]">Gedung Menara Poltekkes Kemenkes Riau, Lantai 8<br />Jl. Melur No. 26, Padang Bulan, Senapelan<br />Kota Pekanbaru, Riau 28156</address>
                <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" data-testid="about-maps-link" className="tda-btn tda-btn-ghost-dark mt-8">Buka Google Maps<ArrowUpRight className="size-4" /></a>
              </div>
              <div className="flex flex-col justify-center border-t border-white/10 bg-white/[0.04] p-8 sm:p-12 lg:border-l lg:border-t-0">
                <h2 className="tda-display text-[34px] leading-[1.1] md:text-[40px]">Mari tumbuh bersama.</h2>
                <p className="mt-4 leading-7 text-[color:var(--tda-on-dark-muted)]">Bergabung dalam ekosistem TDA Pekanbaru dan temukan ruang belajar serta kolaborasi untuk bisnis Anda.</p>
                <Link href="/member" data-testid="about-member-link" className="tda-btn tda-btn-light mt-8 self-start">Daftar Member &amp; Kelas Reguler<ArrowRight className="size-4" /></Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
