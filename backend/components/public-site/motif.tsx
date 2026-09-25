/*
 * Motif Melayu Riau (Website 00) — ornamen dekoratif SUBTLE.
 * - pucuk rebung  : segitiga tunas bambu bertingkat (sudut hero/CTA)
 * - siku keluang  : garis siku berulang (divider section)
 * - bunga cengkih : kelopak empat (aksen heading/footer)
 * Aturan: opacity 5–15% (kelas .tda-motif / .tda-motif-strong), aria-hidden, pointer-events none,
 * tidak diletakkan di belakang teks utama.
 */

type MotifProps = { className?: string; strong?: boolean; testId?: string };

function cls(base: string, strong?: boolean, extra?: string) {
  return ["tda-motif", strong ? "tda-motif-strong" : "", base, extra || ""].filter(Boolean).join(" ");
}

export function PucukRebung({ className, strong, testId }: MotifProps) {
  return (
    <svg viewBox="0 0 240 240" fill="none" aria-hidden="true" focusable="false" data-testid={testId}
      className={cls("", strong, className)}>
      <g stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        {[0, 60, 120, 180].map((x) => (
          <g key={x} transform={`translate(${x} 0)`}>
            <path d="M30 20 L55 120 L5 120 Z" />
            <path d="M30 44 L45 108 L15 108 Z" />
            <path d="M30 70 L30 120" />
            <path d="M30 132 L55 232 L5 232 Z" />
            <path d="M30 156 L45 220 L15 220 Z" />
          </g>
        ))}
      </g>
    </svg>
  );
}

export function SikuKeluangDivider({ className, strong, testId }: MotifProps) {
  return (
    <div aria-hidden="true" data-testid={testId} className={cls("h-6 w-full", strong, className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='24' viewBox='0 0 96 24' fill='none' stroke='%232D3FB8' stroke-width='2' stroke-linejoin='round'%3E%3Cpath d='M0 18 L12 6 L24 18 L36 6 L48 18'/%3E%3Cpath d='M48 18 H60 L66 12 L72 18 H84 L90 12 L96 18'/%3E%3Ccircle cx='66' cy='5' r='1.8'/%3E%3Ccircle cx='90' cy='5' r='1.8'/%3E%3C/svg%3E\")",
        backgroundRepeat: "repeat-x",
        backgroundPosition: "center",
      }}
    />
  );
}

export function BungaCengkih({ className, strong, testId }: MotifProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" focusable="false" data-testid={testId}
      className={cls("", strong, className)}>
      <g stroke="currentColor" strokeWidth="2">
        <path d="M60 8 C72 30 72 42 60 60 C48 42 48 30 60 8 Z" />
        <path d="M112 60 C90 72 78 72 60 60 C78 48 90 48 112 60 Z" />
        <path d="M60 112 C48 90 48 78 60 60 C72 78 72 90 60 112 Z" />
        <path d="M8 60 C30 48 42 48 60 60 C42 72 30 72 8 60 Z" />
        <rect x="52" y="52" width="16" height="16" transform="rotate(45 60 60)" />
        <path d="M24 24 L36 36 M96 24 L84 36 M24 96 L36 84 M96 96 L84 84" />
      </g>
    </svg>
  );
}

/** Pola ubin pucuk rebung untuk sudut footer/CTA (di-mask agar memudar). */
export function MotifTile({ className, strong, testId }: MotifProps) {
  return (
    <div aria-hidden="true" data-testid={testId} className={cls("", strong, className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64' fill='none' stroke='%23C7D1FF' stroke-width='1.6' stroke-linejoin='round'%3E%3Cpath d='M32 6 L50 58 H14 Z'/%3E%3Cpath d='M32 22 L41 50 H23 Z'/%3E%3C/svg%3E\")",
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(circle at top right, black, transparent 70%)",
        WebkitMaskImage: "radial-gradient(circle at top right, black, transparent 70%)",
      }}
    />
  );
}
