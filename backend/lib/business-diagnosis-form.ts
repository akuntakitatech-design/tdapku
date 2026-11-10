/**
 * Definisi Formulir Diagnosis Bisnis UMKM (TDA Pekanbaru 9.0).
 *
 * Sumber: "form diagnosa bisnis Update.xlsx" — 9 aspek, 61 pernyataan, skor 1-5 (maksimal 305),
 * ditambah 6 pertanyaan terbuka "Gambaran Umum Usaha".
 *
 * Catatan penting: sel baris 38-41 pada file Excel aslinya rusak (teks tertimpa nilai), sehingga
 * 4 pernyataan (item 17-20) direkonstruksi dari potongan teks yang tersisa. Jumlah item per aspek
 * sudah dicocokkan dengan blok "Rekapitulasi" di file tersebut (total maksimal 305). Bila teks resmi
 * berbeda, cukup ubah di sini — skor maksimal dan rekap ikut menyesuaikan otomatis.
 */

export type DiagnosisItem = { no: number; statement: string };

export type DiagnosisAspect = {
  key: string;
  label: string;
  items: DiagnosisItem[];
};

export const DIAGNOSIS_ASPECTS: DiagnosisAspect[] = [
  {
    key: "produk",
    label: "Produk dan Kualitas",
    items: [
      { no: 1, statement: "Produk memiliki kualitas yang konsisten" },
      { no: 2, statement: "Produk memiliki keunggulan yang jelas" },
      { no: 3, statement: "Produk sesuai kebutuhan pelanggan" },
      { no: 4, statement: "Produk memiliki standar ukuran, rasa, atau hasil" },
      { no: 5, statement: "Produk memiliki kemasan yang menarik" },
      { no: 6, statement: "Produk utama sudah diketahui" },
      { no: 7, statement: "Inovasi produk dilakukan secara berkala" },
    ],
  },
  {
    key: "pasar",
    label: "Target Pasar dan Pelanggan",
    items: [
      { no: 8, statement: "Target pelanggan sudah ditentukan" },
      { no: 9, statement: "Kebutuhan pelanggan sudah dipahami" },
      { no: 10, statement: "Data pelanggan sudah dicatat" },
      { no: 11, statement: "Usaha mengetahui alasan pelanggan membeli" },
      { no: 12, statement: "Masukan pelanggan dikumpulkan" },
      { no: 13, statement: "Keluhan pelanggan ditangani dengan baik" },
    ],
  },
  {
    key: "branding",
    label: "Branding",
    items: [
      { no: 14, statement: "Usaha memiliki nama merek yang jelas" },
      { no: 15, statement: "Usaha memiliki logo" },
      { no: 16, statement: "Warna dan tampilan merek konsisten" },
      { no: 17, statement: "Usaha memiliki tagline" },
      { no: 18, statement: "Kemasan mencerminkan identitas merek" },
      { no: 19, statement: "Merek mudah dikenali pelanggan" },
    ],
  },
  {
    key: "pemasaran",
    label: "Pemasaran",
    items: [
      { no: 20, statement: "Usaha memiliki rencana pemasaran" },
      { no: 21, statement: "Media sosial aktif digunakan" },
      { no: 22, statement: "Konten dibuat secara rutin" },
      { no: 23, statement: "Foto dan video produk menarik" },
      { no: 24, statement: "WhatsApp Business digunakan dengan baik" },
      { no: 25, statement: "Promosi memiliki target yang jelas" },
      { no: 26, statement: "Hasil promosi dicatat dan dievaluasi" },
    ],
  },
  {
    key: "penjualan",
    label: "Penjualan",
    items: [
      { no: 27, statement: "Usaha memiliki target penjualan" },
      { no: 28, statement: "Penjualan dicatat setiap hari" },
      { no: 29, statement: "Ada teknik menawarkan produk tambahan" },
      { no: 30, statement: "Ada program pelanggan lama" },
      { no: 31, statement: "Pesanan pelanggan ditindaklanjuti" },
      { no: 32, statement: "Tingkat keberhasilan penjualan diukur" },
      { no: 33, statement: "Penjualan stabil atau meningkat" },
    ],
  },
  {
    key: "operasional",
    label: "Operasional",
    items: [
      { no: 34, statement: "Alur kerja sudah jelas" },
      { no: 35, statement: "Usaha memiliki SOP dasar" },
      { no: 36, statement: "Kualitas produk diperiksa" },
      { no: 37, statement: "Stok bahan atau barang dicatat" },
      { no: 38, statement: "Pembelian bahan direncanakan" },
      { no: 39, statement: "Pemborosan dapat dikendalikan" },
      { no: 40, statement: "Waktu pengerjaan sudah memiliki standar" },
    ],
  },
  {
    key: "keuangan",
    label: "Keuangan",
    items: [
      { no: 41, statement: "Uang pribadi dan usaha dipisahkan" },
      { no: 42, statement: "Penjualan dan pengeluaran dicatat" },
      { no: 43, statement: "HPP sudah dihitung" },
      { no: 44, statement: "Harga jual ditentukan berdasarkan perhitungan" },
      { no: 45, statement: "Laba rugi dibuat setiap bulan" },
      { no: 46, statement: "Arus kas dipantau" },
      { no: 47, statement: "Utang dan piutang dicatat" },
      { no: 48, statement: "Anggaran usaha dibuat" },
    ],
  },
  {
    key: "sdm",
    label: "SDM dan Organisasi",
    items: [
      { no: 49, statement: "Struktur organisasi tersedia" },
      { no: 50, statement: "Setiap karyawan memiliki job description" },
      { no: 51, statement: "Karyawan mendapatkan pelatihan" },
      { no: 52, statement: "Kehadiran dan kedisiplinan dicatat" },
      { no: 53, statement: "Kinerja karyawan dinilai" },
      { no: 54, statement: "Target atau KPI sudah tersedia" },
      { no: 55, statement: "Evaluasi kerja dilakukan rutin" },
    ],
  },
  {
    key: "legalitas",
    label: "Legalitas dan Administrasi",
    items: [
      { no: 56, statement: "Usaha memiliki NIB" },
      { no: 57, statement: "Usaha memiliki NPWP sesuai kebutuhan" },
      { no: 58, statement: "Produk memiliki izin yang diperlukan" },
      { no: 59, statement: "Sertifikasi halal sudah tersedia/diproses" },
      { no: 60, statement: "Merek sudah didaftarkan" },
      { no: 61, statement: "Dokumen usaha tersimpan dengan baik" },
    ],
  },
];

/** Enam pertanyaan terbuka bagian B "Gambaran Umum Usaha". */
export const DIAGNOSIS_QUESTIONS = [
  "Apa barang atau jasa utama yang dijual?",
  "Siapa pelanggan utama usaha ini?",
  "Apa alasan pelanggan membeli produk Anda?",
  "Apa keunggulan usaha dibandingkan kompetitor?",
  "Apa masalah terbesar yang sedang dihadapi?",
  "Apa target utama yang ingin dicapai dalam 3 bulan?",
] as const;

/** Field identitas usaha (bagian A), urut sesuai formulir. */
export const DIAGNOSIS_IDENTITY_FIELDS = [
  { key: "ownerName", label: "Nama Pemilik", type: "text" },
  { key: "businessName", label: "Nama Usaha", type: "text" },
  { key: "diagnosisDate", label: "Tanggal Diagnosis", type: "date" },
  { key: "businessType", label: "Jenis Usaha", type: "text" },
  { key: "mainProduct", label: "Produk/Jasa Utama", type: "text" },
  { key: "mentorName", label: "Nama Pendamping", type: "text" },
  { key: "address", label: "Alamat Usaha", type: "text" },
  { key: "whatsapp", label: "Nomor WhatsApp", type: "tel" },
  { key: "socialMedia", label: "Media Sosial", type: "text" },
  { key: "startYear", label: "Tahun Mulai", type: "text" },
  { key: "employeeCount", label: "Jumlah Karyawan", type: "text" },
  { key: "branchCount", label: "Jumlah Cabang", type: "text" },
  { key: "monthlyRevenue", label: "Omzet Rata-rata/Bulan", type: "text" },
  { key: "monthlyRevenueTarget", label: "Target Omzet/Bulan", type: "text" },
  { key: "target90Days", label: "Target 90 Hari", type: "text" },
] as const;

export type DiagnosisIdentityKey = (typeof DIAGNOSIS_IDENTITY_FIELDS)[number]["key"];

/** Skor maksimal per item. */
export const DIAGNOSIS_ITEM_MAX_SCORE = 5;

/** Total item (61) dan skor maksimal keseluruhan (305). */
export const DIAGNOSIS_ITEM_COUNT = DIAGNOSIS_ASPECTS.reduce((total, aspect) => total + aspect.items.length, 0);
export const DIAGNOSIS_MAX_SCORE = DIAGNOSIS_ITEM_COUNT * DIAGNOSIS_ITEM_MAX_SCORE;
export const DIAGNOSIS_MIN_SCORE = 1;

export type DiagnosisAspectScore = {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  percent: number;
};

export type DiagnosisResult = {
  aspects: DiagnosisAspectScore[];
  score: number;
  maxScore: number;
  percent: number;
  label: string;
};

/** Kategori hasil. Ambang mengikuti contoh pada formulir: 79,34% = "Cukup baik, perlu penguatan". */
export function diagnosisResultLabel(percent: number): string {
  if (percent >= 80) return "Baik dan siap dikembangkan";
  if (percent >= 50) return "Cukup baik, perlu penguatan";
  return "Perlu pembenahan";
}

function roundPercent(value: number, max: number) {
  if (!max) return 0;
  return Math.round((value / max) * 1000) / 10;
}

/**
 * Menghitung rekap skor dari nilai mentah per item (nomor item -> 1..5).
 * Item yang belum diisi dihitung 0; pemanggil wajib memvalidasi kelengkapan lebih dulu.
 */
export function computeDiagnosisResult(scores: Record<number, number>): DiagnosisResult {
  const aspects: DiagnosisAspectScore[] = DIAGNOSIS_ASPECTS.map((aspect) => {
    const score = aspect.items.reduce((total, item) => total + (scores[item.no] ?? 0), 0);
    const maxScore = aspect.items.length * DIAGNOSIS_ITEM_MAX_SCORE;
    return { key: aspect.key, label: aspect.label, score, maxScore, percent: roundPercent(score, maxScore) };
  });

  const score = aspects.reduce((total, aspect) => total + aspect.score, 0);
  const percent = roundPercent(score, DIAGNOSIS_MAX_SCORE);
  return { aspects, score, maxScore: DIAGNOSIS_MAX_SCORE, percent, label: diagnosisResultLabel(percent) };
}

/**
 * Menormalkan nilai mentah dari klien menjadi peta nomor item -> skor.
 * Mengembalikan daftar item yang tidak valid agar route dapat menolak submission.
 */
export function normalizeDiagnosisScores(raw: unknown) {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const scores: Record<number, number> = {};
  const invalid: number[] = [];

  for (const aspect of DIAGNOSIS_ASPECTS) {
    for (const item of aspect.items) {
      const value = Number(source[String(item.no)]);
      if (!Number.isInteger(value) || value < DIAGNOSIS_MIN_SCORE || value > DIAGNOSIS_ITEM_MAX_SCORE) {
        invalid.push(item.no);
        continue;
      }
      scores[item.no] = value;
    }
  }

  return { scores, invalid };
}
