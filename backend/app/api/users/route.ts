import { accessErrorResponse, requireSuperAdmin, requireUserDirectoryViewer } from "@/db/access-control";
import { AccountError, createAccount, listAccounts } from "@/db/account-management";
import { accountErrorResponse, parseProfileInput, rejectCrossOrigin, validateProfileInput } from "@/app/api/users/shared";
import { VpsAuthError, defaultTempPassword, hashDefaultTempPassword } from "@/lib/vps-auth";

// Daftar pengurus: Ketua/KSB & Super Admin boleh melihat; aksi manajemen akun hanya Super Admin.
export async function GET() {
  try {
    await requireUserDirectoryViewer();
    return Response.json({ users: await listAccounts() });
  } catch (reason) {
    return accessErrorResponse(reason, "Master Pengurus belum dapat dimuat.");
  }
}

// Tambah pengurus: password TIDAK diminta — otomatis password sementara + wajib ganti saat login pertama.
export async function POST(request: Request) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    await requireSuperAdmin();
    const input = parseProfileInput(await request.json().catch(() => ({})));
    const validationError = await validateProfileInput(input);
    if (validationError) return Response.json({ error: validationError }, { status: 400 });
    const user = await createAccount(input, await hashDefaultTempPassword());
    return Response.json({ user, temporaryPassword: defaultTempPassword() }, { status: 201 });
  } catch (reason) {
    if (reason instanceof AccountError || reason instanceof VpsAuthError) return accountErrorResponse(reason);
    return accessErrorResponse(reason, "Pengurus belum dapat ditambahkan.");
  }
}
