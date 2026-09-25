import { accessErrorResponse, requireSuperAdmin } from "@/db/access-control";
import { AccountError, getAccount, setAccountActive } from "@/db/account-management";
import { accountErrorResponse, parseUserId, rejectCrossOrigin } from "@/app/api/users/shared";
import { isSuperAdmin } from "@/lib/super-admin";

// Aktifkan / nonaktifkan akun — hanya Super Admin; akun Super Admin tidak dapat dinonaktifkan.
// Body: { "active": true | false }
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    await requireSuperAdmin();
    const id = parseUserId((await context.params).id);
    if (!id) return Response.json({ error: "ID pengurus tidak valid." }, { status: 400 });
    const body = (await request.json().catch(() => ({}))) as { active?: unknown };
    if (typeof body.active !== "boolean") return Response.json({ error: "Status akun tidak valid." }, { status: 400 });
    const target = await getAccount(id);
    if (!target) return Response.json({ error: "Pengurus tidak ditemukan." }, { status: 404 });
    if (isSuperAdmin(target)) return Response.json({ error: "Status akun Super Admin tidak dapat diubah." }, { status: 403 });
    return Response.json({ user: await setAccountActive(id, body.active) });
  } catch (reason) {
    if (reason instanceof AccountError) return accountErrorResponse(reason);
    return accessErrorResponse(reason, "Status akun belum dapat diubah.");
  }
}
