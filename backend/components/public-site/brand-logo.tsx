"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/*
 * Logo publik dengan FALLBACK AMAN berurutan (lib/public-logo.ts):
 * logo khusus → Logo Utama → logo statis → teks monogram. Gambar yang gagal dimuat (404/rusak/invalid)
 * langsung diganti sumber berikutnya → tidak pernah menampilkan ikon gambar rusak, src kosong, "null"/"undefined".
 * Header: eager + priority (above-the-fold). Footer: lazy.
 */
export function BrandLogo({ sources, alt, width, height, className, priority = false, testId, monogram = "TDA" }: {
  sources: string[]; alt: string; width: number; height: number; className?: string; priority?: boolean; testId?: string; monogram?: string;
}) {
  const valid = sources.filter((src) => typeof src === "string" && (src.startsWith("/") || src.startsWith("https://")));
  const key = valid.join("|");
  const [state, setState] = useState({ key, index: 0 });
  const index = state.key === key ? state.index : 0;
  const ref = useRef<HTMLImageElement>(null);
  const src = valid[index];

  // Gambar yang sudah gagal SEBELUM hydration tidak memicu onError lagi → periksa sekali setelah mount.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
      setState({ key, index: index + 1 });
    }
  }, [key, index]);

  if (!src) {
    return (
      <span role="img" aria-label={alt} data-testid={testId ? `${testId}-monogram` : undefined}
        className={`inline-grid place-items-center rounded-lg bg-tda-navy font-bold tracking-wide text-white ${className ?? ""}`}>
        {monogram}
      </span>
    );
  }
  return (
    <Image ref={ref} key={src} src={src} alt={alt} width={width} height={height} unoptimized priority={priority}
      loading={priority ? undefined : "lazy"} className={className} data-testid={testId} data-logo-src-index={index}
      onError={() => setState({ key, index: index + 1 })} />
  );
}
