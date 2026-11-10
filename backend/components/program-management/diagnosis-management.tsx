"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Copy, Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { publicOrigin } from "@/lib/public-origin";

type Participant = {
  participantId: number;
  participantName: string;
  phone: string;
  category: string;
  token: string;
  eventId: number;
  eventName: string;
  eventDate: string;
  programTitle: string | null;
  diagnosisId: number | null;
  scoreTotal: number | null;
  scoreMax: number | null;
  scorePercent: number | null;
  resultLabel: string | null;
  diagnosisSource: string | null;
  businessName: string | null;
  updatedAt: string | null;
};

type Aspect = { key: string; label: string; itemCount: number; maxScore: number };

type PublicRow = {
  diagnosisId: number;
  publicRef: string;
  ownerName: string;
  businessName: string;
  whatsapp: string;
  diagnosisDate: string;
  scoreTotal: number;
  scoreMax: number;
  scorePercent: number;
  resultLabel: string;
  updatedAt: string;
};

type Data = {
  participants: Participant[];
  publicDiagnoses: PublicRow[];
  aspects: Aspect[];
  maxScore: number;
  itemCount: number;
};

type DiagnosisDetailRow = Record<string, string | number | null>;

type Detail = {
  diagnosis: DiagnosisDetailRow;
  items: { itemNo: number; aspect: string; score: number; note: string }[];
};

const IDENTITY_LABELS: { key: string; label: string }[] = [
  { key: "ownerName", label: "Nama Pemilik" },
  { key: "businessName", label: "Nama Usaha" },
  { key: "diagnosisDate", label: "Tanggal Diagnosis" },
  { key: "businessType", label: "Jenis Usaha" },
  { key: "mainProduct", label: "Produk/Jasa Utama" },
  { key: "mentorName", label: "Nama Pendamping" },
  { key: "whatsapp", label: "Nomor WhatsApp" },
  { key: "socialMedia", label: "Media Sosial" },
  { key: "startYear", label: "Tahun Mulai" },
  { key: "employeeCount", label: "Jumlah Karyawan" },
  { key: "branchCount", label: "Jumlah Cabang" },
  { key: "monthlyRevenue", label: "Omzet Rata-rata/Bulan" },
  { key: "monthlyRevenueTarget", label: "Target Omzet/Bulan" },
  { key: "target90Days", label: "Target 90 Hari" },
  { key: "address", label: "Alamat Usaha" },
];

const QUESTION_LABELS = [
  "Produk/jasa utama",
  "Pelanggan utama",
  "Alasan pelanggan membeli",
  "Keunggulan vs kompetitor",
  "Masalah terbesar",
  "Target 3 bulan",
];

/** Waktu disimpan UTC di DB, ditampilkan dalam Asia/Jakarta (konvensi repo). */
function dateTime(value: string) {
  if (!value) return "-";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date);
}

export default function DiagnosisManagement() {
  const [data, setData] = useState<Data>({
    participants: [],
    publicDiagnoses: [],
    aspects: [],
    maxScore: 305,
    itemCount: 61,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "filled" | "empty">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "peserta" | "umum">("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/business-diagnosis", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || "Daftar diagnosis belum dapat dimuat.");
      setError(null);
      setData({
        participants: body.participants ?? [],
        publicDiagnoses: body.publicDiagnoses ?? [],
        aspects: body.aspects ?? [],
        maxScore: Number(body.maxScore ?? 305),
        itemCount: Number(body.itemCount ?? 61),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Daftar diagnosis belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // setState dijalankan di callback timer, bukan di badan effect (aturan react-hooks).
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!detailId) return;
    let cancelled = false;
    fetch(`/api/business-diagnosis/${detailId}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || "Detail diagnosis belum dapat dimuat.");
        return body as Detail;
      })
      .then((body) => {
        if (!cancelled) setDetail(body);
      })
      .catch((reason: unknown) => {
        if (!cancelled) toast.error(reason instanceof Error ? reason.message : "Detail diagnosis gagal dimuat.");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  const events = useMemo(() => {
    const map = new Map<number, string>();
    for (const participant of data.participants) map.set(participant.eventId, participant.eventName);
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data.participants]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.participants.filter((participant) => {
      if (sourceFilter === "umum") return false;
      if (status === "filled" && !participant.diagnosisId) return false;
      if (status === "empty" && participant.diagnosisId) return false;
      if (eventFilter !== "all" && String(participant.eventId) !== eventFilter) return false;
      if (!query) return true;
      return [participant.participantName, participant.phone, participant.businessName, participant.eventName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [data.participants, eventFilter, search, sourceFilter, status]);

  const filteredPublic = useMemo(() => {
    if (sourceFilter === "peserta") return [];
    if (status === "empty") return [];
    if (eventFilter !== "all") return [];
    const query = search.trim().toLowerCase();
    return data.publicDiagnoses.filter((row) => {
      if (!query) return true;
      return [row.ownerName, row.businessName, row.whatsapp]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [data.publicDiagnoses, eventFilter, search, sourceFilter, status]);

  const summary = useMemo(() => {
    const total = data.participants.length + data.publicDiagnoses.length;
    const filled =
      data.participants.filter((participant) => participant.diagnosisId).length + data.publicDiagnoses.length;
    const percents = [
      ...data.participants.map((participant) => participant.scorePercent),
      ...data.publicDiagnoses.map((row) => row.scorePercent),
    ].filter((value): value is number => typeof value === "number");
    const average = percents.length
      ? Math.round((percents.reduce((sum, value) => sum + value, 0) / percents.length) * 10) / 10
      : 0;
    return { total, filled, empty: total - filled, average };
  }, [data.participants, data.publicDiagnoses]);

  function diagnosisUrl(token: string) {
    return `${publicOrigin()}/diagnosis/${token}`;
  }

  async function copyLink(participant: Participant) {
    const url = diagnosisUrl(participant.token);
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Link diagnosis ${participant.participantName} disalin.`);
    } catch {
      toast.error(`Link belum dapat disalin. Salin manual: ${url}`);
    }
  }

  function openDetail(participant: Participant) {
    if (!participant.diagnosisId) return;
    setDetailLoading(true);
    setDetailId(participant.diagnosisId);
  }

  return (
    <div className="space-y-5" data-testid="diagnosis-management">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Peserta kelas" value={summary.total} hint="Seluruh peserta event" />
        <SummaryCard label="Sudah diisi" value={summary.filled} hint="Diagnosis tersimpan" />
        <SummaryCard label="Belum diisi" value={summary.empty} hint="Perlu diingatkan" />
        <SummaryCard label="Rata-rata skor" value={`${summary.average}%`} hint={`Maksimal ${data.maxScore} poin`} />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4" /> Diagnosis Bisnis Peserta
            </CardTitle>
            <CardDescription>
              Bagikan link form ke peserta kelas reguler. Hasil tersimpan otomatis dan bisa diekspor ke Excel.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                void load();
              }}
              disabled={loading}
            >
              <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} /> Muat ulang
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href="/api/business-diagnosis/export" target="_blank" rel="noopener noreferrer">
                <Download className="size-4" /> Ekspor CSV
              </a>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <Input
              placeholder="Cari nama, usaha, atau WhatsApp…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              data-testid="diagnosis-search"
            />
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value)}
              data-testid="diagnosis-event-filter"
            >
              <option value="all">Semua kelas</option>
              {events.map((event) => (
                <option key={event.id} value={String(event.id)}>
                  {event.name}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as "all" | "filled" | "empty")}
              data-testid="diagnosis-status-filter"
            >
              <option value="all">Semua status</option>
              <option value="filled">Sudah diisi</option>
              <option value="empty">Belum diisi</option>
            </select>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as "all" | "peserta" | "umum")}
              data-testid="diagnosis-source-filter"
            >
              <option value="all">Semua sumber</option>
              <option value="peserta">Peserta kelas</option>
              <option value="umum">Umum (form terbuka)</option>
            </select>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Memuat data peserta…
            </div>
          ) : filtered.length === 0 && filteredPublic.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada peserta yang cocok.</p>
          ) : (
            <>
              {filtered.length ? (
                <ul className="divide-y rounded-lg border" data-testid="diagnosis-participant-list">
              {filtered.map((participant) => (
                <li
                  key={participant.participantId}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  data-testid={`diagnosis-row-${participant.participantId}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {participant.participantName}
                      {participant.businessName ? (
                        <span className="font-normal text-muted-foreground"> · {participant.businessName}</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {participant.eventName} · {participant.phone || "tanpa nomor"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:shrink-0">
                    {participant.diagnosisId ? (
                      <Badge variant="secondary">
                        {participant.scoreTotal}/{participant.scoreMax} · {participant.scorePercent}%
                      </Badge>
                    ) : (
                      <Badge variant="outline">Belum diisi</Badge>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void copyLink(participant)}
                      data-testid={`diagnosis-copy-${participant.participantId}`}
                    >
                      <Copy className="size-4" />
                      <span className="sm:hidden">Salin link</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!participant.diagnosisId}
                      onClick={() => openDetail(participant)}
                      data-testid={`diagnosis-detail-${participant.participantId}`}
                    >
                      <ExternalLink className="size-4" />
                      <span className="sm:hidden">Detail</span>
                    </Button>
                  </div>
                </li>
              ))}
                </ul>
              ) : null}

              {filteredPublic.length ? (
                <ul className="divide-y rounded-lg border" data-testid="diagnosis-public-list">
                  {filteredPublic.map((row) => (
                    <li
                      key={`umum-${row.diagnosisId}`}
                      className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {row.ownerName}
                          <Badge variant="outline" className="ml-1.5 align-middle">
                            Umum
                          </Badge>
                          {row.businessName ? (
                            <span className="font-normal text-muted-foreground"> · {row.businessName}</span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Form terbuka · {row.whatsapp || "tanpa nomor"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 sm:shrink-0">
                        <Badge variant="secondary">
                          {row.scoreTotal}/{row.scoreMax} · {row.scorePercent}%
                        </Badge>
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={`/diagnosis/hasil/${row.publicRef}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`diagnosis-public-result-${row.diagnosisId}`}
                          >
                            <ExternalLink className="size-4" />
                            <span className="sm:hidden">Hasil</span>
                          </a>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDetailLoading(true);
                            setDetailId(row.diagnosisId);
                          }}
                        >
                          <span className="sm:hidden">Detail</span>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={detailId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailId(null);
            setDetail(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" data-testid="diagnosis-detail-dialog">
          <DialogHeader>
            <DialogTitle>Detail Diagnosis</DialogTitle>
            <DialogDescription>
              {detail ? String(detail.diagnosis.ownerName ?? "") : "Memuat…"}
              {detail?.diagnosis.businessName ? ` · ${String(detail.diagnosis.businessName)}` : ""}
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Memuat detail…
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold">{Number(detail.diagnosis.scorePercent ?? 0)}%</p>
                <p className="text-xs text-muted-foreground">
                  {Number(detail.diagnosis.scoreTotal ?? 0)} / {Number(detail.diagnosis.scoreMax ?? 0)} poin
                </p>
                <Badge className="mt-2">{String(detail.diagnosis.resultLabel ?? "")}</Badge>
              </div>

              <section>
                <h4 className="text-sm font-semibold">Rekap per aspek</h4>
                <ul className="mt-2 space-y-2">
                  {data.aspects.map((aspect) => {
                    const aspectItems = detail.items.filter((item) => item.aspect === aspect.key);
                    const score = aspectItems.reduce((sum, item) => sum + item.score, 0);
                    const percent = aspect.maxScore ? Math.round((score / aspect.maxScore) * 1000) / 10 : 0;
                    return (
                      <li key={aspect.key}>
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="truncate">{aspect.label}</span>
                          <span className="shrink-0 font-medium">
                            {score}/{aspect.maxScore} · {percent}%
                          </span>
                        </div>
                        <Progress className="mt-1" value={percent} />
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section>
                <h4 className="text-sm font-semibold">Identitas usaha</h4>
                <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                  {IDENTITY_LABELS.map((field) => {
                    const value = detail.diagnosis[field.key];
                    if (!value) return null;
                    return (
                      <div key={field.key} className="rounded-md bg-muted/40 px-3 py-2">
                        <dt className="text-xs text-muted-foreground">{field.label}</dt>
                        <dd className="text-sm break-words">{String(value)}</dd>
                      </div>
                    );
                  })}
                </dl>
              </section>

              <section>
                <h4 className="text-sm font-semibold">Gambaran umum</h4>
                <ol className="mt-2 space-y-2">
                  {QUESTION_LABELS.map((label, index) => {
                    const value = detail.diagnosis[`q${index + 1}`];
                    if (!value) return null;
                    return (
                      <li key={label} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="mt-0.5 break-words">{String(value)}</p>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section>
                <h4 className="text-sm font-semibold">Prioritas pendampingan (skor 1-2)</h4>
                {detail.items.filter((item) => item.score <= 2).length ? (
                  <ul className="mt-2 space-y-1 text-sm">
                    {detail.items
                      .filter((item) => item.score <= 2)
                      .sort((a, b) => a.score - b.score)
                      .map((item) => (
                        <li key={item.itemNo} className="flex gap-2">
                          <Badge variant="outline" className="shrink-0">
                            {item.score}
                          </Badge>
                          <span>Butir {item.itemNo}</span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Tidak ada butir dengan skor rendah.</p>
                )}
              </section>

              <p className="text-xs text-muted-foreground">
                Terakhir diperbarui: {dateTime(String(detail.diagnosis.updatedAt ?? ""))}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
