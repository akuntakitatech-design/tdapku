import { accessErrorResponse, requireSuperAdmin } from "@/db/access-control";
import { AccountError, getAccount, resetAccountPassword } from "@/db/account-management";
import { accountErrorResponse, parseUserId, rejectCrossOrigin } from "@/app/api/users/shared";
import { VpsAuthError, defaultTempPassword, hashDefaultTempPassword } from "@/lib/vps-auth";
import { isSuperAdmin } from "@/lib/super-admin";

// Reset password ke password sementara — hanya Super Admin, tidak berlaku untuk akun Super Admin.
// Tidak ada endpoint untuk membaca password lama (hash tidak pernah dikirim).
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    await requireSuperAdmin();
    const id = parseUserId((await context.params).id);
    if (!id) return Response.json({ error: "ID pengurus tidak valid." }, { status: 400 });
    const target = await getAccount(id);
    if (!target) return Response.json({ error: "Pengurus tidak ditemukan." }, { status: 404 });
    if (isSuperAdmin(target)) return Response.json({ error: "Password akun Super Admin tidak dapat direset." }, { status: 403 });
    const user = await resetAccountPassword(id, await hashDefaultTempPassword());
    return Response.json({ user, temporaryPassword: defaultTempPassword() });
  } catch (reason) {
    if (reason instanceof AccountError || reason instanceof VpsAuthError) return accountErrorResponse(reason);
    return accessErrorResponse(reason, "Password belum dapat direset.");
  }
}
