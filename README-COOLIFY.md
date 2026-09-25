# Deploy TDA Pekanbaru 9.0 ke Coolify

Panduan operasional untuk menjalankan monorepo ini di Coolify sebagai **dua aplikasi** dari **satu repository** (`akuntakitatech-design/tdapku`, branch `main`) plus **satu database MariaDB**.

```text
Internet ──▶ Traefik (Coolify, HTTPS tdapekanbaru.id)
                │
                ▼
   [frontend]  Nginx 1.27  :80   ── base dir /frontend  (punya domain publik)
                │  proxy semua path ke http://backend-tdapku:3000
                ▼
   [backend]   Next.js 16  :3000 ── base dir /backend   (TANPA domain publik)
                ├── MariaDB (service Coolify, jaringan internal)
                └── Cloudflare R2 bucket media-tdapku (S3 API)
```

---

## 0. Prasyarat

- Coolify v4 dengan akses ke GitHub (GitHub App atau Deploy Key) untuk repo `akuntakitatech-design/tdapku`.
- Cloudflare R2: bucket `media-tdapku`, **Account ID**, **Access Key ID**, **Secret Access Key** (S3 API token dengan izin Object Read & Write).
- Nilai `AUTH_SESSION_SECRET` dan `AUTH_PASSWORD_PEPPER` **yang sama** dengan lingkungan lama (agar password 13 akun lama tetap valid). Jika membuat lingkungan baru dari nol: `openssl rand -hex 32` untuk masing-masing.
- Data lama sudah dimigrasikan ke MariaDB (39 tabel) dan R2 (objek dengan key identik). Skema akan diverifikasi ulang otomatis saat backend start.

---

## 1. Database MariaDB

1. **Project → + New Resource → Databases → MariaDB** (11.x).
2. Nama database: `default` (atau sesuaikan `DATABASE_URL`). Catat **user**, **password**, dan **nama service/host internal** (contoh `rjpbhbvsg9thse4yujse6lji`).
3. Pastikan MariaDB berada di **jaringan/project yang sama** dengan aplikasi backend agar host internal bisa di-resolve.
4. (Opsional) Aktifkan *Public port* hanya bila perlu akses dari luar (mis. phpMyAdmin/migrasi). Batasi dengan firewall/IP, jangan biarkan terbuka.
5. Format URL yang dipakai aplikasi: `mysql://USER:PASSWORD@HOST_INTERNAL:3306/default`.

> Skema tidak perlu dibuat manual. Saat start, backend menjalankan `deploy/mariadb/schema.sql` secara idempoten (`CREATE ... IF NOT EXISTS`) dan mencatat checksum di tabel `schema_migrations`.

---

## 2. Aplikasi `backend` (Next.js)

**+ New Resource → Application → Public/Private Repository (GitHub)**

| Pengaturan | Nilai |
|---|---|
| Repository | `akuntakitatech-design/tdapku` |
| Branch | `main` |
| Build Pack | **Dockerfile** |
| Base Directory | `/backend` |
| Dockerfile Location | `/backend/Dockerfile` (relatif base dir: `Dockerfile`) |
| Port Exposes | `3000` |
| Domain | **kosongkan** (tidak dipublikasikan) |
| Health Check | Path `/api/health`, port `3000` (Dockerfile sudah punya `HEALTHCHECK`) |

### Network alias (WAJIB)
Frontend menghubungi backend lewat nama `backend-tdapku`. Pilih salah satu:

- **Cara A (disarankan):** Coolify → aplikasi backend → *Advanced* → **Custom Docker Options**:
  ```
  --network-alias backend-tdapku
  ```
  Nginx frontend memakai default `BACKEND_URL=http://backend-tdapku:3000`.
- **Cara B:** Tanpa alias, isi `BACKEND_URL` di frontend dengan nama container backend yang diberikan Coolify (terlihat di *Deployments*/`docker ps`, mis. `http://xxxxxxxx-yyyy:3000`). Nama ini bisa berubah bila aplikasi dibuat ulang, jadi Cara A lebih stabil.

### Environment variables backend
Salin dari `backend/.env.example`. Minimal yang **wajib**:

```env
NODE_ENV=production
PORT=3000
APP_URL=https://tdapekanbaru.id
COOKIE_SECURE=auto
TZ=Asia/Jakarta

DATABASE_URL=mysql://mariadb:PASSWORD@HOST_INTERNAL_MARIADB:3306/default

AUTH_SESSION_SECRET=<hex 64 karakter, sama dengan lingkungan lama>
AUTH_PASSWORD_PEPPER=<hex 64 karakter, sama dengan lingkungan lama>
AUTH_SESSION_TTL_HOURS=12
# Password sementara untuk Tambah User & Reset Password oleh Super Admin (min. 12 karakter, disimpan sebagai hash)
DEFAULT_TEMP_PASSWORD=<password sementara>

BOOTSTRAP_ADMIN_EMAIL=agustrnt@gmail.com
# BOOTSTRAP_ADMIN_PASSWORD hanya perlu bila tabel akun login masih kosong

STORAGE_DRIVER=s3
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<r2 access key>
R2_SECRET_ACCESS_KEY=<r2 secret>
R2_BUCKET=media-tdapku
R2_PREFIX=
```

Tandai nilai rahasia sebagai **Secret**/*Is Build Variable = off* (hanya runtime). Build **tidak** membutuhkan `DATABASE_URL`.

---

## 3. Aplikasi `frontend` (Nginx)

**+ New Resource → Application → repo yang sama**

| Pengaturan | Nilai |
|---|---|
| Repository / Branch | `akuntakitatech-design/tdapku` / `main` |
| Build Pack | **Dockerfile** |
| Base Directory | `/frontend` |
| Port Exposes | `80` |
| Domain | `https://tdapekanbaru.id,https://www.tdapekanbaru.id,https://app.tdapekanbaru.id` (dipisah koma; Coolify/Traefik menerbitkan sertifikat Let's Encrypt untuk semuanya) |
| Health Check | Path `/healthz`, port `80` |

### Environment variables frontend (semua opsional)
```env
BACKEND_URL=http://backend-tdapku:3000
NGINX_PORT=80
CLIENT_MAX_BODY_SIZE=20m
APP_HOST=app.tdapekanbaru.id
PUBLIC_HOST=tdapekanbaru.id
```
`CLIENT_MAX_BODY_SIZE` harus ≥ `serverActions.bodySizeLimit` di backend (20 MB).

### Pemisahan domain (mode ketat) — `APP_HOST` / `PUBLIC_HOST`
Diterapkan oleh Nginx (`frontend/nginx/10-backoffice-host.envsh` + template). Tidak butuh resource Coolify tambahan; backend tetap satu.

| Dibuka di | Path | Hasil |
|---|---|---|
| `tdapekanbaru.id` / `www` | `/login`, `/admin`, `/account/*` | 302 → `https://app.tdapekanbaru.id/<path>` |
| `app.tdapekanbaru.id` | `/` | 302 → `https://app.tdapekanbaru.id/admin` |
| `app.tdapekanbaru.id` | halaman publik (`/program`, `/daftar/*`, `/kalender`, `/tentang`, `/member`, `/form/*`, `/feedback/*`, …) | 302 → `https://tdapekanbaru.id/<path>` |
| keduanya | `/checkin`, `/api/*`, `/_next/*`, `/healthz`, aset statis | dilayani langsung |

- Cookie sesi bersifat host-only, sehingga login **harus** terjadi di `app.`; backend (`lib/vps-auth.ts → getAppOrigin`) mengarahkan redirect login/logout ke host yang sedang dibuka selama host itu `APP_URL` atau subdomain-nya (host asing jatuh ke `APP_URL`).
- `APP_URL` backend tetap `https://tdapekanbaru.id` (dipakai untuk link share/OG dan fallback).
- Kosongkan `APP_HOST` untuk menonaktifkan seluruh pengalihan (semua path di semua domain).
- DNS: tambah A `app` → `103.93.129.172` (TTL 900, DNS saja) dan daftarkan `https://app.tdapekanbaru.id` di Domains frontend.

> Frontend dan backend **harus berada di project/environment Coolify yang sama** supaya berbagi jaringan Docker. Bila tidak, aktifkan *Connect to Predefined Network* pada keduanya.

---

## 4. Urutan deploy pertama kali

1. Deploy **MariaDB** → tunggu status *running*.
2. Deploy **backend** → cek log: harus muncul
   `[schema] ...` lalu `[startup] TDA Pekanbaru siap: MariaDB terverifikasi, storage terkonfigurasi.`
3. Deploy **frontend** → buka `https://tdapekanbaru.id/healthz` (harus `ok`) lalu `https://tdapekanbaru.id/api/health` (harus `{"ok":true,...}`).
4. Login di `https://app.tdapekanbaru.id/login` dengan salah satu akun lama (membuka `tdapekanbaru.id/login` otomatis dialihkan ke sana).
5. Uji cepat: buka `/admin`, `/kalender`, `/program/<code>`, satu gambar publikasi (memastikan R2 terbaca), dan satu upload kecil.
6. Pastikan DNS `tdapekanbaru.id` sudah mengarah ke server Coolify (lihat bagian **4a. DNS**).

### 4a. DNS (registrar DNSCloud.ID, nameserver `oka.ns.dnscloud.id` / `putra.ns.dnscloud.id`)

| Nama | Tipe | TTL | Nilai | Proxy |
|---|---|---|---|---|
| `@` | A | `900` | `103.93.129.172` (IP server Coolify) | **DNS saja** |
| `www` | A | `900` | `103.93.129.172` | **DNS saja** |
| `app` | A | `900` | `103.93.129.172` | **DNS saja** |

- Paket gratis DNSCloud.ID mensyaratkan TTL minimal **900** detik; TTL tidak mempengaruhi aplikasi, hanya lama cache resolver (±15 menit propagasi).
- Proxy **harus** "DNS saja" (bukan Proxied) supaya Traefik di Coolify dapat menyelesaikan verifikasi HTTP-01 Let's Encrypt langsung ke IP server.
- Record `staging.app` (VPS lama, `119.28.114.94`) boleh dibiarkan sebagai cadangan sampai Coolify terbukti stabil, lalu dihapus.
- Jika Coolify menampilkan **"DNS mismatch"** padahal record sudah benar: Settings → Advanced → matikan *Validate DNS*, atau tunggu propagasi lalu Save ulang. Cek dari luar: `curl -s "https://cloudflare-dns.com/dns-query?name=tdapekanbaru.id&type=A" -H "accept: application/dns-json"`.

---

## 5. Deploy berikutnya (CI/CD)

- Aktifkan **Auto Deploy** pada kedua aplikasi (webhook GitHub). Setiap push ke `main` membangun ulang kedua aplikasi (Coolify tidak memfilter per base dir). Ini aman dan cepat karena image Nginx sangat kecil; opsional aktifkan *Watch Paths* (`backend/**` dan `frontend/**`) agar hanya aplikasi terkait yang dibangun.
- Perubahan skema: edit `backend/deploy/mariadb/schema.sql` dengan statement idempoten → push → backend restart → skema tersinkron otomatis.
- Rollback: Coolify → aplikasi → *Deployments* → pilih deploy sebelumnya → *Redeploy*. Skema bersifat aditif, jadi rollback kode aman.

---

## 6. Manajemen akun login

Jalankan di **Terminal container backend** (Coolify → backend → *Terminal*):

```bash
# Buat atau reset password satu akun
node scripts/vps-auth-account.mjs --email nama@domain.id --name "Nama Lengkap" --password 'PasswordMin12Karakter'

# Provisioning massal dari CSV (email,name,password)
node scripts/vps-auth-bulk-provision.mjs --file /tmp/akun.csv
```
Akun `users` (role/divisi) tetap dikelola dari UI Master Pengurus (`/admin`) oleh `ketua_ksb`.

---

## 7. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Halaman menampilkan `{"error":"BACKEND_UNAVAILABLE"}` | Nginx tidak bisa resolve/menghubungi `BACKEND_URL` | Pastikan alias `backend-tdapku` terpasang (Custom Docker Options) atau isi `BACKEND_URL` dengan nama container backend; pastikan kedua app satu jaringan. Cek `docker exec <frontend> wget -qO- http://backend-tdapku:3000/api/health`. |
| Backend restart terus, log `DATABASE_URL belum dikonfigurasi` / `ECONNREFUSED` | Env salah / host MariaDB tidak satu jaringan | Gunakan host internal MariaDB (bukan IP publik) dan port 3306. |
| Log `Tidak dapat memperoleh lock skema database` | Instance lain sedang menerapkan skema >120 dtk | Tunggu lalu redeploy. |
| Login selalu gagal untuk akun lama | `AUTH_PASSWORD_PEPPER`/`AUTH_SESSION_SECRET` berbeda dari lingkungan lama | Samakan nilainya. |
| Membuka `/admin` di domain utama selalu berpindah ke `app.` / halaman publik di `app.` berpindah ke domain utama | Perilaku mode ketat (`APP_HOST` terisi) | Normal. Kosongkan `APP_HOST` bila tidak ingin pemisahan. |
| Login redirect dengan `?error=origin` | `APP_URL` tidak sama dengan domain yang dibuka, atau header `X-Forwarded-Proto` hilang | Set `APP_URL=https://tdapekanbaru.id`; pastikan Traefik→Nginx→Next meneruskan header (sudah di template Nginx). |
| Cookie tidak tersimpan (login berhasil lalu terlempar ke /login) | `COOKIE_SECURE=true` tapi akses via http | Pakai `COOKIE_SECURE=auto` dan akses via HTTPS. |
| Gambar/QRIS/flyer 404 atau 500 | Kredensial R2 salah / `R2_PREFIX` tidak kosong | Cek `R2_*`; `R2_PREFIX` harus kosong agar key sama dengan data lama. |
| Upload >20 MB ditolak (413) | Batas Nginx/Next | Naikkan `CLIENT_MAX_BODY_SIZE` dan `bodySizeLimit` bersamaan. |

Log: Coolify → aplikasi → *Logs*. Health: `/healthz` (frontend), `/api/health` (backend, via domain publik).

---

## 8. Backup

- **MariaDB**: gunakan fitur *Backups* Coolify pada resource database (jadwal harian, simpan ke S3/R2 terpisah), atau `mariadb-dump --single-transaction default > backup.sql` dari container DB.
- **R2**: aktifkan *Object Lifecycle*/versioning di Cloudflare atau sinkronkan berkala dengan `rclone sync r2:media-tdapku ./backup-media`.
- Simpan `AUTH_SESSION_SECRET` dan `AUTH_PASSWORD_PEPPER` di password manager; tanpa keduanya, semua password akun harus di-reset.
