/**
 * Intro halaman publik (judul + deskripsi) di bawah PublicHeader.
 * Bahasa visual sama dengan Hero homepage: Deep Navy, eyebrow bergaris tipis, headline Instrument Serif.
 * Ornamen lama (MotifTile + divider Siku Keluang) dihapus dari render — presentasi saja.
 */
export function PublicPageIntro({ eyebrow, title, lead, testId, containerClassName = "tda-container" }: {
  eyebrow: string; title: string; lead: string; testId: string;
  /** Disamakan dengan lebar container body halaman agar teks intro sejajar dengan konten. */
  containerClassName?: string;
}) {
  return (
    <section data-testid={testId} className="relative overflow-hidden bg-tda-navy text-[color:var(--tda-on-dark)]">
      <div aria-hidden="true" className="tda-intro-glow absolute inset-0" />
      <div className={`${containerClassName} relative pb-14 pt-14 md:pb-20 md:pt-20`}>
        <div className="max-w-3xl">
          <p data-testid={`${testId}-eyebrow`} className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-tda-soft">
            <span className="h-px w-10 bg-tda-soft/70" aria-hidden="true" />{eyebrow}
          </p>
          <h1 data-testid={`${testId}-title`} className="tda-display mt-5 text-balance text-[38px] leading-[1.06] md:text-[56px]">{title}</h1>
          <p data-testid={`${testId}-lead`} className="mt-5 max-w-2xl text-base font-medium leading-7 text-[color:var(--tda-on-dark-muted)] md:text-lg md:leading-8">{lead}</p>
        </div>
      </div>
    </section>
  );
}
