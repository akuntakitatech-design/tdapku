import type { ReactNode } from "react";

/* Typography publik (Manrope) untuk halaman aksi — font saja, flow/komponen tidak diubah. */
export default function PublicActionLayout({ children }: { children: ReactNode }) {
  return <div className="tda-font-public">{children}</div>;
}
