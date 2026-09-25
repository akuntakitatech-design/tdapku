"use client";

import { useEffect, useState } from "react";
import { Quote, Store } from "lucide-react";

/** Gambar dengan fallback: bila tidak tersedia/gagal dimuat → placeholder rapi (tidak ada broken image). */
function SafeImage({ src, available, alt, className, fallback, testId }: {
  src: string; available?: boolean; alt: string; className: string; fallback: React.ReactNode; testId?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (available === false || failed) return <>{fallback}</>;
  return <img src={src} alt={alt} className={className} loading="lazy" data-testid={testId} onError={() => setFailed(true)} />;
}

type MarqueeItem = {
  id: number;
  businessName?: string; businessDescription?: string; businessCategory?: string; businessLocation?: string;
  memberName?: string; positionTitle?: string; testimonial?: string;
  hasBusinessPhoto?: boolean; hasLogo?: boolean; hasProfilePhoto?: boolean;
};

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "TDA";
}

export function HighlightMarquee({
  items,
  variant,
}: {
  items:MarqueeItem[];
  variant:"business"|"testimonial";
}) {
  const [active,setActive]=useState(0);

  useEffect(()=>{
    if(items.length<2) return;

    const id=window.setInterval(()=>{
      setActive(v=>(v+1)%items.length);
    },4500);

    return()=>window.clearInterval(id);
  },[items.length]);

  if(!items.length) {
    return (
      <div data-testid={`${variant}-marquee-empty`} className="mt-8 rounded-2xl border border-dashed border-[color:var(--tda-border-strong)] p-8 text-center text-sm text-tda-muted">
        Belum ada konten yang dipublikasikan.
      </div>
    );
  }

  const hero=items[active%items.length];
  const loop=items.length>1?[...items,...items]:items;
  const image=(x:MarqueeItem,type:string)=>
    `/api/public/member-content/image?id=${x.id}&type=${type}`;
  const title=(x:MarqueeItem)=>variant==="business" ? x.businessName : x.memberName;
  const text=(x:MarqueeItem)=>variant==="business" ? x.businessDescription : x.testimonial;
  const meta=(x:MarqueeItem)=>variant==="business"
    ? [x.businessCategory,x.businessLocation].filter(Boolean).join(" · ")
    : [x.positionTitle,x.businessName].filter(Boolean).join(" · ");
  const photoAvailable=(x:MarqueeItem)=>variant==="business" ? x.hasBusinessPhoto : x.hasProfilePhoto;

  const placeholder=(x:MarqueeItem,size:"lg"|"sm")=>(
    <div className="relative flex size-full items-center justify-center bg-tda-bg-tint text-tda-indigo">
      {variant==="business"
        ? <Store className={size==="lg"?"size-12":"size-8"} />
        : <span className={`tda-display ${size==="lg"?"text-5xl":"text-3xl"}`}>{initials(x.memberName||"")}</span>}
    </div>
  );

  return (
    <div data-testid={`${variant}-marquee`} className="tda-showcase -mx-5 mt-10 overflow-hidden md:-mx-8">
      <div className="flex flex-col items-stretch gap-5 px-5 md:flex-row md:px-8">
        <article data-testid={`${variant}-marquee-featured`} className="w-full shrink-0 overflow-hidden rounded-[var(--tda-radius-lg)] border border-[color:var(--tda-border)] bg-white shadow-[var(--tda-shadow-md)] md:w-[400px]">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-tda-bg-tint">
            <SafeImage
              src={image(hero,variant==="business"?"business":"profile")}
              available={photoAvailable(hero)}
              alt={title(hero) || ""}
              className={
                variant==="business"
                  ? "h-full w-full bg-tda-bg-soft object-contain object-center p-3"
                  : "h-full w-full object-cover object-center"
              }
              fallback={placeholder(hero,"lg")}
            />
            {variant==="business" ? (
              <SafeImage
                src={image(hero,"logo")}
                available={hero.hasLogo}
                className="absolute bottom-4 left-4 h-16 w-16 rounded-2xl border border-[color:var(--tda-border)] bg-white object-contain p-2 shadow-md"
                alt="Logo usaha"
                fallback={null}
              />
            ) : null}
          </div>
          <div className="p-6">
            {variant==="testimonial" ? <Quote className="size-6 text-tda-violet" /> : null}
            <h3 className="mt-1 text-xl font-bold text-tda-navy">{title(hero)}</h3>
            {meta(hero) ? <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-tda-indigo">{meta(hero)}</p> : null}
            <p className="mt-3 line-clamp-5 text-sm leading-6 text-tda-muted">
              {variant==="business" ? text(hero) : `“${text(hero)}”`}
            </p>
          </div>
        </article>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className={`flex w-max gap-4 ${items.length>1?"tda-showcase-track":""}`}>
            {loop.map((x:MarqueeItem,i:number)=>(
              <article key={`${x.id}-${i}`} data-testid={`${variant}-marquee-card-${i}`} className="w-[250px] shrink-0 overflow-hidden rounded-[var(--tda-radius-md)] border border-[color:var(--tda-border)] bg-white shadow-[var(--tda-shadow-sm)]">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-tda-bg-tint">
                  <SafeImage
                    src={image(x,variant==="business"?"business":"profile")}
                    available={photoAvailable(x)}
                    alt={title(x) || ""}
                    className={
                      variant==="business"
                        ? "h-full w-full bg-tda-bg-soft object-contain object-center p-2"
                        : "h-full w-full object-cover object-center"
                    }
                    fallback={placeholder(x,"sm")}
                  />
                  {variant==="business" ? (
                    <SafeImage
                      src={image(x,"logo")}
                      available={x.hasLogo}
                      className="absolute bottom-3 left-3 h-11 w-11 rounded-xl border border-[color:var(--tda-border)] bg-white object-contain p-1 shadow"
                      alt="Logo usaha"
                      fallback={null}
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-tda-navy">{title(x)}</h4>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-tda-muted">
                    {variant==="business" ? text(x) : `“${text(x)}”`}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
