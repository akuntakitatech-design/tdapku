"use client";

import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PublicMediaItem } from "@/db/public-media";
import { responsiveImage } from "@/lib/public-image";

export function PublicMediaShowcase({ items: allItems }: { items: PublicMediaItem[] }) {
  // Banner yang gagal dimuat disembunyikan → tidak ada broken image di website publik.
  const [failed, setFailed] = useState<number[]>([]);
  const items = allItems.filter((item) => !failed.includes(item.id));
  const [active, setActive] = useState(0);
  const touch = useRef(0);
  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(
      () => setActive((value) => (value + 1) % items.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [items.length]);
  if (!items.length) return null;
  const current = items[Math.min(active, items.length - 1)];
  const move = (step: number) =>
    setActive((value) => (value + step + items.length) % items.length);
  return (
    <section data-testid="banner-slider" className="bg-tda-navy px-4 pb-3 pt-3 sm:px-0 sm:pb-0 sm:pt-0">
      <div
        className="relative mx-auto aspect-[16/9] w-full overflow-hidden rounded-2xl bg-tda-surface-dark shadow-[var(--tda-shadow-md)] sm:h-[min(64vh,640px)] sm:aspect-auto sm:max-h-none sm:max-w-none sm:rounded-none"
        onTouchStart={(event) => {
          touch.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          const delta = event.changedTouches[0].clientX - touch.current;
          if (Math.abs(delta) > 45) move(delta > 0 ? -1 : 1);
        }}
      >
        {items.map((item, index) => (
          <img
            key={item.id}
            {...responsiveImage(`/api/public-media/${item.id}/image`, [640, 828, 1080, 1920], 1080)}
            sizes="(min-width: 1280px) 1200px, 100vw"
            decoding="async"
            alt={item.title || "Kegiatan TDA Pekanbaru"}
            className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${index === active ? "opacity-100" : "opacity-0"}`}
            loading={index === 0 ? "eager" : "lazy"}
            onError={() => setFailed((value) => [...value, item.id])}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,22,64,0.78)] via-[rgba(15,22,64,0.12)] to-transparent" />
        {(current.title || current.description) && (
          <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-9">
            <p data-testid="banner-title" className="tda-display max-w-3xl text-2xl sm:text-4xl">
              {current.title}
            </p>
            {current.description && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                {current.description}
              </p>
            )}
            {current.linkUrl && (
              <a
                href={current.linkUrl}
                data-testid="banner-link" className="tda-btn tda-btn-light mt-4 min-h-11 px-4 text-sm"
              >
                Lihat Selengkapnya
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>
        )}
        {items.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Banner sebelumnya"
              data-testid="banner-slider-prev-button"
              onClick={() => move(-1)}
              className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-[rgba(15,22,64,0.45)] text-white backdrop-blur transition-colors hover:bg-[rgba(15,22,64,0.7)] focus-visible:shadow-[var(--tda-ring)] focus-visible:outline-none"
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              aria-label="Banner berikutnya"
              data-testid="banner-slider-next-button"
              onClick={() => move(1)}
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-[rgba(15,22,64,0.45)] text-white backdrop-blur transition-colors hover:bg-[rgba(15,22,64,0.7)] focus-visible:shadow-[var(--tda-ring)] focus-visible:outline-none"
            >
              <ChevronRight />
            </button>
            <div className="absolute bottom-3 right-4 flex gap-1.5">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Buka banner ${index + 1}`}
                  data-testid={`banner-slider-dot-${index}`}
                  onClick={() => setActive(index)}
                  className={`h-2 rounded-full transition-[width,background-color] ${index === active ? "w-7 bg-white" : "w-2 bg-white/55"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export function PublicGallery({ items }: { items: PublicMediaItem[] }) {
  const [hidden, setHidden] = useState<number[]>([]);
  const visible = items.filter((item) => !hidden.includes(item.id));
  if (!visible.length) return null;
  return (
    <section id="galeri" data-testid="section-gallery" className="tda-section bg-white">
      <div className="tda-container">
        <p className="tda-eyebrow">Dokumentasi</p>
        <h2 className="tda-h2 mt-3 text-tda-navy">Kegiatan TDA Pekanbaru</h2>
        <p className="tda-lead mt-3 max-w-2xl">
          Momen belajar, berjejaring, dan bertumbuh bersama para pengusaha
          Pekanbaru.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((item, index) => (
            <a
              key={item.id}
              href={item.linkUrl || `/api/public-media/${item.id}/image`}
              target={item.linkUrl ? undefined : "_blank"}
              data-testid={`gallery-item-${index}`}
              className={`tda-focus group relative overflow-hidden rounded-[var(--tda-radius-md)] bg-tda-bg-tint ${index === 0 && visible.length > 2 ? "col-span-2 row-span-2" : ""}`}
            >
              <img
                {...responsiveImage(`/api/public-media/${item.id}/image`, [384, 640, 828, 1080], 640)}
                sizes={index === 0 && visible.length > 2 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                alt={item.title || "Dokumentasi TDA Pekanbaru"}
                loading="lazy"
                decoding="async"
                onError={() => setHidden((value) => [...value, item.id])}
                className="aspect-square size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,22,64,0.7)] via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-4">
                <p className="font-bold">
                  {item.title || "Kegiatan TDA Pekanbaru"}
                </p>
                {item.eventDate && (
                  <p className="mt-1 text-xs text-white/80">
                    {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "long",
                    }).format(new Date(`${item.eventDate}T00:00:00+07:00`))}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
