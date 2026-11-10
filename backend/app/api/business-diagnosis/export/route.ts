import { accessErrorResponse, requireRegisteredUser } from "@/db/access-control";
import { listDiagnosisForExport } from "@/db/business-diagnoses";

export const dynamic = "force-dynamic";

function cell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/** Ekspor seluruh hasil diagnosis ke CSV (dibuka di Excel). */
export async function GET() {
  try {
    await requireRegisteredUser();
    const { headers, aspects, scoresByDiagnosis } = await listDiagnosisForExport();

    const columns = [
      "Peserta",
      "WhatsApp",
      "Kelas",
      "Sumber",
      "Nama Usaha",
      "Pemilik",
      "Tanggal Diagnosis",
      "Pendamping",
      ...aspects.map((aspect) => aspect.label),
      "Total",
      "Maksimal",
      "Persen",
      "Hasil",
      "Diperbarui",
    ];

    const lines = [columns.map(cell).join(",")];
    for (const row of headers) {
      const aspectScores = scoresByDiagnosis.get(row.diagnosisId) ?? {};
      lines.push(
        [
          row.participantName,
          row.phone,
          row.eventName ?? "",
          row.source === "umum" ? "Umum" : "Peserta kelas",
          row.businessName,
          row.ownerName,
          row.diagnosisDate,
          row.mentorName,
          ...aspects.map((aspect) => aspectScores[aspect.key] ?? 0),
          row.scoreTotal,
          row.scoreMax,
          row.scorePercent,
          row.resultLabel,
          row.updatedAt,
        ].map(cell).join(","),
      );
    }

    const stamp = new Date().toISOString().slice(0, 10);
    return new Response("\uFEFF" + lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="diagnosis-bisnis-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (reason) {
    return accessErrorResponse(reason, "Ekspor diagnosis belum dapat dibuat.");
  }
}
