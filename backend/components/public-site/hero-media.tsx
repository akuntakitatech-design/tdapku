"use client";

import { useEffect, useState } from "react";
import { BungaCengkih, PucukRebung } from "@/components/public-site/motif";

type HeroImage = { src: string; alt: string };

/** Slider foto Hero (foto kegiatan asli dari CMS). Foto gagal dimuat disembunyikan → tidak ada broken image. */
export function HeroMedia({ images, intervalMs }: { images: HeroImage[]; intervalMs: number }) {
  const [failed, setFailed] = useState<string[]>([]);
  const list = images.filter((image) => !failed.includes(image.src));
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (list.length < 2) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % list.length), intervalMs);
    return () => window.clearInterval(timer);
  }, [list.length, intervalMs]);

  if (!list.length) {
    return (
      <div data-testid="hero-media-placeholder" className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--tda-radius-lg)] bg-tda-navy">
        <div className="absolute inset-0" style={{ backgroundImage: "var(--tda-gradient)" }} />
        <PucukRebung strong className="absolute -bottom-6 -right-6 h-64 w-64 text-white" />
        <BungaCengkih strong className="absolute left-8 top-8 h-20 w-20 text-white" />
        <div className="absolute inset-x-8 bottom-8 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-tda-soft">Pekanbaru · Riau</p>
          <p className="tda-display mt-2 text-3xl leading-tight">Tangan Di Atas</p>
        </div>
      </div>
    );
  }

  const current = active % list.length;
  return (
    <div data-testid="hero-media-slider" className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--tda-radius-lg)] bg-tda-bg-tint shadow-[var(--tda-shadow-md)]">
      {list.map((image, index) => (
        <img key={image.src} src={image.src} alt={image.alt} data-testid={`hero-media-image-${index}`}
          loading={index === 0 ? "eager" : "lazy"}
          onError={() => setFailed((value) => [...value, image.src])}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${index === current ? "opacity-100" : "opacity-0"}`} />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[rgba(15,22,64,0.45)] to-transparent" />
      {list.length > 1 ? (
        <div className="absolute bottom-4 right-4 flex gap-1.5">
          {list.map((image, index) => (
            <button key={image.src} type="button" aria-label={`Tampilkan foto ${index + 1}`} data-testid={`hero-media-dot-${index}`}
              onClick={() => setActive(index)}
              className={`tda-focus h-2.5 rounded-full transition-[width,background-color] duration-300 ${index === current ? "w-8 bg-white" : "w-2.5 bg-white/60 hover:bg-white/80"}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
