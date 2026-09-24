import { mariaDb } from "@/lib/db/mariadb-d1";
import { storageDriver } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Healthcheck container/Coolify: cek koneksi MariaDB. */
export async function GET() {
  try {
    const result = await mariaDb.query<{ now: Date | string }>("SELECT UTC_TIMESTAMP(3) AS now");
    return Response.json({ ok: true, databaseTime: result.rows[0]?.now ?? null, storage: storageDriver(), version: process.env.APP_VERSION || "61" });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
}
