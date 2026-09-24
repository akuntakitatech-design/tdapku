/**
 * Dijalankan sekali saat server Next.js start (runtime Node.js):
 * verifikasi skema MariaDB (idempoten) + bootstrap admin + cek konfigurasi storage.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { schemaReady } = await import("@/lib/db/mariadb-d1");
  const { getBucket, storageDriver } = await import("@/lib/storage");
  try {
    await schemaReady();
    console.log(`[storage] driver=${storageDriver()} (${getBucket().describe()})`);
    console.log("[startup] TDA Pekanbaru siap: MariaDB terverifikasi, storage terkonfigurasi.");
  } catch (error) {
    console.error("[startup] gagal menyiapkan database/storage:", error);
  }
}
