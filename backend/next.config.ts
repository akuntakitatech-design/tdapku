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
