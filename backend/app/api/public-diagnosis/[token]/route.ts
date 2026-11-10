import { getDiagnosisByToken, saveDiagnosisByToken } from "@/db/business-diagnoses";
import {
  DIAGNOSIS_ASPECTS,
  DIAGNOSIS_ITEM_COUNT,
  DIAGNOSIS_MAX_SCORE,
  DIAGNOSIS_QUESTIONS,
} from "@/lib/business-diagnosis-form";

export const dynamic = "force-dynamic";

/**
 * Form publik Diagnosis Bisnis. Tanpa login — memakai token peserta
 * (`attendance_participants.qr_token`), pola yang sama dengan `/api/public-feedback/[token]`.
 */
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const data = await getDiagnosisByToken(token);
    if (!data) return Response.json({ error: "Peserta tidak ditemukan." }, { status: 404 });
    return Response.json({
      ...data,
      questions: DIAGNOSIS_QUESTIONS,
      aspects: DIAGNOSIS_ASPECTS.map((aspect) => ({
        key: aspect.key,
        label: aspect.label,
        items: aspect.items,
        maxScore: aspect.items.length * 5,
      })),
      itemCount: DIAGNOSIS_ITEM_COUNT,
      maxScore: DIAGNOSIS_MAX_SCORE,
    });
  } catch {
    return Response.json({ error: "Form diagnosis belum dapat dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const result = await saveDiagnosisByToken(token, body ?? {});
    return Response.json({ ok: true, ...result });
  } catch (reason) {
    return Response.json(
      { error: reason instanceof Error ? reason.message : "Diagnosis belum dapat disimpan." },
      { status: 400 },
    );
  }
}
