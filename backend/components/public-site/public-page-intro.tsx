import { MotifTile, SikuKeluangDivider } from "@/components/public-site/motif";

/**
 * Intro halaman publik (judul + deskripsi) di bawah PublicHeader (Website 02).
 * Presentasi saja: teks dikirim apa adanya oleh halaman pemanggil. Deep Navy + gradient TDA sangat tipis.
 */
export function PublicPageIntro({ eyebrow, title, lead, testId, containerClassName = "tda-container" }: {
  eyebrow: string; title: string; lead: string; testId: string;
  /** Disamakan dengan lebar container body halaman agar teks intro sejajar dengan konten. */
  containerClassName?: string;
}) {
  return (
    <section data-testid={testId} className="relative overflow-hidden bg-tda-navy text-[color:var(--tda-on-dark)]">
      <div aria-hidden="true" className="absolute inset-0 opacity-40" style={{ backgroundImage: "var(--tda-gradient)" }} />
      <MotifTile className="absolute right-0 top-0 h-64 w-64 md:h-80 md:w-[26rem]" />
      <div className={`${containerClassName} relative pb-12 pt-12 md:pb-16 md:pt-16`}>
        <div className="max-w-3xl">
          <p data-testid={`${testId}-eyebrow`} className="text-xs font-bold uppercase tracking-[0.18em] text-tda-soft md:text-sm">{eyebrow}</p>
          <h1 data-testid={`${testId}-title`} className="tda-display mt-4 text-[36px] leading-[1.1] md:text-[48px]">{title}</h1>
          <p data-testid={`${testId}-lead`} className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--tda-on-dark-muted)] md:text-lg md:leading-8">{lead}</p>
        </div>
      </div>
      <SikuKeluangDivider strong className="relative [filter:brightness(2.4)]" />
    </section>
  );
}
