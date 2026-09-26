"use client";

import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";

type Spotlight = {
  brand:string;
  owner:string;
  position?:string;
  category?:string;
  story?:string;
  videoUrl:string;
  isVisible?:boolean;
};

function youtubeId(url:string) {
  if(!url)return "";
  try {
    const u=new URL(url);
    if(u.hostname.includes("youtu.be"))
      return u.pathname.replace("/","").split("?")[0];

    if(u.pathname.startsWith("/shorts/"))
      return u.pathname.split("/shorts/")[1]?.split("/")[0]||"";

    if(u.pathname.startsWith("/embed/"))
      return u.pathname.split("/embed/")[1]?.split("/")[0]||"";

    return u.searchParams.get("v")||"";
  } catch {
    return "";
  }
}

function thumbnail(url:string) {
  const id=youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
}

export function BusinessSpotlight({items}:{items:Spotlight[]}) {
  const visible=items.filter(x=>x.isVisible!==false && youtubeId(x.videoUrl));
  const [active,setActive]=useState(0);
  const [playing,setPlaying]=useState<Spotlight|null>(null);

  useEffect(()=>{
    if(visible.length<2 || playing)return;
    const timer=window.setInterval(()=>{
      setActive(v=>(v+1)%visible.length);
    },6000);
    return()=>window.clearInterval(timer);
  },[visible.length,playing]);

  if(!visible.length)return null;

  const hero=visible[active%visible.length];
  const nextItems=[1,2,3]
    .map(offset=>visible[(active+offset)%visible.length])
    .filter(Boolean);

  return (
    <div data-testid="business-spotlight" className="business-spotlight-layout mt-10">
      <article
        key={active}
        data-testid="business-spotlight-featured" className="business-spotlight-main group overflow-hidden rounded-[var(--tda-radius-lg)] border border-[color:var(--tda-border)] bg-white shadow-[var(--tda-shadow-md)]"
      >
        <div className="relative aspect-video overflow-hidden bg-tda-surface-dark">
          {playing ? (
            <>
              <iframe
                key={youtubeId(playing.videoUrl)}
                src={`https://www.youtube-nocookie.com/embed/${youtubeId(playing.videoUrl)}?autoplay=1&rel=0`}
                title={`Video ${playing.brand}`}
                className="absolute inset-0 h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
              <button
                type="button"
                onClick={()=>setPlaying(null)}
                data-testid="business-spotlight-close-button"
                className="absolute right-4 top-4 z-20 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[rgba(15,22,64,0.75)] px-3 text-xs font-bold text-white focus-visible:shadow-[var(--tda-ring)] focus-visible:outline-none"
              >
                <X className="size-4" /> Tutup Video
              </button>
            </>
          ) : (
            <>
              <img
                src={thumbnail(hero.videoUrl)}
                alt={hero.brand}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,22,64,0.75)] via-[rgba(15,22,64,0.1)] to-transparent" />

              <button
                type="button"
                onClick={()=>setPlaying(hero)}
                className="absolute inset-0 flex items-center justify-center focus-visible:outline-none"
                aria-label={`Putar video ${hero.brand}`}
                data-testid="business-spotlight-play-button"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-tda-indigo shadow-xl transition-transform duration-200 group-hover:scale-105">
                  <Play className="ml-1 size-7 fill-current" />
                </span>
              </button>
            </>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            {hero.category ? (
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                {hero.category}
              </p>
            ) : null}

            <h3 className="tda-display mt-2 text-2xl md:text-3xl">
              {hero.brand}
            </h3>

            <p className="mt-1 text-sm text-white/80">
              {hero.owner}
              {hero.position ? ` • ${hero.position}` : ""}
            </p>
          </div>
        </div>

        {hero.story ? (
          <div className="p-6">
            <p className="text-base italic leading-7 text-tda-muted">
              “{hero.story}”
            </p>
          </div>
        ) : null}
      </article>

      <div
        key={active}
        className="business-spotlight-queue overflow-hidden"
      >
        {nextItems.map((item,i)=>(
          <button
            key={`${item.brand}-${i}`}
            type="button"
            data-testid={`business-spotlight-queue-${i}`}
            onClick={()=>{
              setActive(visible.indexOf(item));
              setPlaying(item);
            }}
            className="group flex w-full items-center gap-4 rounded-[var(--tda-radius-md)] border border-[color:var(--tda-border)] bg-white p-3 text-left shadow-[var(--tda-shadow-sm)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--tda-shadow-md)] focus-visible:shadow-[var(--tda-ring)] focus-visible:outline-none"
          >
            <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-tda-bg-tint">
              <img
                src={thumbnail(item.videoUrl)}
                alt={item.brand}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow">
                <Play className="size-6 fill-current" />
              </span>
            </div>

            <div className="min-w-0">
              <p className="truncate font-bold text-tda-navy">
                {item.brand}
              </p>
              <p className="mt-1 truncate text-sm text-tda-muted">
                {item.owner}
              </p>
              {item.category ? (
                <p className="mt-2 text-xs font-semibold uppercase text-tda-indigo">
                  {item.category}
                </p>
              ) : null}
            </div>
          </button>
        ))}
      </div>

    </div>
  );
}
