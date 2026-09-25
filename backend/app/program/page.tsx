import type { Metadata } from "next";
import PublicProgramCatalog from "@/components/public-program-catalog";
import { PublicShell } from "@/components/public-site/public-shell";
import { PublicPageIntro } from "@/components/public-site/public-page-intro";
import { listPublicPrograms } from "@/db/public-programs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Program & Kegiatan TDA Pekanbaru", description: "Temukan program, kelas, dan kegiatan terbaru TDA Pekanbaru untuk belajar, bertumbuh, dan berkolaborasi.", openGraph: { title: "Program & Kegiatan TDA Pekanbaru", description: "Temukan program, kelas, dan kegiatan terbaru TDA Pekanbaru.", type: "website", locale: "id_ID", images: [] } };

export default async function PublicProgramsPage() {
  const programs = await listPublicPrograms().catch(() => []);
  return (
    <PublicShell current="/program">
      <main className="bg-tda-bg-soft" data-testid="public-program-page">
        <PublicPageIntro
          containerClassName="mx-auto max-w-7xl px-5"
          testId="program-intro"
          eyebrow="Belajar · Bertumbuh · Berkolaborasi"
          title="Temukan program yang membantu bisnis Anda naik kelas."
          lead="Jelajahi kelas, kegiatan, dan ruang kolaborasi dari seluruh divisi TDA Pekanbaru."
        />
        <div className="mx-auto max-w-7xl px-5 py-8 pb-16"><PublicProgramCatalog programs={programs}/></div>
      </main>
    </PublicShell>
  );
}
