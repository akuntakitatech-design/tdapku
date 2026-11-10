import type { Metadata } from "next";
import BusinessDiagnosisForm from "@/components/business-diagnosis-form";

export const metadata: Metadata = {
  title: "Diagnosis Bisnis UMKM — TDA Pekanbaru",
  description:
    "Form diagnosis bisnis UMKM terbuka untuk umum: nilai kondisi usaha Anda pada 9 aspek dan lihat prioritas pendampingan.",
  openGraph: {
    title: "Diagnosis Bisnis UMKM — TDA Pekanbaru",
    description: "Nilai kondisi usaha Anda pada 9 aspek, lihat skor dan prioritas pendampingan.",
    type: "website",
    locale: "id_ID",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Diagnosis Bisnis UMKM — TDA Pekanbaru",
    description: "Nilai kondisi usaha Anda pada 9 aspek, lihat skor dan prioritas pendampingan.",
    images: [],
  },
};

export default function PublicBusinessDiagnosisPage() {
  return <BusinessDiagnosisForm mode="umum" />;
}
