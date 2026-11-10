import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDiagnosisByPublicRef } from "@/db/business-diagnoses";
import { DIAGNOSIS_ASPECTS, computeDiagnosisResult } from "@/lib/business-diagnosis-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hasil Diagnosis Bisnis — TDA Pekanbaru",
  description: "Hasil diagnosis bisnis UMKM yang diisi lewat formulir terbuka.",
  robots: { index: false, follow: false },
};

export default async function DiagnosisResultPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const data = await getDiagnosisByPublicRef(ref).catch(() => null);

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-xl px-5 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hasil tidak ditemukan</CardTitle>
            <CardDescription>Tautan hasil diagnosis tidak valid atau sudah tidak tersedia.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Silakan isi formulir diagnosis lagi bila Anda membutuhkan hasil terbaru.
          </CardContent>
        </Card>
      </div>
    );
  }

  const scores: Record<number, number> = {};
  for (const item of data.items) scores[item.itemNo] = item.score;
  const result = computeDiagnosisResult(scores);

  const statements = new Map<number, { statement: string; aspect: string }>();
  for (const aspect of DIAGNOSIS_ASPECTS) {
    for (const item of aspect.items) statements.set(item.no, { statement: item.statement, aspect: aspect.label });
  }

  const weakest = data.items
    .filter((item) => item.score <= 2)
    .sort((a, b) => a.score - b.score)
    .map((item) => {
      const meta = statements.get(item.itemNo);
      return {
        itemNo: item.itemNo,
        score: item.score,
        statement: meta?.statement ?? `Butir ${item.itemNo}`,
        aspect: meta?.aspect ?? "",
      };
    });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6" data-testid="diagnosis-public-result">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TDA Pekanbaru 9.0</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Hasil Diagnosis Bisnis</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.diagnosis.businessName || "Usaha Anda"}
          {data.diagnosis.ownerName ? ` · ${data.diagnosis.ownerName}` : ""}
        </p>
      </header>

      <div className="space-y-5">
        <Card>
          <CardContent className="space-y-4 py-5">
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-3xl font-bold">{result.percent}%</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.score} dari {result.maxScore} poin
              </p>
              <Badge className="mt-3">{result.label}</Badge>
            </div>
            <div className="space-y-2">
              {result.aspects.map((aspect) => (
                <div key={aspect.key}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate">{aspect.label}</span>
                    <span className="shrink-0 font-medium">
                      {aspect.score}/{aspect.maxScore} · {aspect.percent}%
                    </span>
                  </div>
                  <Progress className="mt-1" value={aspect.percent} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {weakest.length ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prioritas pendampingan</CardTitle>
              <CardDescription>Butir dengan skor 1-2 yang sebaiknya dibenahi lebih dulu.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {weakest.map((item) => (
                  <li key={item.itemNo} className="flex gap-2">
                    <Badge variant="outline" className="shrink-0">
                      {item.score}
                    </Badge>
                    <span className="break-words">
                      {item.statement} {item.aspect ? <span className="text-muted-foreground">({item.aspect})</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Simpan tautan halaman ini agar hasilnya bisa dibuka lagi. Data diagnosis juga tersimpan pada panitia TDA
          Pekanbaru dan bersifat internal.
        </p>

        <Link href="/diagnosis" className="inline-block text-sm font-medium text-primary underline underline-offset-4">
          Isi formulir diagnosis lagi
        </Link>
      </div>
    </div>
  );
}
