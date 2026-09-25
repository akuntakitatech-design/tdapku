import { accessErrorResponse, requireSuperAdmin } from "@/db/access-control";
import { AccountError, deleteAccount, getAccount, updateAccountProfile } from "@/db/account-management";
import { accountErrorResponse, parseProfileInput, parseUserId, rejectCrossOrigin, validateProfileInput } from "@/app/api/users/shared";
import { isSuperAdmin } from "@/lib/super-admin";

// Edit profil pengurus — hanya Super Admin; akun Super Admin sendiri tidak dapat diubah.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    await requireSuperAdmin();
    const id = parseUserId((await context.params).id);
    if (!id) return Response.json({ error: "ID pengurus tidak valid." }, { status: 400 });
    const target = await getAccount(id);
    if (!target) return Response.json({ error: "Pengurus tidak ditemukan." }, { status: 404 });
    if (isSuperAdmin(target)) return Response.json({ error: "Akun Super Admin tidak dapat diubah." }, { status: 403 });
    const input = parseProfileInput(await request.json().catch(() => ({})));
    const validationError = await validateProfileInput(input);
    if (validationError) return Response.json({ error: validationError }, { status: 400 });
    return Response.json({ user: await updateAccountProfile(id, input) });
  } catch (reason) {
    if (reason instanceof AccountError) return accountErrorResponse(reason);
    return accessErrorResponse(reason, "Perubahan pengurus belum dapat disimpan.");
  }
}

// Hapus user (soft delete profil + hapus kredensial login). Histori & data bisnis tidak disentuh.
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    await requireSuperAdmin();
    const id = parseUserId((await context.params).id);
    if (!id) return Response.json({ error: "ID pengurus tidak valid." }, { status: 400 });
    const target = await getAccount(id);
    if (!target) return Response.json({ error: "Pengurus tidak ditemukan." }, { status: 404 });
    if (isSuperAdmin(target)) return Response.json({ error: "Akun Super Admin tidak dapat dihapus." }, { status: 403 });
    await deleteAccount(id);
    return Response.json({ ok: true });
  } catch (reason) {
    if (reason instanceof AccountError) return accountErrorResponse(reason);
    return accessErrorResponse(reason, "Akun pengurus belum dapat dihapus.");
  }
}
