"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Send, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  DIAGNOSIS_ASPECTS,
  DIAGNOSIS_IDENTITY_FIELDS,
  DIAGNOSIS_ITEM_COUNT,
  DIAGNOSIS_MAX_SCORE,
  DIAGNOSIS_QUESTIONS,
  computeDiagnosisResult,
  type DiagnosisIdentityKey,
  type DiagnosisResult,
} from "@/lib/business-diagnosis-form";

type ParticipantPayload = {
  participantId: number;
  participantName: string;
  phone: string;
  category: string;
  eventId: number;
  eventName: string;
  eventDate: string;
  programTitle: string | null;
};

type DiagnosisPayload = Record<string, string | number | null>;

type AspectPayload = {
  key: string;
  label: string;
  items: { no: number; statement: string }[];
  maxScore: number;
};

type FormPayload = {
  participant: ParticipantPayload;
  diagnosis: DiagnosisPayload | null;
  items: { itemNo: number; aspect: string; score: number; note: string }[];
  questions: string[];
  aspects: AspectPayload[];
  itemCount: number;
  maxScore: number;
};

const STEP_TITLES = ["Identitas Usaha", "Gambaran Umum", "Penilaian Kondisi", "Ringkasan & Kirim"];
const SCALE_HINT = "1 = belum ada, 2 = masih minim, 3 = cukup, 4 = baik, 5 = sudah optimal";

/** Waktu disimpan UTC di DB, ditampilkan dalam Asia/Jakarta (konvensi repo). */
function dateTime(value: string) {
  if (!value) return "";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date);
}

function emptyIdentity(): Record<DiagnosisIdentityKey, string> {
  const entries = DIAGNOSIS_IDENTITY_FIELDS.map((field) => [field.key, ""]);
  return Object.fromEntries(entries) as Record<DiagnosisIdentityKey, string>;
}

function textField(row: DiagnosisPayload | null, key: string) {
  const value = row?.[key];
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

function createPublicPayload(): FormPayload {
  return {
    participant: {
      participantId: 0,
      participantName: "",
      phone: "",
      category: "",
      eventId: 0,
      eventName: "Form Umum",
      eventDate: "",
      programTitle: null,
    },
    diagnosis: null,
    items: [],
    questions: [...DIAGNOSIS_QUESTIONS],
    aspects: DIAGNOSIS_ASPECTS.map((aspect) => ({
      key: aspect.key,
      label: aspect.label,
      items: aspect.items,
      maxScore: aspect.items.length * 5,
    })),
    itemCount: DIAGNOSIS_ITEM_COUNT,
    maxScore: DIAGNOSIS_MAX_SCORE,
  };
}

export default function BusinessDiagnosisForm({
  token,
  mode = "peserta",
}: {
  token?: string;
  mode?: "peserta" | "umum";
}) {
  const isPublic = mode === "umum";
  const participantToken = token ?? "";
  const [payload, setPayload] = useState<FormPayload | null>(() => (isPublic ? createPublicPayload() : null));
  const [loading, setLoading] = useState(!isPublic);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [identity, setIdentity] = useState<Record<DiagnosisIdentityKey, string>>(emptyIdentity);
  const [answers, setAnswers] = useState<string[]>(() =>
    isPublic ? DIAGNOSIS_QUESTIONS.map(() => "") : [],
  );
  const [scores, setScores] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [savedAt, setSavedAt] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [resultRef, setResultRef] = useState("");

  useEffect(() => {
    if (isPublic) return;
    let cancelled = false;
    fetch(`/api/public-diagnosis/${encodeURIComponent(participantToken)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || "Form diagnosis belum dapat dimuat.");
        return body as FormPayload;
      })
      .then((data) => {
        if (cancelled) return;
        setPayload(data);

        const nextIdentity = emptyIdentity();
        for (const field of DIAGNOSIS_IDENTITY_FIELDS) {
          nextIdentity[field.key] = textField(data.diagnosis, field.key);
        }
        nextIdentity.ownerName = nextIdentity.ownerName || data.participant.participantName;
        nextIdentity.whatsapp = nextIdentity.whatsapp || data.participant.phone;
        setIdentity(nextIdentity);

        setAnswers(data.questions.map((_, index) => textField(data.diagnosis, `q${index + 1}`)));

        const savedScores: Record<number, number> = {};
        for (const item of data.items) {
          if (Number.isInteger(item.score) && item.score > 0) savedScores[item.itemNo] = item.score;
        }
        setScores(savedScores);
        setSavedAt(dateTime(textField(data.diagnosis, "updatedAt")));
        if (Object.keys(savedScores).length === data.itemCount && data.itemCount > 0) {
          setResult(computeDiagnosisResult(savedScores));
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setLoadError(reason instanceof Error ? reason.message : "Form diagnosis belum dapat dimuat.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isPublic, participantToken]);

  const itemCount = payload?.itemCount ?? 0;
  const answeredCount = Object.keys(scores).length;
  const completion = itemCount ? Math.round((answeredCount / itemCount) * 100) : 0;

  const weakestItems = useMemo(() => {
    if (!payload) return [];
    const list: { no: number; statement: string; aspect: string; score: number }[] = [];
    for (const aspect of payload.aspects) {
      for (const item of aspect.items) {
        const score = scores[item.no] ?? 0;
        if (score > 0 && score <= 2) {
          list.push({ no: item.no, statement: item.statement, aspect: aspect.label, score });
        }
      }
    }
    return list.sort((a, b) => a.score - b.score).slice(0, 12);
  }, [payload, scores]);

  function setScore(itemNo: number, value: number) {
    setScores((current) => ({ ...current, [itemNo]: value }));
  }

  function goNext() {
    if (step === 0) {
      const missingWhatsapp = isPublic && !identity.whatsapp.trim();
      if (!identity.ownerName.trim() || !identity.businessName.trim() || missingWhatsapp) {
        toast.error(
          isPublic
            ? "Nama pemilik, nama usaha, dan nomor WhatsApp wajib diisi."
            : "Nama pemilik dan nama usaha wajib diisi.",
        );
        return;
      }
    }
    if (step === 1 && answers.some((answer) => !answer.trim())) {
      toast.error("Semua pertanyaan gambaran umum wajib diisi.");
      return;
    }
    if (step === 2 && answeredCount < itemCount) {
      toast.error(`Masih ada ${itemCount - answeredCount} pernyataan yang belum dinilai.`);
      return;
    }
    setStep((current) => Math.min(STEP_TITLES.length - 1, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStep((current) => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setSaving(true);
    try {
      const endpoint = isPublic
        ? "/api/public-diagnosis"
        : `/api/public-diagnosis/${encodeURIComponent(participantToken)}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...identity, answers, scores, companyWebsite: honeypot }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Diagnosis belum dapat disimpan.");
      setResult({
        aspects: body.aspects ?? [],
        score: Number(body.score ?? 0),
        maxScore: Number(body.maxScore ?? itemCount * 5),
        percent: Number(body.percent ?? 0),
        label: String(body.label ?? ""),
      });
      setResultRef(String(body.publicRef ?? ""));
      toast.success("Diagnosis berhasil disimpan. Terima kasih!");
      setSavedAt(dateTime(new Date().toISOString()));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Diagnosis belum dapat disimpan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        Memuat formulir diagnosis…
      </div>
    );
  }

  if (loadError || !payload) {
    return (
      <div className="mx-auto w-full max-w-xl px-5 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TriangleAlert className="size-5 text-destructive" />
              Form tidak dapat dibuka
            </CardTitle>
            <CardDescription>{loadError ?? "Peserta tidak ditemukan."}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Pastikan tautan yang Anda buka sama persis dengan yang dikirim panitia. Bila masih bermasalah, hubungi
            panitia TDA Pekanbaru.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6" data-testid="business-diagnosis-form">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TDA Pekanbaru 9.0</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Formulir Diagnosis Bisnis UMKM</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isPublic
            ? "Form terbuka untuk umum · hasil langsung terlihat setelah dikirim"
            : `${payload.participant.participantName} · ${payload.participant.eventName}${
                payload.participant.programTitle ? ` · ${payload.participant.programTitle}` : ""
              }`}
        </p>
      </header>

      {result ? (
        <DiagnosisResultView
          result={result}
          weakestItems={weakestItems}
          savedAt={savedAt}
          resultRef={resultRef}
          onEdit={isPublic ? undefined : () => setResult(null)}
        />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">
                Langkah {step + 1} dari {STEP_TITLES.length}: {STEP_TITLES[step]}
              </CardTitle>
              <Badge variant="secondary">{completion}% dinilai</Badge>
            </div>
            <CardDescription>
              {step === 2
                ? `${answeredCount} dari ${itemCount} pernyataan sudah dinilai. ${SCALE_HINT}.`
                : "Isi sesuai kondisi usaha yang sebenarnya, bukan yang diharapkan."}
            </CardDescription>
            <Progress className="mt-3" value={step === 2 ? completion : ((step + 1) / STEP_TITLES.length) * 100} />
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2" data-testid="diagnosis-step-identity">
                {DIAGNOSIS_IDENTITY_FIELDS.map((field) => {
                  const required = field.key === "ownerName" || field.key === "businessName";
                  return (
                    <div key={field.key} className={field.key === "address" ? "sm:col-span-2" : undefined}>
                      <Label htmlFor={`identity-${field.key}`}>
                        {field.label}
                        {required ? <span className="text-destructive"> *</span> : null}
                      </Label>
                      <Input
                        id={`identity-${field.key}`}
                        type={field.type}
                        value={identity[field.key]}
                        onChange={(event) =>
                          setIdentity((current) => ({ ...current, [field.key]: event.target.value }))
                        }
                        data-testid={`identity-${field.key}`}
                      />
                    </div>
                  );
                })}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="company-website">Website</label>
                  <input
                    id="company-website"
                    name="companyWebsite"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(event) => setHoneypot(event.target.value)}
                  />
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-4" data-testid="diagnosis-step-overview">
                {payload.questions.map((question, index) => (
                  <div key={question}>
                    <Label htmlFor={`answer-${index}`}>
                      {index + 1}. {question}
                    </Label>
                    <Textarea
                      id={`answer-${index}`}
                      rows={3}
                      value={answers[index] ?? ""}
                      onChange={(event) =>
                        setAnswers((current) => {
                          const next = [...current];
                          next[index] = event.target.value;
                          return next;
                        })
                      }
                      data-testid={`answer-${index}`}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-7" data-testid="diagnosis-step-score">
                {payload.aspects.map((aspect) => (
                  <fieldset key={aspect.key} className="space-y-3">
                    <legend className="flex w-full items-baseline justify-between gap-3 border-b pb-2 text-sm font-semibold">
                      <span>{aspect.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        maks {aspect.maxScore}
                      </span>
                    </legend>
                    {aspect.items.map((item) => (
                      <div key={item.no} className="rounded-lg border bg-card px-3 py-3">
                        <p className="text-sm leading-snug">
                          <span className="mr-1.5 font-semibold text-muted-foreground">{item.no}.</span>
                          {item.statement}
                        </p>
                        <div className="mt-2 grid grid-cols-5 gap-1.5" role="group" aria-label={`Nilai untuk pernyataan ${item.no}`}>
                          {[1, 2, 3, 4, 5].map((value) => {
                            const active = scores[item.no] === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setScore(item.no, value)}
                                className={[
                                  "min-h-9 rounded-md border text-sm font-semibold transition-colors",
                                  active
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "bg-background hover:bg-muted",
                                ].join(" ")}
                                data-testid={`score-${item.no}-${value}`}
                              >
                                {value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </fieldset>
                ))}
              </div>
            ) : null}

            {step === 3 ? (
              <SummaryStep
                identity={identity}
                answers={answers}
                questions={payload.questions}
                preview={computeDiagnosisResult(scores)}
                weakestItems={weakestItems}
                isRevision={Boolean(payload.diagnosis)}
              />
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={goBack}
                disabled={step === 0 || saving}
                data-testid="diagnosis-prev"
              >
                <ChevronLeft className="size-4" /> Sebelumnya
              </Button>
              {step === STEP_TITLES.length - 1 ? (
                <Button type="button" onClick={() => void submit()} disabled={saving} data-testid="diagnosis-submit">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {payload.diagnosis ? "Perbarui Diagnosis" : "Kirim Diagnosis"}
                </Button>
              ) : (
                <Button type="button" onClick={goNext} data-testid="diagnosis-next">
                  Lanjut <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryStep({
  identity,
  answers,
  questions,
  preview,
  weakestItems,
  isRevision,
}: {
  identity: Record<DiagnosisIdentityKey, string>;
  answers: string[];
  questions: string[];
  preview: DiagnosisResult;
  weakestItems: { no: number; statement: string; aspect: string; score: number }[];
  isRevision: boolean;
}) {
  const rows = DIAGNOSIS_IDENTITY_FIELDS.filter((field) => identity[field.key]?.trim());

  return (
    <div className="space-y-6" data-testid="diagnosis-step-summary">
      <div>
        <h3 className="text-sm font-semibold">Identitas usaha</h3>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
          {rows.map((field) => (
            <div key={field.key} className="rounded-md bg-muted/40 px-3 py-2">
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="text-sm font-medium break-words">{identity[field.key]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Gambaran umum</h3>
        <ol className="mt-2 space-y-2">
          {questions.map((question, index) => (
            <li key={question} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">{question}</p>
              <p className="mt-0.5 break-words">{answers[index]}</p>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Rekapitulasi sementara</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Total {preview.score} dari {preview.maxScore} ({preview.percent}%) · {preview.label}
        </p>
        <ul className="mt-3 space-y-2">
          {preview.aspects.map((aspect) => (
            <li key={aspect.key}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate">{aspect.label}</span>
                <span className="shrink-0 font-medium">
                  {aspect.score}/{aspect.maxScore} · {aspect.percent}%
                </span>
              </div>
              <Progress className="mt-1" value={aspect.percent} />
            </li>
          ))}
        </ul>
      </div>

      {weakestItems.length ? (
        <div>
          <h3 className="text-sm font-semibold">Prioritas pendampingan (skor 1-2)</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {weakestItems.map((item) => (
              <li key={item.no} className="flex gap-2">
                <Badge variant="outline" className="shrink-0">
                  {item.score}
                </Badge>
                <span className="break-words">
                  {item.statement} <span className="text-muted-foreground">({item.aspect})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        {isRevision
          ? "Data diagnosis sebelumnya akan diperbarui dengan isian terbaru."
          : "Setelah dikirim, panitia dapat melihat hasil diagnosis ini. Anda masih bisa memperbaruinya lewat tautan yang sama."}
      </p>
    </div>
  );
}

function DiagnosisResultView({
  result,
  weakestItems,
  savedAt,
  resultRef,
  onEdit,
}: {
  result: DiagnosisResult;
  weakestItems: { no: number; statement: string; aspect: string; score: number }[];
  savedAt: string;
  resultRef: string;
  onEdit?: () => void;
}) {
  return (
    <div className="space-y-5" data-testid="diagnosis-result">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="size-5 text-primary" />
            Diagnosis tersimpan
          </CardTitle>
          <CardDescription>
            {savedAt ? `Terakhir diperbarui ${savedAt}. ` : ""}Terima kasih, hasil ini sudah masuk ke data panitia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

      {weakestItems.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prioritas pendampingan</CardTitle>
            <CardDescription>Aspek dengan skor 1-2 yang sebaiknya dibenahi lebih dulu.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {weakestItems.map((item) => (
                <li key={item.no} className="flex gap-2">
                  <Badge variant="outline" className="shrink-0">
                    {item.score}
                  </Badge>
                  <span className="break-words">
                    {item.statement} <span className="text-muted-foreground">({item.aspect})</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {resultRef ? (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Simpan tautan hasil ini:{" "}
          <a
            className="font-medium text-primary underline underline-offset-4"
            href={`/diagnosis/hasil/${resultRef}`}
            data-testid="diagnosis-result-link"
          >
            /diagnosis/hasil/{resultRef}
          </a>
        </p>
      ) : null}

      {onEdit ? (
        <Button type="button" variant="outline" onClick={onEdit} data-testid="diagnosis-edit">
          Perbaiki isian
        </Button>
      ) : null}
    </div>
  );
}
