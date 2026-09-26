"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Menampilkan pratinjau DESKTOP selebar `width` px yang diperkecil agar muat di panel editor (tanpa scroll horizontal).
 * Hanya transform (performa), tinggi luar mengikuti tinggi konten × skala.
 */
export function ScaledPreview({ width = 1280, children, testId }: { width?: number; children: React.ReactNode; testId?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 1, height: 0 });

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const update = () => {
      const scale = Math.min(1, o.clientWidth / width);
      setBox({ scale, height: i.offsetHeight * scale });
    };
    const observer = new ResizeObserver(update);
    observer.observe(o);
    observer.observe(i);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={outer} className="relative w-full overflow-hidden" style={{ height: box.height || undefined }} data-testid={testId} data-scale={box.scale.toFixed(3)}>
      <div ref={inner} className="absolute left-0 top-0 origin-top-left" style={{ width, transform: `scale(${box.scale})` }}>
        {children}
      </div>
    </div>
  );
}
