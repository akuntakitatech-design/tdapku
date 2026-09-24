# TDA Pekanbaru 9.0 — Program Kerja TDA Pekanbaru

Aplikasi manajemen program kerja, keanggotaan, event, kehadiran, keuangan (bendahara), dan situs publik untuk komunitas **Tangan Di Atas (TDA) Pekanbaru** periode 9.0. Repository ini adalah monorepo yang dideploy ke **Coolify** sebagai dua service: `frontend` (Nginx) dan `backend` (Next.js).

> Domain produksi: `https://tdapekanbaru.id` (sebelumnya `tdapku.my.id`) · Versi aplikasi: **61** (baseline) → migrasi Coolify.

---

## 1. Overview Project

### Tujuan
Memberikan satu tempat bagi pengurus TDA Pekanbaru untuk merencanakan dan menjalankan program kerja, sekaligus menyediakan halaman publik bagi calon peserta/anggota.

### Pengguna & peran
| Peran | Akses utama |
|---|---|
| `ketua_ksb` | Semua fitur: master pengurus, semua program, approval, bendahara, keanggotaan |
| `kadiv` | Program milik divisinya (tulis), keanggotaan jika di divisi membership |
| `bendahara` | Kas & kategori keuangan (treasury), laporan |
| `pengurus` / lainnya | Baca program, tugas, kalender, notifikasi sesuai penugasan |
| Publik (tanpa login) | Katalog program, kalender, pendaftaran event, form member, feedback, check-in QR |

### Fitur utama
- **Program kerja**: CRUD program, tugas per program, approval, publikasi + media, LPJ, evaluasi, feedback.
- **Keuangan program & bendahara**: pemasukan/pengeluaran per program dengan bukti (receipt), akun kas, kategori, laporan.
- **Keanggotaan**: pendaftaran member publik, QRIS pembayaran, verifikasi bukti bayar oleh pengurus.
- **Event & kehadiran**: pendaftaran peserta publik (`/daftar/[eventId]`), flyer, bukti bayar, check-in QR (`/checkin`), mode Hari-H.
- **Situs publik/CMS**: konten section situs, media showcase, Business Spotlight, member submission.
- **Notifikasi & activity log** untuk pengurus.
- **Autentikasi lokal**: email + password (scrypt + pepper) dengan cookie sesi `tda_session`.

### Riwayat arsitektur (penting untuk memahami kode)
1. **v61 (baseline)** — Cloudflare Workers + D1 (SQLite) + R2, framework Vinext.
2. **VPS staging** — Node.js + PostgreSQL + disk lokal (shim D1→PG).
3. **Sekarang (Coolify)** — Next.js 16 standalone (Node 22) + **MariaDB** (shim D1→MariaDB) + **Cloudflare R2** via S3 SDK, di belakang **Nginx**.

Kode bisnis di `backend/db/*` **masih ditulis dengan API D1** (`prepare/bind/first/all/run/batch`) dan SQL dialek SQLite. Ia "mengira" berbicara dengan D1, padahal `lib/db/mariadb-d1.ts` + `lib/db/sql-translate.ts` menerjemahkannya ke MariaDB secara on-the-fly. **Ini disengaja** agar 0 regresi; jangan menulis ulang query lama.

---

## 2. Tech Stack

| Lapisan | Teknologi | Catatan |
|---|---|---|
| Edge / proxy | **Nginx 1.27-alpine** | Satu-satunya service dengan domain publik. Memproksi **semua path** (SSR + `/api/*`) ke backend melalui alias jaringan Coolify `backend-tdapku:3000`. `/healthz` lokal. |
| Aplikasi | **Next.js 16.2** (App Router, `output: "standalone"`), **React 19**, **TypeScript 5.9** | Berjalan di **Node.js 22** (`node server.js`). SSR + Route Handlers `/api/*`. |
| UI | **Tailwind CSS 4**, komponen Shadcn (`components/ui`), `lucide-react`, `sonner`, `recharts`, `react-hook-form` + `zod` | |
| Database | **MariaDB 11.x** via **`mysql2`** | Skema tunggal `backend/deploy/mariadb/schema.sql`, diterapkan idempoten saat start (`lib/db/ensure-schema.ts`). |
| Adapter DB | `lib/db/mariadb-d1.ts`, `lib/db/sql-translate.ts` | Emulasi API D1 + translasi SQL (`RETURNING`, `ON CONFLICT`, `COLLATE NOCASE`, `||`, `datetime()`, dll). |
| Object storage | **Cloudflare R2** via `@aws-sdk/client-s3` (`lib/storage/s3-bucket.ts`) | Bucket `media-tdapku`. Driver `local` tersedia untuk dev. |
| Autentikasi | Custom, `lib/vps-auth.ts` | scrypt + pepper, sesi di tabel `vps_auth_sessions`, cookie HttpOnly `tda_session`, cek same-origin. |
| Runtime & deploy | **Docker** (multi-stage), **Coolify** | Dua aplikasi Coolify dari satu repo, base dir `/frontend` dan `/backend`. |
| Package manager | **Yarn 1 (classic)** | `yarn.lock` di `backend/`. Jangan gunakan npm. |

---

## 3. Folder Structure

```text
.
├── README.md                 # Dokumen ini
├── README-COOLIFY.md         # Panduan deploy ke Coolify (langkah demi langkah)
├── AGENTS.md                 # Aturan kerja untuk AI agent / kontributor
├── .gitignore
│
├── frontend/                 # Service "frontend" di Coolify (Nginx reverse proxy)
│   ├── Dockerfile            # nginx:1.27-alpine, port 80, healthcheck /healthz
│   ├── .env.example          # BACKEND_URL, NGINX_PORT, CLIENT_MAX_BODY_SIZE, APP_HOST, PUBLIC_HOST
│   └── nginx/
│       ├── default.conf.template        # Template server block (envsubst saat start)
│       ├── 05-normalize-backend-url.envsh  # Normalisasi BACKEND_URL (tambah http://, hapus trailing /)
│       ├── 10-backoffice-host.envsh        # APP_HOST/PUBLIC_HOST → pemisahan backoffice vs publik
│       └── 16-resolver-fallback.envsh      # Deteksi DNS resolver Docker untuk proxy_pass dinamis
│
└── backend/                  # Service "backend" di Coolify (Next.js 16, Node 22)
    ├── Dockerfile            # Multi-stage: deps → build (yarn build) → runtime standalone
    ├── .dockerignore
    ├── .env.example          # Semua env yang dibaca aplikasi (tanpa nilai rahasia)
    ├── package.json          # Skrip: dev, build, start, lint, typecheck, schema:generate, auth:*
    ├── next.config.ts        # output standalone, bodySizeLimit 20mb
    ├── instrumentation.ts    # Hook start server: ensureSchema + bootstrap admin + cek storage
    │
    ├── app/                  # Next.js App Router
    │   ├── page.tsx          # Beranda publik
    │   ├── login/, account/password/     # Autentikasi
    │   ├── admin/, member/, program/, kalender/, tentang/
    │   ├── daftar/[eventId]/, checkin/, feedback/, form/member/   # Halaman publik
    │   ├── chatgpt-auth.ts   # Resolver identitas sesi → user (dipakai halaman & API)
    │   └── api/              # Route Handlers (REST) — lihat bagian Data Flow
    │       ├── health/       # GET /api/health → cek MariaDB (dipakai HEALTHCHECK Docker)
    │       ├── auth/{login,logout,password}/
    │       ├── access/me/
    │       ├── programs/, programs/[id]/{tasks,finance,income,lpj,publication,approval,evaluations,feedback}/
    │       ├── program-management/{bootstrap,calendar,reports,summary}/
    │       ├── tasks/, activities/, categories/, pics/, notifications/, users/
    │       ├── treasury/, treasury/{accounts,categories}/
    │       ├── membership/, membership/public/{payment,qris}/, membership/proof/[id]/
    │       ├── attendance/, attendance/payment-proof/[participantId]/
    │       ├── public-programs/, public-registration/[eventId]/{flyer,qris,payment}/
    │       ├── public-media/, publication-media/, public-site/, public-site/admin/
    │       └── public/{member-content,member-submission}/, public-feedback/, public-event-feedback/
    │
    ├── components/           # Komponen React (client) per modul bisnis
    │   ├── ui/               # Primitif Shadcn (button, dialog, table, ...)
    │   ├── program-management/   # Dashboard pengurus: list, approval, kalender, notifikasi, tugas
    │   ├── public-site/      # CMS situs publik & Business Spotlight
    │   ├── attendance-app.tsx, checklist-app.tsx, hari-h-mode.tsx
    │   ├── membership-registration.tsx, membership-management.tsx, member-public-form.tsx
    │   ├── public-registration.tsx, public-program-catalog.tsx, public-calendar.tsx
    │   └── feedback-form.tsx, event-feedback-entry.tsx, activity-log.tsx, pic-dashboard.tsx
    │
    ├── db/                   # Lapisan data (query SQL gaya D1) per domain
    │   ├── access-control.ts     # users, role, hak akses
    │   ├── program-management.ts, tasks.ts, program-activity.ts
    │   ├── program-finance.ts, treasury.ts
    │   ├── program-evaluation.ts, program-feedback.ts
    │   ├── membership.ts, attendance.ts
    │   ├── public-programs.ts, public-media.ts, public-site.ts, public-member-submissions.ts
    │   └── user-management.ts
    │
    ├── lib/
    │   ├── runtime-env.ts        # `env.DB` & `env.BUCKET` pengganti binding Cloudflare
    │   ├── db/
    │   │   ├── mariadb-d1.ts     # Pool mysql2 + kelas MariaD1Database (API D1)
    │   │   ├── sql-translate.ts  # Translasi SQL SQLite/PG → MariaDB (regex, hati-hati!)
    │   │   ├── ensure-schema.ts  # Terapkan schema.sql idempoten + bootstrap admin
    │   │   └── schema.generated.ts  # DIHASILKAN dari deploy/mariadb/schema.sql (jangan edit)
    │   ├── storage/
    │   │   ├── index.ts          # getBucket() → S3Bucket | LocalBucket berdasarkan STORAGE_DRIVER
    │   │   ├── s3-bucket.ts      # Cloudflare R2 (S3 SDK)
    │   │   ├── local-bucket.ts   # Disk lokal (dev)
    │   │   └── types.ts          # BucketLike (put/get/head/delete) — API mirip R2
    │   ├── vps-auth.ts           # Login, sesi, hash scrypt, cookie, same-origin
    │   ├── access-types.ts, client-cache.ts, utils.ts
    │
    ├── deploy/mariadb/schema.sql # SUMBER KEBENARAN skema database (39 tabel)
    ├── scripts/
    │   ├── generate-schema-module.mjs    # schema.sql → lib/db/schema.generated.ts
    │   ├── vps-auth-account.mjs          # Buat/reset satu akun login (CLI)
    │   └── vps-auth-bulk-provision.mjs   # Provisioning massal akun login
    ├── hooks/use-mobile.ts
    ├── public/                # Aset statis non-sensitif
    └── vendor/                # CSS Shadcn/Tailwind vendored
```

---

## 4. Data Flow

### 4.1 Alur request (produksi di Coolify)

```text
Browser ── HTTPS ──▶ Traefik (Coolify) ──▶ [frontend] Nginx :80
                                                │  proxy_pass semua path
                                                │  + X-Forwarded-Proto/Host/For
                                                ▼
                                     [backend] Next.js :3000 (node server.js)
                                        ├── Halaman SSR (app/**/page.tsx)
                                        └── Route Handlers (app/api/**/route.ts)
                                                │
                          ┌─────────────────────┼─────────────────────┐
                          ▼                     ▼                     ▼
                 lib/vps-auth.ts        db/*.ts (query D1)     lib/storage (BucketLike)
                 (sesi/cookie)                  │                     │
                          │            lib/db/mariadb-d1.ts    lib/storage/s3-bucket.ts
                          │            lib/db/sql-translate.ts        │
                          ▼                     ▼                     ▼
                    MariaDB (vps_auth_*)   MariaDB (39 tabel)   Cloudflare R2 (media-tdapku)
```

- **Pemisahan domain (mode ketat)**: `app.tdapekanbaru.id` = backoffice (`/login`, `/admin`, `/account`), `tdapekanbaru.id` = publik. Nginx mengalihkan path yang salah tempat (302) berdasarkan `APP_HOST`/`PUBLIC_HOST`; `/checkin`, `/api/*`, `/_next/*`, aset statis dilayani di kedua host. Detail di `README-COOLIFY.md`.
- Nginx memakai `proxy_pass` dengan **variabel + resolver** sehingga nama `backend-tdapku` di-resolve saat request; jika backend belum siap, Nginx membalas `502 {"error":"BACKEND_UNAVAILABLE"}` dan pulih otomatis.
- Backend **tidak** punya domain publik; hanya dapat diakses dari jaringan internal Coolify.

### 4.2 Startup backend
1. Next.js memanggil `instrumentation.ts → register()`.
2. `schemaReady()` → `ensureSchema(pool)`: ambil `GET_LOCK`, hitung checksum `schema.sql`; bila belum tercatat di `schema_migrations`, jalankan semua statement (`CREATE TABLE/INDEX IF NOT EXISTS`, `ADD CONSTRAINT IF NOT EXISTS`).
3. Bootstrap admin **hanya** jika tabel `vps_auth_accounts` kosong (`BOOTSTRAP_ADMIN_*`).
4. Log driver storage. Aplikasi siap; `GET /api/health` mengembalikan `{ ok: true, databaseTime, storage }`.

### 4.3 Autentikasi & otorisasi
```text
POST /api/auth/login (form) ─▶ isSameOriginRequest ─▶ authenticateVpsAccount(email, password)
   scrypt(password + AUTH_PASSWORD_PEPPER) == vps_auth_accounts.password_hash ?
   ─▶ createVpsSession() → insert vps_auth_sessions (token HMAC AUTH_SESSION_SECRET, TTL jam)
   ─▶ 303 redirect + Set-Cookie tda_session (HttpOnly; Secure otomatis dari X-Forwarded-Proto)
   Redirect mengikuti host yang dibuka (app.tdapekanbaru.id) bila host = APP_URL atau subdomain-nya;
   host lain jatuh ke APP_URL (lib/vps-auth.ts → getAppOrigin).

Setiap halaman/API terproteksi:
   getVpsSessionIdentity() (cookie) ─▶ app/chatgpt-auth.ts ─▶ db/access-control.ts
   ─▶ users (role, division_id) ─▶ hak akses (ketua_ksb / kadiv / bendahara / ...)
```
- Perubahan password: `POST /api/auth/password`. Logout: `POST /api/auth/logout` (hapus baris sesi + clear cookie).
- Akun baru untuk pengurus dibuat dari CLI (`yarn auth:account`) atau massal (`yarn auth:provision`).

### 4.4 Jalur database (D1 → MariaDB)
```text
db/tasks.ts:  env.DB.prepare("INSERT ... RETURNING id").bind(a, b).first()
     │
     ▼  lib/db/mariadb-d1.ts (MariaPreparedStatement)
  translateSqliteToMariaDb(sql)   →  ubah dialek (contoh di bawah)
  bindPlaceholders(sql, values)    →  ? / ?1 / $1 → nilai ter-escape
  simulasi RETURNING               →  INSERT lalu SELECT ... WHERE id = LAST_INSERT_ID()
     │
     ▼  mysql2 pool (UTC, utf8mb4, PIPES_AS_CONCAT)
  MariaDB → hasil dinormalisasi kembali ke bentuk D1: { results, meta: { changes, last_row_id } }
```
Contoh translasi: `INSERT OR IGNORE` → `INSERT IGNORE`; `ON CONFLICT(x) DO UPDATE SET a = excluded.a` → `ON DUPLICATE KEY UPDATE a = VALUES(a)`; `COLLATE NOCASE` dihapus (kolasi `utf8mb4_unicode_ci` sudah case-insensitive); `datetime('now')` → `UTC_TIMESTAMP()`; `RETURNING ...` disimulasikan; `||` bekerja karena `PIPES_AS_CONCAT`.

### 4.5 Jalur file (upload/unduh)
```text
Upload (multipart)  ─▶ route handler ─▶ env.BUCKET.put(key, bytes, { httpMetadata })
                                            └─▶ S3Bucket.putObject(bucket=media-tdapku, key)
  metadata (key, mime, ukuran) disimpan di MariaDB (mis. public_media, publication_media,
  membership.payment_proof_key, attendance_participants.payment_proof_key, program_finance receipt)

Unduh/tampil       ─▶ GET /api/.../image | /flyer | /qris | /receipt | /proof
                     ─▶ env.BUCKET.get(key) ─▶ stream body + Content-Type ke browser
```
Key objek **identik** dengan data lama (`R2_PREFIX` kosong), sehingga 39 objek hasil migrasi langsung terpakai.

### 4.6 Alur bisnis ringkas
- **Program**: `POST /api/programs` → `programs` (status draft) → tugas `programs/[id]/tasks` → `approval` (ketua_ksb) → `publication` (+ media ke R2) → pelaksanaan (`attendance`, check-in) → `finance/income` + receipt → `lpj` → `evaluations`/`feedback`. Setiap langkah menulis `notifications` dan `activities`.
- **Member publik**: `POST /api/membership/public` → `GET .../qris` (gambar QRIS dari R2) → `POST .../payment` (upload bukti ke R2) → pengurus verifikasi via `/api/membership`.
- **Event publik**: `GET /api/public-programs/[code]` → `POST /api/public-registration/[eventId]` → bukti bayar → QR check-in di `/checkin` → `POST /api/attendance`.

---

## 5. Coding Conventions

### Bahasa & gaya
- Bahasa UI, pesan error, komentar, dan commit message: **Bahasa Indonesia**. Nama identifier kode: bahasa Inggris (`camelCase`).
- TypeScript strict-ish; hindari `any`. Tipe hasil query didefinisikan eksplisit di `db/*.ts` (lihat `Task`, `Category`).
- Formatting mengikuti ESLint `eslint-config-next` (`yarn lint`). Import alias `@/` → root `backend/`.

### Struktur & pemisahan tanggung jawab
- **`app/api/**/route.ts`** hanya: parse request, cek sesi/hak akses, panggil fungsi di `db/*`, bentuk `Response`. Tidak ada SQL di route handler.
- **`db/*.ts`** berisi seluruh SQL dan aturan domain. Satu file per domain. Akses DB **selalu** lewat `env.DB` dari `@/lib/runtime-env` — jangan import `mysql2` langsung dari kode bisnis.
- **`components/*`** = client component per modul; `components/ui` hanya primitif Shadcn (jangan taruh logika bisnis di sini).
- Rute spesifik didefinisikan sebelum rute berparameter (`/api/users/me` sebelum `/api/users/[id]`).

### Database
- Sumber kebenaran skema: `backend/deploy/mariadb/schema.sql`. Perubahan skema **hanya** dengan statement idempoten (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `ADD CONSTRAINT IF NOT EXISTS`) karena file ini dieksekusi ulang setiap kali checksum berubah. Jalankan `yarn schema:generate` (otomatis saat `build`/`dev`).
- SQL di `db/*` ditulis dalam **dialek SQLite/D1** (placeholder `?`, `RETURNING`, `ON CONFLICT`) agar konsisten dengan kode lama; biarkan `sql-translate.ts` menerjemahkan. Jika menulis query baru, gunakan konstruksi yang **sudah** didukung translator, atau tambahkan aturan translasi + uji.
- Waktu selalu **UTC** di DB (`DATETIME(3)`, `UTC_TIMESTAMP()`); konversi ke `Asia/Jakarta` hanya di lapisan tampilan.
- Identifier: `snake_case` di DB, `camelCase` di TypeScript (alias di `SELECT ... AS camelCase`).
- Jangan pernah `DROP`/`TRUNCATE` di `schema.sql`.

### Autentikasi & keamanan
- Endpoint mutasi wajib memeriksa sesi (`getVpsSessionIdentity`) dan hak akses (`db/access-control.ts`), serta same-origin untuk form.
- Cookie sesi `HttpOnly`, `SameSite=Lax`, `Secure` otomatis (`COOKIE_SECURE=auto`) dari `X-Forwarded-Proto`.
- Password: scrypt + `AUTH_PASSWORD_PEPPER`; jangan pernah log password/hash/token.
- **Jangan commit** `.env`, kredensial R2/MariaDB, PAT, dump DB, atau file upload. `.gitignore` dan `.dockerignore` sudah mengecualikannya; hanya `.env.example` yang dilacak.

### Storage
- Semua akses file lewat `env.BUCKET` (`BucketLike`), bukan langsung `@aws-sdk`. Simpan `key`, `contentType`, `size` di DB; jangan simpan URL absolut.
- Batas upload 20 MB (`serverActions.bodySizeLimit` di backend dan `CLIENT_MAX_BODY_SIZE` di Nginx harus sama).

### Infrastruktur & rilis
- Package manager **Yarn** (`yarn add`, `yarn install --frozen-lockfile`). Jangan gunakan npm/pnpm agar `yarn.lock` konsisten dengan Dockerfile.
- Build harus lulus tanpa `DATABASE_URL` (skema & koneksi hanya dibutuhkan saat runtime).
- Sebelum push: `cd backend && yarn lint && yarn build`. Kemudian verifikasi `GET /api/health` di lingkungan target.
- Commit message: imperatif, Bahasa Indonesia, awali dengan tipe (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`). Branch kerja → PR ke `main`; `main` selalu deployable (Coolify auto-deploy dari `main`).

---

## Menjalankan secara lokal

```bash
cd backend
cp .env.example .env            # isi DATABASE_URL, AUTH_*, R2_* (atau STORAGE_DRIVER=local)
yarn install --frozen-lockfile
yarn dev                        # http://localhost:3000
```

Butuh MariaDB lokal, misalnya: `docker run -d --name tdapku-db -e MARIADB_ROOT_PASSWORD=dev -e MARIADB_DATABASE=default -p 3306:3306 mariadb:11`, lalu `DATABASE_URL=mysql://root:dev@127.0.0.1:3306/default`. Skema dibuat otomatis saat start; akun admin pertama dibuat dari `BOOTSTRAP_ADMIN_*` bila tabel akun kosong.

Deploy ke Coolify: lihat **[README-COOLIFY.md](./README-COOLIFY.md)**. Panduan untuk AI agent/kontributor: **[AGENTS.md](./AGENTS.md)**.
