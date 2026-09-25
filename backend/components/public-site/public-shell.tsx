import { getPublicChrome, type PublicChrome } from "@/db/public-homepage";
import { PublicHeader } from "@/components/public-site/public-header";
import { PublicFooter } from "@/components/public-site/public-footer";

/**
 * Kerangka GLOBAL halaman publik (Website 02): PublicHeader + konten + PublicFooter.
 * Satu sumber data (public_site_settings + public_navigation_items) untuk semua halaman publik.
 * `chrome` opsional: homepage mengirim data yang sudah dibaca agar tidak query dua kali.
 */
export async function PublicShell({ current, chrome, children }: { current: string; chrome?: PublicChrome; children: React.ReactNode }) {
  const data = chrome ?? (await getPublicChrome());
  return (
    <div className="tda-public flex min-h-screen flex-col" data-testid="public-shell">
      <PublicHeader siteName={data.settings.siteName} navigation={data.navigation} current={current} />
      <div className="flex-1">{children}</div>
      <PublicFooter settings={data.settings} navigation={data.navigation} />
    </div>
  );
}
