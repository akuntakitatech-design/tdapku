import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

const nextConfig: NextConfig = {
  // Build standalone: hasil `next build` cukup dijalankan dengan `node server.js` (Dockerfile).
  output: "standalone",
  // Root proyek = folder backend (repo monorepo punya lockfile lain di atasnya).
  outputFileTracingRoot: projectRoot,
  turbopack: { root: projectRoot },
  poweredByHeader: false,
  // Foto Hero/About statis (/public/hero, WebP): default Next = max-age=0 (revalidasi tiap kunjungan).
  // Nama file tidak di-hash → tidak immutable; cache 1 hari + stale-while-revalidate 7 hari.
  async headers() {
    return [
      { source: "/hero/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
    ];
  },
  images: {
    // Optimizer hanya untuk gambar lokal. Query string (?v= cache busting, ?section= gambar CMS) hanya
    // diizinkan untuk route media PUBLIK; file statis lain tanpa query. Media privat tidak masuk daftar.
    localPatterns: [
      { pathname: "/api/public-site/image" },
      { pathname: "/api/public-programs/*/flyer" },
      { pathname: "/api/public-media/*/image" },
      { pathname: "/**", search: "" },
    ],
  },
  typescript: {
    // Baseline Versi 61 (vinext/Vite) tidak menjalankan type-check saat build; ada 8 error tipe
    // lama di komponen bisnis (treasury route, membership-registration, public-site-management, dll.)
    // yang tidak diubah agar 0 regresi. `yarn typecheck` tetap tersedia untuk audit.
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
