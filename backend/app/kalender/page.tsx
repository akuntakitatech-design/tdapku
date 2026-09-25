import type { Metadata } from "next";
import PublicCalendar from "@/components/public-calendar";
import { PublicShell } from "@/components/public-site/public-shell";
import { PublicPageIntro } from "@/components/public-site/public-page-intro";
import { listPublicPrograms } from "@/db/public-programs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kalender Kegiatan TDA Pekanbaru", description: "Lihat jadwal program dan kegiatan publik TDA Pekanbaru.", openGraph: { title: "Kalender Kegiatan TDA Pekanbaru", description: "Temukan jadwal kegiatan terbaru TDA Pekanbaru.", type: "website", locale: "id_ID", images: [] } };

export default async function CalendarPage() {
  const programs = await listPublicPrograms().catch(() => []);
  return (
    <PublicShell current="/kalender">
      <main className="bg-tda-bg-soft text-slate-950" data-testid="public-calendar-page">
        <PublicPageIntro
          containerClassName="mx-auto max-w-6xl px-5"
          testId="calendar-intro"
          eyebrow="Agenda Publik"
          title="Kalender kegiatan TDA Pekanbaru"
          lead="Pilih bulan, divisi, dan jenis kegiatan untuk menemukan agenda yang sesuai."
        />
        <div className="mx-auto max-w-6xl px-5 py-8 pb-16"><PublicCalendar programs={programs}/></div>
      </main>
    </PublicShell>
  );
}
