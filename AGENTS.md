# AGENTS.md — Panduan untuk AI Agent & Kontributor

Dokumen ini adalah instruksi operasional bagi AI coding agent (Codex, Claude, Cursor, Copilot, dsb.) dan developer yang bekerja pada repository **TDA Pekanbaru 9.0** (`akuntakitatech-design/tdapku`). Baca `README.md` untuk arsitektur dan `README-COOLIFY.md` untuk deploy.

## 1. Konteks singkat

- Monorepo: `frontend/` (Nginx reverse proxy, tanpa kode aplikasi) dan `backend/` (Next.js 16 App Router, Node 22, TypeScript).
- Database **MariaDB** diakses lewat **shim D1-compatible** (`backend/lib/db/mariadb-d1.ts` + `sql-translate.ts`). Kode bisnis di `backend/db/*.ts` ditulis dalam dialek SQLite/D1 dan **tidak boleh** ditulis ulang ke dialek MySQL.
- File disimpan di **Cloudflare R2** lewat abstraksi `env.BUCKET` (`backend/lib/storage`).
- Autentikasi lokal (scrypt + pepper, cookie `tda_session`) di `backend/lib/vps-auth.ts`.
- Bahasa komunikasi, komentar, UI, dan commit: **Bahasa Indonesia**.

## 2. Perintah yang boleh dijalankan

Semua dari folder `backend/` dan **selalu Yarn** (bukan npm/pnpm):

| Tujuan | Perintah |
|---|---|
| Install dependensi | `yarn install --frozen-lockfile` |
| Tambah paket | `yarn add <pkg>` / `yarn add -D <pkg>` |
| Dev server | `yarn dev` (port 3000) |
| Lint | `yarn lint` |
| Type check | `yarn typecheck` (ada ~8 error tipe lama yang disengaja dibiarkan; jangan tambah yang baru) |
| Build produksi | `yarn build` (menjalankan `schema:generate` lalu `next build`) |
| Regenerasi modul skema | `yarn schema:generate` (setelah mengubah `deploy/mariadb/schema.sql`) |
| Akun login (CLI) | `yarn auth:account`, `yarn auth:provision` |

Build wajib berhasil **tanpa** `DATABASE_URL`. Uji manual endpoint dengan `curl` ke `http://localhost:3000/api/health` dan endpoint terkait perubahanmu.

## 3. Aturan wajib (DO)

1. **Akses DB hanya lewat `env.DB`** dari `@/lib/runtime-env`; SQL hanya di `backend/db/*.ts`. Route handler tidak berisi SQL.
2. **Query baru** ditulis dengan konstruksi yang sudah didukung `sql-translate.ts` (placeholder `?`, `INSERT ... RETURNING`, `ON CONFLICT ... DO UPDATE SET x = excluded.x`, `INSERT OR IGNORE`, `datetime('now')`, `||`). Jika perlu sintaks baru, tambahkan aturan translasi + uji nyata terhadap MariaDB.
3. **Perubahan skema** hanya di `backend/deploy/mariadb/schema.sql`, dalam bentuk **idempoten** (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `ADD CONSTRAINT IF NOT EXISTS`). Tidak ada `DROP`, `TRUNCATE`, atau perubahan tipe destruktif. Jalankan `yarn schema:generate` setelahnya.
4. **Akses file hanya lewat `env.BUCKET`** (`put/get/head/delete`). Simpan `key` di DB, bukan URL.
5. **Setiap endpoint mutasi** memeriksa sesi (`getVpsSessionIdentity`) + hak akses (`db/access-control.ts`) + same-origin untuk form (`isSameOriginRequest`).
6. **Waktu UTC** di DB; format Asia/Jakarta hanya di lapisan tampilan.
7. **Komponen UI** memakai primitif di `components/ui` (Shadcn) dan ikon `lucide-react`. Tambahkan `data-testid` pada elemen interaktif baru.
8. **Rute spesifik sebelum rute dinamis** di `app/api`.
9. Jalankan `yarn lint && yarn build` sebelum commit. Perubahan yang menyentuh DB/storage/auth **wajib** diuji terhadap MariaDB nyata (bukan hanya build).
10. Perubahan kecil dan terfokus; satu PR = satu tujuan. Commit message: `feat:|fix:|docs:|chore:|refactor: <ringkasan Bahasa Indonesia>`.

## 4. Larangan (DON'T)

- ❌ Jangan commit `.env`, `.env.*` (selain `.env.example`), kredensial MariaDB/R2, PAT GitHub, token Cloudflare, dump DB, file upload, atau data peserta. Jika tidak sengaja ter-commit: rotasi kredensialnya dan bersihkan history.
- ❌ Jangan mengganti `mysql2`/shim dengan ORM lain, atau menulis ulang query lama ke dialek MySQL "agar lebih bersih". Stabilitas 0 regresi lebih penting.
- ❌ Jangan mengubah `lib/db/sql-translate.ts` secara drastis. Perubahan harus minimal, disertai contoh SQL sebelum/sesudah di deskripsi PR, dan diuji terhadap MariaDB.
- ❌ Jangan mengedit `lib/db/schema.generated.ts` manual (dihasilkan otomatis, tidak dilacak git).
- ❌ Jangan mengembalikan kode ke Cloudflare Workers/D1/Vinext (`cloudflare:workers`, `wrangler`, `.openai/hosting.json`).
- ❌ Jangan memakai `npm`/`pnpm`, jangan mengedit `yarn.lock` manual.
- ❌ Jangan mengubah `frontend/nginx/default.conf.template` untuk hanya memproksi `/api` — Next.js melayani SSR + API di container yang sama, semua path harus diproksi.
- ❌ Jangan menaikkan `serverActions.bodySizeLimit` tanpa menaikkan `CLIENT_MAX_BODY_SIZE` Nginx (dan sebaliknya).
- ❌ Jangan menghapus/mereset data produksi atau menjalankan skrip migrasi terhadap `DATABASE_URL` produksi tanpa persetujuan eksplisit manusia.

## 5. Peta file yang sering disentuh

| Kebutuhan | File |
|---|---|
| Tambah endpoint | `backend/app/api/<domain>/route.ts` + fungsi di `backend/db/<domain>.ts` |
| Tambah halaman | `backend/app/<path>/page.tsx` + komponen di `backend/components/` |
| Hak akses/peran | `backend/db/access-control.ts`, `backend/lib/access-types.ts` |
| Login/sesi/cookie | `backend/lib/vps-auth.ts`, `backend/app/chatgpt-auth.ts`, `backend/app/api/auth/*` |
| Skema DB | `backend/deploy/mariadb/schema.sql` → `yarn schema:generate` |
| Translasi SQL | `backend/lib/db/sql-translate.ts` (hati-hati) |
| Storage/R2 | `backend/lib/storage/*` |
| Proxy/Nginx | `frontend/nginx/*`, `frontend/Dockerfile` |
| Env & deploy | `backend/.env.example`, `frontend/.env.example`, `README-COOLIFY.md` |

## 6. Checklist sebelum menyatakan selesai

- [ ] `yarn lint` dan `yarn build` lulus di `backend/`.
- [ ] Endpoint/halaman yang diubah diuji nyata (curl/browser) terhadap MariaDB + storage.
- [ ] Tidak ada secret di diff (`git diff --cached | grep -iE "password|secret|token|mysql://"`).
- [ ] `schema.sql` (jika berubah) idempoten dan sudah dijalankan dua kali tanpa error.
- [ ] Dokumentasi (`README.md` / `README-COOLIFY.md` / `.env.example`) diperbarui bila ada env atau alur baru.
- [ ] Ringkasan perubahan ditulis dalam Bahasa Indonesia.
