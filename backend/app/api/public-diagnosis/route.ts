import { createHmac } from "node:crypto";
import {
  countRecentPublicDiagnosisAttempts,
  recordPublicDiagnosisAttempt,
  savePublicDiagnosis,
} from "@/db/business-diagnoses";

export const dynamic = "force-dynamic";

/** Batas pengisian terbuka per IP per jam (form tanpa login). */
const MAX_SUBMISSIONS_PER_HOUR = 5;

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function ipHash(request: Request) {
  const secret = process.env.AUTH_SESSION_SECRET || "tdapku-diagnosis";
  return createHmac("sha256", secret).update(clientIp(request)).digest("hex");
}

/** `created_at` disimpan sebagai "YYYY-MM-DD HH:MM:SS" UTC. */
function utcStamp(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/** Form diagnosis terbuka untuk umum (tanpa token peserta). */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Honeypot: field tersembunyi yang hanya terisi oleh bot.
    if (typeof body?.companyWebsite === "string" && body.companyWebsite.trim()) {
      return Response.json({ error: "Pengisian tidak dapat diproses." }, { status: 400 });
    }

    const hash = ipHash(request);
    const recent = await countRecentPublicDiagnosisAttempts(hash, utcStamp(new Date(Date.now() - 60 * 60 * 1000)));
    if (recent >= MAX_SUBMISSIONS_PER_HOUR) {
      return Response.json(
        { error: "Batas pengisian tercapai (5 kali per jam). Coba lagi nanti atau hubungi panitia." },
        { status: 429 },
      );
    }

    const result = await savePublicDiagnosis(body ?? {});
    await recordPublicDiagnosisAttempt(hash);
    return Response.json({ ok: true, ...result });
  } catch (reason) {
    return Response.json(
      { error: reason instanceof Error ? reason.message : "Diagnosis belum dapat disimpan." },
      { status: 400 },
    );
  }
}
