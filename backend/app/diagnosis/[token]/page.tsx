import type { Metadata } from "next";
import BusinessDiagnosisForm from "@/components/business-diagnosis-form";
import { getDiagnosisByToken } from "@/db/business-diagnoses";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  try {
    const data = await getDiagnosisByToken((await params).token);
    const title = data
      ? `Diagnosis Bisnis ${data.participant.eventName} — TDA Pekanbaru`
      : "Diagnosis Bisnis — TDA Pekanbaru";
    const description = data
      ? `Form diagnosis bisnis untuk peserta ${data.participant.eventName} (TDA Pekanbaru 9.0).`
      : "Form diagnosis bisnis peserta kelas reguler TDA Pekanbaru 9.0.";
    return {
      title,
      description,
      openGraph: { title, description, type: "website", locale: "id_ID", images: [] },
      twitter: { card: "summary", title, description, images: [] },
    };
  } catch {
    return {
      title: "Diagnosis Bisnis — TDA Pekanbaru",
      description: "Form diagnosis bisnis peserta kelas reguler TDA Pekanbaru 9.0.",
    };
  }
}

export default async function BusinessDiagnosisPage({ params }: { params: Promise<{ token: string }> }) {
  return <BusinessDiagnosisForm token={(await params).token} />;
}
