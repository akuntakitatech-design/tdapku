import { getDiagnosisByPublicRef } from "@/db/business-diagnoses";
import { computeDiagnosisResult } from "@/lib/business-diagnosis-form";

export const dynamic = "force-dynamic";

/** Hasil diagnosis yang diisi lewat form terbuka, dibuka lagi dengan kunci acak. */
export async function GET(_request: Request, context: { params: Promise<{ ref: string }> }) {
  try {
    const { ref } = await context.params;
    const data = await getDiagnosisByPublicRef(ref);
    if (!data) return Response.json({ error: "Hasil diagnosis tidak ditemukan." }, { status: 404 });

    const scores: Record<number, number> = {};
    for (const item of data.items) scores[item.itemNo] = item.score;

    return Response.json({ ...data, result: computeDiagnosisResult(scores) });
  } catch {
    return Response.json({ error: "Hasil diagnosis belum dapat dimuat." }, { status: 500 });
  }
}
