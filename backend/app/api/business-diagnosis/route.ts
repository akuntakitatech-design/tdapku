import { accessErrorResponse, requireRegisteredUser } from "@/db/access-control";
import { listDiagnosisParticipants } from "@/db/business-diagnoses";
import {
  DIAGNOSIS_ASPECTS,
  DIAGNOSIS_ITEM_COUNT,
  DIAGNOSIS_MAX_SCORE,
  DIAGNOSIS_QUESTIONS,
} from "@/lib/business-diagnosis-form";

export const dynamic = "force-dynamic";

/** Daftar peserta kelas + status pengisian diagnosis (backoffice). */
export async function GET() {
  try {
    await requireRegisteredUser();
    const participants = await listDiagnosisParticipants();
    return Response.json({
      participants,
      aspects: DIAGNOSIS_ASPECTS.map((aspect) => ({
        key: aspect.key,
        label: aspect.label,
        itemCount: aspect.items.length,
        maxScore: aspect.items.length * 5,
      })),
      questions: DIAGNOSIS_QUESTIONS,
      itemCount: DIAGNOSIS_ITEM_COUNT,
      maxScore: DIAGNOSIS_MAX_SCORE,
    });
  } catch (reason) {
    return accessErrorResponse(reason, "Daftar diagnosis belum dapat dimuat.");
  }
}
