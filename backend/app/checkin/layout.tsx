import type { ReactNode } from "react";

/* Typography publik (Manrope) untuk halaman check-in operasional — font saja; scanner/flow/komponen tidak diubah. */
export default function PublicCheckinLayout({ children }: { children: ReactNode }) {
  return <div className="tda-font-public">{children}</div>;
}
