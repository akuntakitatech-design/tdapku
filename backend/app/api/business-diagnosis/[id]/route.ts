import { accessErrorResponse, requireRegisteredUser } from "@/db/access-control";
import { getDiagnosisDetail } from "@/db/business-diagnoses";

export const dynamic = "force-dynamic";

/** Detail satu diagnosis beserta 61 nilai item (backoffice). */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireRegisteredUser();
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return Response.json({ error: "Diagnosis tidak ditemukan." }, { status: 404 });
    }
    const data = await getDiagnosisDetail(numericId);
    if (!data) return Response.json({ error: "Diagnosis tidak ditemukan." }, { status: 404 });
    return Response.json(data);
  } catch (reason) {
    return accessErrorResponse(reason, "Detail diagnosis belum dapat dimuat.");
  }
}
