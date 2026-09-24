"use client";

import { useEffect, useState } from "react";

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
    setActive(0);
  },[visible.length]);

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
    <div className="business-spotlight-layout mt-10">
      <article
        key={active}
        className="business-spotlight-main group overflow-hidden rounded-[28px] border bg-white shadow-lg"
      >
        <div className="relative aspect-video overflow-hidden bg-slate-900">
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
                className="absolute right-4 top-4 z-20 rounded-lg bg-black/65 px-3 py-2 text-xs font-bold text-white"
              >
                ✕ Tutup Video
              </button>
            </>
          ) : (
            <>
              <img
                src={thumbnail(hero.videoUrl)}
                alt={hero.brand}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

              <button
                type="button"
                onClick={()=>setPlaying(hero)}
                className="absolute inset-0 flex items-center justify-center"
                aria-label={`Putar video ${hero.brand}`}
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-2xl shadow-xl">
                  ▶
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

            <h3 className="mt-2 text-2xl font-bold md:text-3xl">
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
            <p className="text-base italic leading-7 text-slate-600">
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
            onClick={()=>{
              setActive(visible.indexOf(item));
              setPlaying(item);
            }}
            className="group flex w-full items-center gap-4 rounded-2xl border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              <img
                src={thumbnail(item.videoUrl)}
                alt={item.brand}
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center text-xl text-white drop-shadow">
                ▶
              </span>
            </div>

            <div className="min-w-0">
              <p className="truncate font-bold text-slate-900">
                {item.brand}
              </p>
              <p className="mt-1 truncate text-sm text-slate-500">
                {item.owner}
              </p>
              {item.category ? (
                <p className="mt-2 text-xs font-semibold uppercase text-amber-700">
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
