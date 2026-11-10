import { env } from "@/lib/runtime-env";
import {
  DIAGNOSIS_ASPECTS,
  DIAGNOSIS_ITEM_MAX_SCORE,
  DIAGNOSIS_QUESTIONS,
  computeDiagnosisResult,
  normalizeDiagnosisScores,
  type DiagnosisIdentityKey,
} from "@/lib/business-diagnosis-form";

/**
 * Akses data Diagnosis Bisnis UMKM.
 * SQL ditulis dalam dialek SQLite/D1 dan diterjemahkan ke MariaDB oleh lib/db/sql-translate.ts,
 * mengikuti konvensi seluruh db/*.ts lain di repo ini.
 */

function db() {
  if (!env.DB) throw new Error("Database belum tersedia");
  return env.DB;
}

export type DiagnosisParticipant = {
  participantId: number;
  participantName: string;
  phone: string;
  category: string;
  eventId: number;
  eventName: string;
  eventDate: string;
  programTitle: string | null;
};

export type DiagnosisRecord = {
  id: number;
  participantId: number;
  eventId: number | null;
  ownerName: string;
  businessName: string;
  diagnosisDate: string;
  businessType: string;
  mainProduct: string;
  mentorName: string;
  address: string;
  whatsapp: string;
  socialMedia: string;
  startYear: string;
  employeeCount: string;
  branchCount: string;
  monthlyRevenue: string;
  monthlyRevenueTarget: string;
  target90Days: string;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  q6: string;
  scoreTotal: number;
  scoreMax: number;
  scorePercent: number;
  resultLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type DiagnosisItemRow = {
  itemNo: number;
  aspect: string;
  score: number;
  note: string;
};

const DIAGNOSIS_SELECT = `
  d.id, d.participant_id AS participantId, d.event_id AS eventId,
  d.owner_name AS ownerName, d.business_name AS businessName, d.diagnosis_date AS diagnosisDate,
  d.business_type AS businessType, d.main_product AS mainProduct, d.mentor_name AS mentorName,
  d.address, d.whatsapp, d.social_media AS socialMedia, d.start_year AS startYear,
  d.employee_count AS employeeCount, d.branch_count AS branchCount,
  d.monthly_revenue AS monthlyRevenue, d.monthly_revenue_target AS monthlyRevenueTarget,
  d.target_90_days AS target90Days, d.q1, d.q2, d.q3, d.q4, d.q5, d.q6,
  d.score_total AS scoreTotal, d.score_max AS scoreMax, d.score_percent AS scorePercent,
  d.result_label AS resultLabel, d.created_at AS createdAt, d.updated_at AS updatedAt`;

/** Token form = qr_token peserta, pola yang sama dengan form feedback (`/feedback/[token]`). */
export async function findParticipantByToken(token: string) {
  return db().prepare(`
    SELECT ap.id AS participantId, ap.name AS participantName, ap.phone, ap.category,
      ap.event_id AS eventId, e.name AS eventName, e.event_date AS eventDate, p.title AS programTitle
    FROM attendance_participants ap
    JOIN attendance_events e ON e.id = ap.event_id
    LEFT JOIN programs p ON p.id = e.program_id
    WHERE ap.qr_token = ? LIMIT 1`).bind(token).first<DiagnosisParticipant>();
}

/** Data untuk form publik: identitas peserta + isian diagnosis sebelumnya (bila sudah pernah diisi). */
export async function getDiagnosisByToken(token: string) {
  const participant = await findParticipantByToken(token);
  if (!participant) return null;

  const diagnosis = await db().prepare(`
    SELECT ${DIAGNOSIS_SELECT} FROM business_diagnoses d
    WHERE d.participant_id = ? LIMIT 1`).bind(participant.participantId).first<DiagnosisRecord>();

  if (!diagnosis) return { participant, diagnosis: null, items: [] as DiagnosisItemRow[] };

  const items = await db().prepare(`
    SELECT item_no AS itemNo, aspect, score, note FROM business_diagnosis_items
    WHERE diagnosis_id = ? ORDER BY item_no`).bind(diagnosis.id).all<DiagnosisItemRow>();

  return { participant, diagnosis, items: items.results };
}

/** Daftar peserta kelas beserta status pengisian (dipakai backoffice). */
export async function listDiagnosisParticipants() {
  const rows = await db().prepare(`
    SELECT ap.id AS participantId, ap.name AS participantName, ap.phone, ap.category,
      ap.qr_token AS token,
      ap.event_id AS eventId, e.name AS eventName, e.event_date AS eventDate, p.title AS programTitle,
      d.id AS diagnosisId, d.score_total AS scoreTotal, d.score_max AS scoreMax,
      d.score_percent AS scorePercent, d.result_label AS resultLabel, d.business_name AS businessName,
      d.updated_at AS updatedAt
    FROM attendance_participants ap
    JOIN attendance_events e ON e.id = ap.event_id
    LEFT JOIN programs p ON p.id = e.program_id
    LEFT JOIN business_diagnoses d ON d.participant_id = ap.id
    ORDER BY e.event_date DESC, ap.name COLLATE NOCASE`).all<{
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
      businessName: string | null;
      updatedAt: string | null;
    }>();

  return rows.results;
}

export async function getDiagnosisDetail(id: number) {
  const diagnosis = await db().prepare(`
    SELECT ${DIAGNOSIS_SELECT}, ap.name AS participantName, ap.phone AS participantPhone,
      e.name AS eventName, e.event_date AS eventDate, p.title AS programTitle
    FROM business_diagnoses d
    JOIN attendance_participants ap ON ap.id = d.participant_id
    LEFT JOIN attendance_events e ON e.id = d.event_id
    LEFT JOIN programs p ON p.id = e.program_id
    WHERE d.id = ? LIMIT 1`).bind(id).first<
    DiagnosisRecord & {
      participantName: string;
      participantPhone: string;
      eventName: string | null;
      eventDate: string | null;
      programTitle: string | null;
    }
  >();

  if (!diagnosis) return null;

  const items = await db().prepare(`
    SELECT item_no AS itemNo, aspect, score, note FROM business_diagnosis_items
    WHERE diagnosis_id = ? ORDER BY item_no`).bind(id).all<DiagnosisItemRow>();

  return { diagnosis, items: items.results };
}

export type DiagnosisInput = Partial<Record<DiagnosisIdentityKey, string>> & {
  answers?: unknown;
  scores?: unknown;
};

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function readAnswers(raw: unknown) {
  const list = Array.isArray(raw) ? raw : [];
  return DIAGNOSIS_QUESTIONS.map((_, index) => text(list[index], 2000));
}

/**
 * Simpan (buat/perbarui) diagnosis milik satu peserta.
 * Skor selalu dihitung ulang di server dari 61 nilai mentah — nilai dari klien tidak dipercaya.
 */
export async function saveDiagnosisByToken(token: string, input: DiagnosisInput) {
  const participant = await findParticipantByToken(token);
  if (!participant) throw new Error("Peserta tidak ditemukan.");

  const { scores, invalid } = normalizeDiagnosisScores(input.scores);
  if (invalid.length) {
    throw new Error(`Masih ada ${invalid.length} pernyataan yang belum dinilai (skala 1-5).`);
  }

  const result = computeDiagnosisResult(scores);
  const answers = readAnswers(input.answers);

  const identity = [
    text(input.ownerName, 255) || participant.participantName,
    text(input.businessName, 255),
    text(input.diagnosisDate, 32),
    text(input.businessType, 255),
    text(input.mainProduct, 255),
    text(input.mentorName, 255),
    text(input.address, 500),
    text(input.whatsapp, 64) || participant.phone,
    text(input.socialMedia, 255),
    text(input.startYear, 32),
    text(input.employeeCount, 32),
    text(input.branchCount, 32),
    text(input.monthlyRevenue, 64),
    text(input.monthlyRevenueTarget, 64),
    text(input.target90Days, 255),
  ];

  const scores4 = [result.score, result.maxScore, result.percent, result.label];
  const existing = await db()
    .prepare(`SELECT id FROM business_diagnoses WHERE participant_id = ? LIMIT 1`)
    .bind(participant.participantId)
    .first<{ id: number }>();

  let diagnosisId: number;
  if (existing) {
    await db().prepare(`
      UPDATE business_diagnoses SET
        event_id=?, owner_name=?, business_name=?, diagnosis_date=?, business_type=?, main_product=?,
        mentor_name=?, address=?, whatsapp=?, social_media=?, start_year=?, employee_count=?,
        branch_count=?, monthly_revenue=?, monthly_revenue_target=?, target_90_days=?,
        q1=?, q2=?, q3=?, q4=?, q5=?, q6=?,
        score_total=?, score_max=?, score_percent=?, result_label=?,
        updated_at=datetime('now')
      WHERE id=?`)
      .bind(participant.eventId, ...identity, ...answers, ...scores4, existing.id)
      .run();
    diagnosisId = existing.id;
  } else {
    const inserted = await db().prepare(`
      INSERT INTO business_diagnoses (
        participant_id, event_id, owner_name, business_name, diagnosis_date, business_type, main_product,
        mentor_name, address, whatsapp, social_media, start_year, employee_count, branch_count,
        monthly_revenue, monthly_revenue_target, target_90_days,
        q1, q2, q3, q4, q5, q6, score_total, score_max, score_percent, result_label
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`)
      .bind(participant.participantId, participant.eventId, ...identity, ...answers, ...scores4)
      .first<{ id: number }>();
    if (!inserted?.id) throw new Error("Diagnosis belum dapat disimpan.");
    diagnosisId = inserted.id;
  }

  // Rincian item diganti utuh agar resubmission tidak menyisakan nilai lama.
  const statements = [db().prepare(`DELETE FROM business_diagnosis_items WHERE diagnosis_id = ?`).bind(diagnosisId)];
  for (const aspect of DIAGNOSIS_ASPECTS) {
    for (const item of aspect.items) {
      statements.push(
        db().prepare(`INSERT INTO business_diagnosis_items (diagnosis_id, aspect, item_no, statement, score, max_score)
          VALUES (?,?,?,?,?,?)`)
          .bind(diagnosisId, aspect.key, item.no, item.statement, scores[item.no], DIAGNOSIS_ITEM_MAX_SCORE),
      );
    }
  }
  await db().batch(statements);

  return { diagnosisId, ...result };
}

/** Data ekspor CSV: header diagnosis + total skor per aspek. */
export async function listDiagnosisForExport() {
  const headers = await db().prepare(`
    SELECT d.id AS diagnosisId, ap.name AS participantName, ap.phone,
      e.name AS eventName, d.business_name AS businessName, d.owner_name AS ownerName,
      d.diagnosis_date AS diagnosisDate, d.mentor_name AS mentorName,
      d.score_total AS scoreTotal, d.score_max AS scoreMax,
      d.score_percent AS scorePercent, d.result_label AS resultLabel, d.updated_at AS updatedAt
    FROM business_diagnoses d
    JOIN attendance_participants ap ON ap.id = d.participant_id
    LEFT JOIN attendance_events e ON e.id = d.event_id
    ORDER BY d.score_percent DESC, ap.name COLLATE NOCASE`).all<{
      diagnosisId: number;
      participantName: string;
      phone: string;
      eventName: string | null;
      businessName: string;
      ownerName: string;
      diagnosisDate: string;
      mentorName: string;
      scoreTotal: number;
      scoreMax: number;
      scorePercent: number;
      resultLabel: string;
      updatedAt: string;
    }>();

  const aspects = await db().prepare(`
    SELECT diagnosis_id AS diagnosisId, aspect, SUM(score) AS score, SUM(max_score) AS maxScore
    FROM business_diagnosis_items GROUP BY diagnosis_id, aspect`).all<{
      diagnosisId: number;
      aspect: string;
      score: number;
      maxScore: number;
    }>();

  const byDiagnosis = new Map<number, Record<string, number>>();
  for (const row of aspects.results) {
    const bucket = byDiagnosis.get(row.diagnosisId) ?? {};
    bucket[row.aspect] = Number(row.score);
    byDiagnosis.set(row.diagnosisId, bucket);
  }

  return {
    headers: headers.results,
    aspects: DIAGNOSIS_ASPECTS.map((aspect) => ({ key: aspect.key, label: aspect.label })),
    scoresByDiagnosis: byDiagnosis,
  };
}
