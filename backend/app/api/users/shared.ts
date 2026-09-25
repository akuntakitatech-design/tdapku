import { divisionExists } from "@/db/program-management";
import { ACCOUNT_ROLES, AccountError, type AccountProfileInput } from "@/db/account-management";
import { VpsAuthError, isSameOriginRequest } from "@/lib/vps-auth";

export function parseUserId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function parseProfileInput(body: Record<string, unknown>): AccountProfileInput {
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "viewer") as AccountProfileInput["role"];
  const rawDivisionId = Number(body.divisionId);
  const divisionId = role === "kadiv" && Number.isInteger(rawDivisionId) && rawDivisionId > 0 ? rawDivisionId : null;
  return { name, email, role, divisionId };
}

export async function validateProfileInput(input: AccountProfileInput) {
  if (!input.name || !input.email || !/^\S+@\S+\.\S+$/.test(input.email)) return "Nama dan email aktif wajib diisi.";
  if (input.name.length > 120 || input.email.length > 180) return "Nama atau email terlalu panjang.";
  if (!ACCOUNT_ROLES.includes(input.role)) return "Role pengguna tidak valid.";
  if (input.role === "kadiv" && !input.divisionId) return "Divisi wajib dipilih untuk role Kadiv.";
  if (input.divisionId && !(await divisionExists(input.divisionId))) return "Divisi tidak ditemukan atau sudah tidak aktif.";
  return null;
}

/** Mutasi akun hanya dari halaman aplikasi sendiri (perlindungan CSRF). */
export function rejectCrossOrigin(request: Request) {
  if (isSameOriginRequest(request)) return null;
  return Response.json({ error: "Permintaan ditolak karena asal permintaan tidak valid." }, { status: 403 });
}

export function accountErrorResponse(reason: AccountError | VpsAuthError) {
  if (reason instanceof VpsAuthError && reason.code === "temp_password_unconfigured") {
    return Response.json({ error: "Password sementara (DEFAULT_TEMP_PASSWORD) belum dikonfigurasi di server." }, { status: 500 });
  }
  return Response.json({ error: reason.message }, { status: reason.status });
}
