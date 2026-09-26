"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Background slider Hero (full-bleed). Performa:
 * - Hanya slide pertama yang di-render di HTML awal (eager + fetchPriority high). Slide lain baru di-mount
 *   (lazy) menjelang giliran tampil → tidak ada preload semua slide.
 * - Ukuran container ditentukan oleh section Hero (bukan oleh gambar) → gambar gagal/terlambat dimuat
 *   tidak pernah menggeser layout (CLS). Gambar gagal disembunyikan → tidak ada ikon gambar rusak.
 * - Animasi hanya opacity + transform. prefers-reduced-motion → tanpa autoplay & tanpa zoom.
 */
export type HeroSlide = { src: string; srcSet?: string; alt: string; position?: string };

export function HeroBackdrop({ slides, intervalMs }: { slides: HeroSlide[]; intervalMs: number }) {
  const [failed, setFailed] = useState<string[]>([]);
  const list = slides.filter((slide) => !failed.includes(slide.src));
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState<number[]>([0]);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const firstRef = useRef<HTMLImageElement>(null);
  const count = list.length;
  const current = count ? active % count : 0;

  const go = useCallback((index: number) => {
    if (!count) return;
    const next = (index + count) % count;
    setMounted((value) => (value.includes(next) ? value : [...value, next]));
    setActive(next);
  }, [count]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Gambar pertama yang sudah gagal SEBELUM hydration tidak memicu onError → periksa sekali setelah mount.
  useEffect(() => {
    const img = firstRef.current;
    if (img && img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
      setFailed((value) => [...value, img.getAttribute("data-slide-src") || ""]);
    }
  }, []);

  // Pre-mount slide berikutnya sedikit sebelum giliran tampil (lazy, satu per satu).
  useEffect(() => {
    if (count < 2) return;
    const next = (current + 1) % count;
    const timer = window.setTimeout(
      () => setMounted((value) => (value.includes(next) ? value : [...value, next])),
      Math.max(1200, intervalMs - 2000),
    );
    return () => window.clearTimeout(timer);
  }, [current, count, intervalMs]);

  useEffect(() => {
    if (count < 2 || paused || reduced) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") go(current + 1);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [count, paused, reduced, intervalMs, current, go]);

  return (
    <div className="absolute inset-0" data-testid="hero-backdrop" aria-roledescription="carousel" aria-label="Foto kegiatan TDA Pekanbaru"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {list.map((slide, index) => {
        const show = index === current;
        if (!mounted.includes(index) && index !== 0) return null;
        return (
          // eslint-disable-next-line @next/next/no-img-element -- srcSet responsif statis + container ber-dimensi tetap (tanpa optimizer runtime)
          <img key={slide.src} ref={index === 0 ? firstRef : undefined} src={slide.src} srcSet={slide.srcSet}
            sizes="100vw" alt={show ? slide.alt : ""} aria-hidden={show ? undefined : true}
            data-testid={`hero-slide-${index}`} data-active={show ? "true" : "false"} data-slide-src={slide.src}
            loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "low"} decoding="async"
            onError={() => setFailed((value) => [...value, slide.src])}
            style={{ objectPosition: slide.position || "center" }}
            className={`tda-hero-slide absolute inset-0 size-full object-cover ${show ? "is-active" : ""} ${reduced ? "is-static" : ""}`} />
        );
      })}

      {count > 1 ? (
        <div className="absolute inset-x-0 bottom-0 z-[3]">
          <div className="tda-container flex items-center justify-between gap-4 pb-6 md:pb-8">
            <div className="flex items-center gap-3" role="tablist" aria-label="Pilih foto">
              <span className="font-semibold tabular-nums text-xs tracking-[0.18em] text-white/80" data-testid="hero-slide-counter">
                {String(current + 1).padStart(2, "0")}<span className="mx-1.5 text-white/40">/</span>{String(count).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-1.5">
                {list.map((slide, index) => (
                  <button key={slide.src} type="button" role="tab" aria-selected={index === current} aria-label={`Tampilkan foto ${index + 1}`}
                    data-testid={`hero-slide-dot-${index}`} onClick={() => go(index)}
                    className="tda-focus group grid h-11 w-8 place-items-center md:w-10">
                    <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-white/30">
                      <span key={`${index}-${current}`}
                        className={`absolute inset-0 origin-left rounded-full bg-white ${index === current ? (paused || reduced ? "scale-x-100" : "tda-hero-progress") : "scale-x-0"}`}
                        style={index === current && !paused && !reduced ? { animationDuration: `${intervalMs}ms` } : undefined} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Foto sebelumnya" data-testid="hero-slide-prev" onClick={() => go(current - 1)}
                className="tda-focus grid size-11 place-items-center rounded-full border border-white/25 bg-white/[0.06] text-white backdrop-blur-md transition-colors duration-200 hover:bg-white/15 active:bg-white/25">
                <ChevronLeft className="size-5" />
              </button>
              <button type="button" aria-label="Foto berikutnya" data-testid="hero-slide-next" onClick={() => go(current + 1)}
                className="tda-focus grid size-11 place-items-center rounded-full border border-white/25 bg-white/[0.06] text-white backdrop-blur-md transition-colors duration-200 hover:bg-white/15 active:bg-white/25">
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
