# AGENTS.md — Aturan kerja untuk agent AI & kontributor TDA Pekanbaru 9.0

Dokumen ini mengikat siapa pun (manusia atau agent) yang mengubah repository `akuntakitatech-design/tdapku`.
Tujuannya satu: **setiap perubahan masuk lewat Pull Request yang rapi, sehingga apa yang ditambah dan apa yang dikurangi terlihat jelas dan bisa direview**, lalu Coolify men-deploy `main` tanpa kejutan.

Konteks arsitektur ada di `README.md`; cara deploy di `README-COOLIFY.md`. Dokumen ini tentang **cara bekerja**.

---

## 1. Identitas & akses

- Semua commit yang dibuat agent memakai identitas repo:
  ```sh
  git config user.name "akuntakitatech-design"
  git config user.email "akuntakitatech-design@users.noreply.github.com"
  ```
  Jalankan di awal **setiap sesi** (konfigurasi bisa hilang saat environment di-restore). Cek sebelum push: `git log -1 --format=%an`.
- Load (clone/fetch), push, dan pembuatan PR memakai **GitHub Personal Access Token (PAT)** yang diberikan pemilik repo, lewat HTTPS:
  `https://x-access-token:<PAT>@github.com/akuntakitatech-design/tdapku.git`.
- Token **tidak pernah** ditulis ke file yang di-commit, log, README, PR body, komentar, atau ringkasan chat. Pakai variabel shell sesaat; remote `origin` tetap URL tanpa token. Saring output: `| sed -E 's/github_pat_[A-Za-z0-9_]+/***/g'`.
- Token yang pernah terlihat di chat/file dianggap terekspos: sarankan rotasi ke pemilik.

## 2. Larangan keras

- **Tidak ada push langsung ke `main`.** Tidak ada `--force` ke branch yang sudah dibuka PR-nya. Hotfix pemblokir deploy pun lewat PR (pemilik bisa merge dalam hitungan detik).
- Tidak commit: `.env*` (kecuali `.env.example`), dump `.sql`/`.ndjson` (kecuali `backend/deploy/mariadb/schema.sql`), key/`.pem`, file upload/bukti bayar/foto peserta, `node_modules/`, `.next/`, `lib/db/schema.generated.ts`, folder `uploads/`, `data/`, `secrets/`.
- Tidak menulis kredensial produksi (password MariaDB, `AUTH_SESSION_SECRET`, `AUTH_PASSWORD_PEPPER`, key R2, token Cloudflare, PAT) ke file mana pun di repo, termasuk dokumentasi. Gunakan placeholder.
- Tidak menjalankan `DROP`, `TRUNCATE`, `DELETE` massal, skrip import/migrasi, atau `ALTER` destruktif terhadap `DATABASE_URL` produksi tanpa perintah eksplisit pemilik **dan** backup terlebih dahulu.
- Tidak menulis ulang query lama di `backend/db/*.ts` ke dialek MySQL, mengganti shim `mariadb-d1.ts`/`sql-translate.ts` dengan ORM lain, atau mengembalikan kode ke Cloudflare Workers/D1/Vinext.
- Tidak hardcode domain (`tdapekanbaru.id`, `app.tdapekanbaru.id`, `tdapku.my.id`) di komponen/route — pakai `publicOrigin()`/`publicHost()` (`backend/lib/public-origin.ts`) dan `getAppOrigin(request)` (`backend/lib/vps-auth.ts`).
- Tidak memakai `npm`/`pnpm`; tidak mengedit `yarn.lock` manual.
- Tidak menambah pola `.gitignore`/`.dockerignore` **tanpa awalan `/`** untuk nama umum (`storage/`, `data/`, `cache/`, …). Insiden 2026-09-24: pola `storage/` menyaring folder kode `backend/lib/storage` → build Coolify gagal `Module not found '@/lib/storage'`.
- Tidak membuat data/mock/integrasi palsu agar "terlihat jalan". Fitur tanpa kredensial harus gagal jelas dengan pesan yang bisa dimengerti.

## 3. Alur kerja wajib (setiap tugas)

```
1. Sinkron        git fetch origin && git checkout main && git pull --ff-only origin main
2. Branch baru    git checkout -b <tipe>/<ringkas-kebab-case>        (dari main, bukan branch lain)
3. Kerjakan       perubahan sekecil mungkin yang menyelesaikan satu tujuan
4. Uji            jalankan pengujian yang relevan (§6), catat hasil nyata (angka, status code)
                  bug yang dilaporkan pemilik / fitur lintas modul → wajib testing agent (§6)
5. Review diri    git diff --stat && git diff  → tidak ada secret/file sampah/console.log debug
                  git check-ignore -v <file-baru>  → file kode tidak tersaring .gitignore
6. Commit         pesan Conventional Commits (§4), author sesuai §1
7. Push           git push https://x-access-token:$PAT@github.com/akuntakitatech-design/tdapku.git <branch>
8. PR             POST /repos/akuntakitatech-design/tdapku/pulls dengan base **main** (§3.1), body template §5
9. Tunggu review  kirim link PR ke pemilik; jangan merge sendiri kecuali diminta eksplisit
10. Setelah merge git fetch --prune; hapus branch remote (DELETE /git/refs/heads/<branch>); checkout main; pull
11. Verifikasi    dari luar: https://tdapekanbaru.id/healthz, /api/health, dan alur yang diubah
```

Nama branch: `feat/…`, `fix/…`, `docs/…`, `chore/…`, `refactor/…`, `checkpoint/…` (snapshot pekerjaan berjalan).
Satu PR = satu tujuan. Tugas besar dipecah menjadi beberapa PR **berurutan** (bukan bertumpuk).

### 3.1 Base PR selalu `main` — stacked PR dilarang

- **Setiap PR wajib ber-base `main`.** Dilarang membuka PR dengan base branch fitur lain, sekalipun perubahannya bergantung pada PR yang belum di-merge.
- Kalau pekerjaan berikutnya bergantung pada PR yang masih terbuka: **berhenti dan tunggu** PR itu di-merge, lalu `git fetch origin && git rebase origin/main` sebelum membuka PR baru.
- Kalau PR di-merge pemilik **sebelum** commit lanjutan masuk (terjadi pada PR #1 → #2): jangan push lagi ke branch yang sudah merged; buat branch baru dari `origin/main`, `git cherry-pick` commit-nya, buka PR baru.
- Setelah PR di-merge, **hapus branch-nya di remote** agar tidak muncul banner "had recent pushes" dan tidak jadi base tanpa sengaja. Sarankan pemilik mengaktifkan *Settings → General → Automatically delete head branches*.
- Sebelum membuat PR lewat API verifikasi payload `"base": "main"`; sesudahnya cek `GET /pulls/<n>` → `base.ref` = `main`.

## 4. Format commit (Conventional Commits)

```
<tipe>(<scope>): <ringkasan imperatif Bahasa Indonesia, ≤ 72 karakter>

- apa yang ditambah
- apa yang diubah
- apa yang dihapus dan alasannya
```

Tipe: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`. Scope contoh: `auth`, `db`, `storage`, `nginx`, `docker`, `admin`, `publik`, `membership`, `attendance`, `treasury`, `deploy`.

## 5. Template PR (wajib diisi semua bagian)

```markdown
## Tujuan
Satu-dua kalimat: masalah apa yang diselesaikan / fitur apa yang dibangun, dan mengapa.

## Ditambah (+)
- file/modul/endpoint/env baru …

## Diubah (~)
- perilaku lama → perilaku baru, dan alasannya …

## Dihapus (−)
- apa yang dibuang dan mengapa aman …

## Dampak
- Env baru / berubah: …  (hanya NAMA variabel, nilai TIDAK ditulis)
- Database / schema: tidak ada | ada (statement idempoten yang ditambah di schema.sql)
- Domain / Nginx: tidak ada | ada (path/host yang berubah perilaku redirect-nya)
- Breaking change: tidak | ya (jelaskan)
- Perlu redeploy di Coolify: Backend-TDAPKU | frontend-TDAPKU | keduanya | tidak
- Tindakan manual pemilik setelah merge: tidak ada | (langkah Coolify: env/domain/alias)

## Pengujian
- [ ] perintah/skenario yang dijalankan + hasil nyata (mis. `yarn build` → Compiled successfully; `curl -H "Host: tdapekanbaru.id" …/admin` → 302 app.)
- [ ] testing agent: iteration N → X/Y lulus (wajib untuk bug pemilik / alur pengguna)
- [ ] hal yang TIDAK diuji dan alasannya

## Checklist
- [ ] Tidak ada secret / file sampah dalam diff
- [ ] Dokumentasi diperbarui (README / README-COOLIFY / .env.example / AGENTS) jika relevan
- [ ] Tidak ada push ke main; base PR = `main`
- [ ] `git check-ignore` tidak menyaring file kode baru
```

Judul PR mengikuti format commit: `feat(nginx): …`, `fix(auth): …`. Snapshot pekerjaan: `Checkpoint: …`.
Template ini **bukan opsional**: PR tanpa bagian Ditambah/Diubah/Dihapus/Dampak/Pengujian dianggap belum siap review.

## 6. Standar pengujian sebelum PR

| Area yang diubah | Minimal yang harus dijalankan |
|---|---|
| Backend umum | `cd backend && yarn lint && yarn build` lulus; server lokal start; `curl /api/health` → 200 `{ok:true}`; endpoint yang disentuh dicoba dengan curl |
| `backend/db/*` / `sql-translate.ts` | Uji query nyata terhadap MariaDB (preview memakai DB produksi — lihat §9: hanya operasi yang aman/diminta). Jika menyentuh `RETURNING`/`ON CONFLICT`, uji insert + baca balik |
| `schema.sql` | Jalankan **dua kali** terhadap DB lokal/percobaan tanpa error (idempoten); `yarn schema:generate` |
| Auth / sesi / redirect | `POST /api/auth/login` dengan `Host`/`X-Forwarded-Host`/`Origin` untuk host utama, `app.`, dan host asing → Location benar, cookie `tda_session` ada; logout membersihkan cookie |
| Storage / R2 | Upload kecil + baca balik lewat endpoint (`/api/public-media/*`, `/flyer`, `/qris`, `/receipt`), lalu hapus objek uji |
| `frontend/nginx/*` | Render template dengan `envsubst` (hanya env terdefinisi) → `nginx -t` lulus → jalankan di port uji → `curl -H "Host: …"` untuk `tdapekanbaru.id`, `www`, `app.` pada path backoffice, publik, `/api`, `/healthz`, aset |
| Dockerfile / `.gitignore` / dependensi | Build dari **clone bersih** (bukan working copy) dengan `NODE_ENV=production` di environment — Coolify menyuntikkan env itu ke build |
| **Bug yang dilaporkan pemilik** atau alur pengguna (login, pendaftaran, pembayaran, check-in, publikasi) | Reproduksi dulu (curl/Playwright), perbaiki, lalu **jalankan testing agent** (Emergent `testing_agent`, laporan `/app/test_reports/iteration_N.json`). Curl/screenshot sendiri **tidak cukup** untuk menyatakan bug pemilik selesai; kutip nomor iterasi + hasil di PR |

Tulis hasil nyata (angka, status code, Location), bukan "sudah dites".

## 7. Perubahan schema database

- Satu sumber kebenaran: `backend/deploy/mariadb/schema.sql`. Tidak ada tool migrasi terpisah; file ini dieksekusi ulang oleh `lib/db/ensure-schema.ts` saat backend start bila checksum berubah (dengan `GET_LOCK`, dicatat di `schema_migrations`).
- Hanya statement **idempoten & aditif**: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, `ADD CONSTRAINT IF NOT EXISTS`. Tidak ada `DROP`, `RENAME`, perubahan tipe, atau `TRUNCATE`.
- Kolom waktu `DATETIME(3)` UTC; identifier `snake_case`; kolasi `utf8mb4_unicode_ci`.
- Setelah mengubah: `yarn schema:generate` (otomatis saat `yarn build`), uji dua kali, tandai PR `Database / schema: ada`. Backend akan menerapkannya sendiri saat redeploy — pemilik cukup redeploy Backend-TDAPKU.

## 8. Dokumentasi yang harus ikut diperbarui

| Jika mengubah… | Perbarui… |
|---|---|
| Env variable | `backend/.env.example` atau `frontend/.env.example` (nama + keterangan, tanpa nilai rahasia) dan tabel env di `README-COOLIFY.md` |
| Endpoint API / halaman | bagian Folder Structure & Data Flow di `README.md` |
| Skema DB | `README.md` §Data Flow bila alur berubah; `README-COOLIFY.md` bila perlu tindakan |
| Nginx / domain / redirect | `README-COOLIFY.md` §Pemisahan domain dan `AGENTS.md` §11 |
| Cara deploy / Coolify / DNS | `README-COOLIFY.md` (termasuk tabel Troubleshooting) |
| Jebakan/insiden baru | `AGENTS.md` §12 (tabel jebakan) |

**Tidak membuat folder `docs/` atau file markdown baru di root.** Dokumentasi proyek hanya: `README.md`, `README-COOLIFY.md`, `AGENTS.md` di root, plus `.env.example` per paket. Laporan panjang diringkas ke dokumen yang sesuai; artefak yang bisa dibangkitkan ulang (log build, laporan uji) tidak di-commit.

## 9. Bekerja dengan production

- **Preview Emergent dan tdapekanbaru.id memakai MariaDB Coolify dan bucket R2 yang sama** (preview lewat URL publik `103.93.129.172:61948`, production lewat host internal). Artinya: **setiap perintah tulis dari preview adalah perintah tulis ke production.** Tidak ada database dummy.
- Perubahan skema yang sudah diterapkan dari preview (karena backend preview start dengan `schema.sql` baru) **tidak perlu diulang** di production — cukup dicatat di PR ("sudah diterapkan di DB live, tanggal …").
- Akun uji: `uji.emergent@tdapku.my.id` (role `ketua_ksb`, password di `/app/secrets/test_account_password`). Data uji (program, event, peserta, upload) yang dibuat saat pengujian **dihapus kembali** atau dicatat eksplisit di PR bila dibiarkan. Tidak membuat pembayaran/peserta/notifikasi uji yang terlihat pengurus tanpa izin.
- Akses DB production hanya untuk: verifikasi koneksi, membaca data untuk diagnosis, dan penulisan yang **diminta eksplisit**. Laporkan setiap perintah tulis (apa, kapan, hasil) di PR/ringkasan kerja.
- 13 akun login lama bergantung pada `AUTH_PASSWORD_PEPPER` + `AUTH_SESSION_SECRET` yang sama — jangan pernah mengubah nilainya di Coolify tanpa rencana reset password massal.
- Kredensial yang pernah dikirim lewat chat/file dianggap terekspos: sarankan rotasi, jangan salin ke repo.

## 10. Checklist cepat sebelum `git push`

```
[ ] Branch bukan main, dibuat dari origin/main terbaru
[ ] git status bersih dari .env, .sql/.ndjson dump, key, uploads, schema.generated.ts
[ ] git check-ignore -v pada file baru → tidak ada file kode yang tersaring
[ ] git diff dibaca ulang; tidak ada console.log debug / kode mati / domain hardcode
[ ] Pengujian §6 dijalankan, hasil dicatat (angka/status code)
[ ] Dokumentasi §8 diperbarui
[ ] Commit message sesuai §4, author sesuai §1
[ ] PR body sesuai §5 dengan Ditambah / Diubah / Dihapus / Dampak terisi
[ ] Base PR = main; tidak menumpuk di atas PR lain (§3.1)
```

## 11. Lingkungan kerja: Emergent (satu-satunya)

Pemilik mengembangkan TDA Pekanbaru **hanya lewat agent Emergent** (vibe coding). Karena itu:

- **Live preview Emergent adalah lingkungan pengembangan tetap.** Tata letak: repo di `/app/repo` (monorepo `backend/`, `frontend/`); backend lokal = build standalone (`/app/secrets/build-next.sh` → `backend/.next/standalone`) yang dijalankan supervisor sebagai `tdapku-next` di port **8001** (`/app/secrets/start-next.sh`); env runtime di `/app/secrets/tdapku.env` (di luar repo). Node 22 diaktifkan dengan `source /app/tools/env.sh` (default sistem Node 20 akan ditolak `engines`).
- Setelah mengubah kode backend: jalankan `bash /app/secrets/build-next.sh` lalu `supervisorctl restart tdapku-next` — **tidak ada hot-reload** (build production). Nginx frontend diuji dengan `nginx -t`/instance uji sementara, bukan supervisor.
- Preview terhubung ke **MariaDB & R2 yang sama dengan production** (§9). `APP_URL` preview = URL preview Emergent; pengujian redirect host memakai header `Host`/`X-Forwarded-Host`.
- Alat Emergent yang wajib dipakai: **testing agent** (bukti uji formal; laporan `/app/test_reports/iteration_N.json`, di luar repo — kutip hasilnya di PR), curl/Playwright (reproduksi bug), screenshot tool (bug UI).
- Rahasia (PAT GitHub, env runtime, password akun uji, kredensial R2/MariaDB) hanya di `/app/secrets/` atau variabel shell — bukan di repo dan bukan di ringkasan chat. File `/app/secrets/CredProdTDA*.txt`, `prod.env`, `tdapku.env` adalah sumber; jangan di-`cat` ke output tanpa penyaringan.
- Artefak yang dibuat testing agent di `/app` (mis. `backend_test.py`, `test_results.json`) dan Nginx uji di `/tmp` **dibersihkan** setelah selesai.
- Dokumentasi untuk kontributor manusia (README lokal, Coolify) tetap dipelihara, tetapi **alur kerja default dokumen ini adalah alur Emergent**.

## 12. Konvensi teknis & jebakan yang sudah terjadi

### Konvensi
- **Bahasa:** commit, PR, dokumentasi, komentar, teks UI, pesan error dalam **Bahasa Indonesia**; identifier kode bahasa Inggris.
- **Akses DB hanya lewat `env.DB`** (`@/lib/runtime-env`), SQL hanya di `backend/db/*.ts` dalam dialek SQLite/D1 yang didukung `sql-translate.ts` (`?`, `INSERT … RETURNING`, `ON CONFLICT … DO UPDATE SET x = excluded.x`, `INSERT OR IGNORE`, `datetime('now')`, `||`). Sintaks baru = tambah aturan translasi minimal + uji MariaDB + contoh sebelum/sesudah di PR.
- **Akses file hanya lewat `env.BUCKET`**; simpan `key` di DB, bukan URL; `R2_PREFIX` kosong.
- **Endpoint mutasi** wajib: sesi (`getVpsSessionIdentity`) + hak akses (`db/access-control.ts`) + same-origin untuk form (`isSameOriginRequest`). Rute spesifik sebelum rute dinamis.
- **Pemisahan domain (mode ketat)** diterapkan Nginx via `APP_HOST`/`PUBLIC_HOST`: backoffice (`/login`, `/admin`, `/account`) hanya di `app.tdapekanbaru.id`; halaman publik hanya di `tdapekanbaru.id`; `/checkin`, `/api/*`, `/_next/*`, `/healthz`, aset di keduanya. Halaman backoffice baru diletakkan di bawah `/admin/*` atau `/account/*`, atau pola-nya ditambahkan ke map `$backoffice_path` **dan** `$public_path` di `frontend/nginx/default.conf.template`. Redirect login memakai `getAppOrigin(request)`; link share/OG memakai `publicOrigin()`.
- **UI:** primitif `components/ui` (Shadcn) yang sudah ada, ikon `lucide-react`, `data-testid` pada elemen interaktif baru. Jangan menambah keluarga ikon/library UI baru tanpa persetujuan pemilik.
- **Waktu UTC** di DB (`UTC_TIMESTAMP()`, `DATETIME(3)`); `Asia/Jakarta` hanya di tampilan.
- Batas upload 20 MB harus sama di `serverActions.bodySizeLimit` (backend) dan `CLIENT_MAX_BODY_SIZE` (Nginx).
- Build harus lulus **tanpa** `DATABASE_URL` dan tanpa `node_modules` lokal yang "kebetulan lengkap".

### Jebakan deploy (jangan diulang)
| Gejala | Penyebab | Yang berlaku sekarang |
|---|---|---|
| `Module not found: '@/lib/storage'` di build Coolify | `.gitignore` pola `storage/` menyaring folder kode | Pola diberi jalur eksplisit (`/backend/storage/`); cek `git check-ignore -v` |
| `Cannot find module '@tailwindcss/postcss'` di `yarn build` Coolify | Coolify menyuntikkan `NODE_ENV=production` → Yarn 1 melewatkan devDependencies | Tahap `deps` Dockerfile memaksa `NODE_ENV=development` + `--production=false`; jangan dihapus |
| Nginx membalas `{"error":"BACKEND_UNAVAILABLE"}` | Backend belum running / alias `backend-tdapku` belum dipasang / beda project | Backend → Custom Docker Options `--network-alias backend-tdapku`; kedua app satu project & environment |
| Traefik `503 no available server` pada satu host | Domain salah ketik (mis. `app.tdapekanbaru` tanpa `.id`) atau tersimpan di resource lain | Domains **frontend** persis `https://tdapekanbaru.id,https://www.tdapekanbaru.id,https://app.tdapekanbaru.id`; backend tanpa domain |
| "DNS mismatch" padahal record benar | Server Coolify terdaftar `localhost` → validasi selalu gagal | Settings → Advanced → matikan *Validate DNS*; verifikasi DNS dari luar via `cloudflare-dns.com/dns-query` |
| Registrar menolak TTL 300 | Paket gratis DNSCloud.ID minimal 900 | Semua record TTL 900, proxy "DNS saja" |
| Login sukses lalu terlempar ke `/login` | Cookie host-only, redirect ke host lain; atau `COOKIE_SECURE=true` di http | `getAppOrigin(request)` mengikuti host; `COOKIE_SECURE=auto`; akses HTTPS |
| Login `?error=origin` | `APP_URL` beda dengan domain yang dibuka & header `X-Forwarded-*` hilang | `APP_URL=https://tdapekanbaru.id`; Nginx meneruskan `X-Forwarded-Proto/Host` |
| Banner GitHub "had recent pushes" tak hilang | Branch merged tidak dihapus / commit cherry-pick beda SHA | Hapus branch remote setelah merge; `git cherry origin/main <branch>` untuk memastikan patch sudah masuk |
