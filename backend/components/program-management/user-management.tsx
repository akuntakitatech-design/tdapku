"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, LoaderCircle, Pencil, Plus, Power, PowerOff, ShieldCheck, Trash2, TriangleAlert, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";
import type { AppAccess, UserRole } from "@/lib/access-types";
import { getCachedJson, invalidateClientCache } from "@/lib/client-cache";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/searchable-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchEmptyState, SearchField, matchesSearch } from "@/components/search-field";

type Division = { id: number; code: string; name: string; sortOrder: number };
type AccountStatus = "active" | "must_change_password" | "inactive";
type ManagedUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  divisionId: number | null;
  divisionName: string | null;
  isActive: boolean;
  hasLogin: boolean;
  mustChangePassword: boolean;
  neverLoggedIn: boolean;
  isSuperAdmin: boolean;
  status: AccountStatus;
};
type PendingAction = { kind: "reset" | "deactivate" | "delete"; user: ManagedUser };
type TempPasswordNotice = { title: string; user: ManagedUser; temporaryPassword: string };

const roleLabels: Record<UserRole, string> = {
  ketua_ksb: "Ketua/KSB",
  bendahara: "Bendahara",
  kadiv: "Kadiv",
  viewer: "Viewer",
};
const statusBadge: Record<AccountStatus, { label: string; className: string }> = {
  active: { label: "Aktif", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  must_change_password: { label: "Wajib Ganti Password", className: "border-amber-200 bg-amber-50 text-amber-800" },
  inactive: { label: "Nonaktif", className: "border-slate-200 bg-slate-100 text-slate-600" },
};
const emptyForm = { name: "", email: "", role: "viewer" as UserRole, divisionId: "" };

function SuperAdminBadge({ testId }: { testId: string }) {
  return <Badge data-testid={testId} className="border-transparent bg-[#0d2f20] px-2 text-[10px] font-bold tracking-[0.12em] text-white"><ShieldCheck className="size-3" />SUPER ADMIN</Badge>;
}

async function sendJson(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Permintaan belum dapat diproses.");
  return payload;
}

export default function UserManagement({
  access, divisions, signInPath, signOutPath,
}: {
  access: AppAccess;
  divisions: Division[];
  signInPath: string;
  signOutPath: string;
}) {
  const canManage = access.permissions.manageAccounts;
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(access.permissions.manageUsers);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<TempPasswordNotice | null>(null);

  async function loadUsers() {
    if (!access.permissions.manageUsers) return;
    setLoading(true);
    try {
      const payload = await getCachedJson<{ users: ManagedUser[] }>("/api/users", 60_000, true);
      setUsers(payload.users);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Master Pengurus belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!access.permissions.manageUsers) return;
    let cancelled = false;
    getCachedJson<{ users: ManagedUser[] }>("/api/users", 60_000).then((payload) => {
      if (!cancelled) setUsers(payload.users);
    }).catch((reason) => {
      if (!cancelled) toast.error(reason instanceof Error ? reason.message : "Master Pengurus belum dapat dimuat.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [access.permissions.manageUsers]);

  const activeCount = useMemo(() => users.filter((user) => user.isActive).length, [users]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AccountStatus>("all");
  // Pencarian client-side (Master Pengurus kecil & sudah dimuat penuh): nama, email, role/jabatan, divisi.
  const visibleUsers = useMemo(() => users.filter((user) => (statusFilter === "all" || user.status === statusFilter)
    && matchesSearch(search, [user.name, user.email, roleLabels[user.role], user.role, user.divisionName])), [users, search, statusFilter]);

  async function refreshAfterChange() {
    invalidateClientCache("/api/users", "/api/program-management/bootstrap");
    await loadUsers();
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(user: ManagedUser) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, role: user.role, divisionId: user.divisionId ? String(user.divisionId) : "" });
    setFormOpen(true);
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, divisionId: form.divisionId ? Number(form.divisionId) : null };
      const payload = await sendJson(editing ? `/api/users/${editing.id}` : "/api/users", editing ? "PATCH" : "POST", body);
      setFormOpen(false);
      if (editing) {
        toast.success("Data pengurus berhasil diperbarui.");
      } else {
        setNotice({
          title: payload.reactivated
            ? "Akun sebelumnya ditemukan dan berhasil diaktifkan kembali. Password sementara telah direset."
            : "Pengurus berhasil ditambahkan.",
          user: payload.user,
          temporaryPassword: payload.temporaryPassword,
        });
      }
      await refreshAfterChange();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Data pengurus belum dapat disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function runPending() {
    if (!pending) return;
    setWorking(true);
    const { kind, user } = pending;
    try {
      if (kind === "reset") {
        const payload = await sendJson(`/api/users/${user.id}/reset-password`, "POST");
        setNotice({ title: "Password berhasil direset.", user, temporaryPassword: payload.temporaryPassword });
      } else if (kind === "deactivate") {
        await sendJson(`/api/users/${user.id}/status`, "POST", { active: false });
        toast.success(`Akun ${user.name} dinonaktifkan. User tidak dapat login.`);
      } else {
        await sendJson(`/api/users/${user.id}`, "DELETE");
        toast.success(`Akun ${user.name} dihapus. Riwayat dan data historis tetap tersimpan.`);
      }
      setPending(null);
      await refreshAfterChange();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Aksi belum dapat diproses.");
    } finally {
      setWorking(false);
    }
  }

  async function activate(user: ManagedUser) {
    setWorking(true);
    try {
      await sendJson(`/api/users/${user.id}/status`, "POST", { active: true });
      toast.success(`Akun ${user.name} diaktifkan kembali.`);
      await refreshAfterChange();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Akun belum dapat diaktifkan.");
    } finally {
      setWorking(false);
    }
  }

  const identityName = access.user?.name || access.identity?.name || "Pengunjung";
  return <>
    <div className="mb-6"><p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Akun & Akses</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{access.permissions.manageUsers ? "Master Pengurus" : "Profil Hak Akses"}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Kelola siapa yang dapat mengubah program kerja TDA Pekanbaru 9.0 dan batas kewenangannya.</p></div>

    <section className="mb-5 flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><UserRound className="size-6" /></div><div><p className="font-bold">{identityName}</p><p className="text-sm text-muted-foreground">{access.identity?.email || "Belum masuk"}</p><div className="mt-2 flex flex-wrap gap-2">{access.isSuperAdmin && <SuperAdminBadge testId="current-user-super-admin-badge" />}{access.user ? <><Badge>{roleLabels[access.user.role]}</Badge>{access.user.divisionName && <Badge variant="secondary">{access.user.divisionName}</Badge>}</> : <Badge variant="outline">{access.authenticated ? "Belum terdaftar" : "Mode baca"}</Badge>}</div></div></div>
      <div className="flex flex-wrap gap-2">{access.authenticated && <Button asChild variant="outline" data-testid="change-own-password-link"><a href="/account/password?return_to=%2Fadmin"><KeyRound />Ganti Password</a></Button>}<Button asChild variant="outline"><a href={access.authenticated ? signOutPath : signInPath}>{access.authenticated ? "Keluar" : "Masuk"}</a></Button></div>
    </section>

    {!access.authenticated && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900"><strong>Anda sedang menggunakan mode baca.</strong> Masuk dengan akun pengurus agar hak akses dapat dikenali.</section>}
    {access.authenticated && !access.registered && <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900"><strong>Akun sudah masuk, tetapi belum terdaftar.</strong> Minta Super Admin menambahkan email ini ke Master Pengurus.</section>}

    {access.permissions.manageUsers && <section className="overflow-hidden rounded-2xl border bg-white shadow-sm" data-testid="user-directory">
      <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><UsersRound className="size-5 text-primary" /><h2 className="font-bold">Daftar Pengurus</h2></div><p className="mt-1 text-sm text-muted-foreground">{activeCount} akun aktif dari {users.length} akun terdaftar</p></div>{canManage ? <Button type="button" onClick={openCreate} data-testid="add-user-button"><Plus />Tambah Pengurus</Button> : <p className="text-xs text-muted-foreground sm:max-w-56 sm:text-right" data-testid="account-management-readonly-note">Manajemen akun hanya dapat dilakukan oleh Super Admin.</p>}</div>
      {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />Memuat pengurus…</div> : users.length === 0 ? <div className="grid min-h-48 place-items-center p-6 text-center"><div><ShieldCheck className="mx-auto size-8 text-primary" /><p className="mt-3 font-bold">Belum ada pengurus</p></div></div> : <><div className="grid gap-2 border-b p-4 sm:grid-cols-[1fr_220px]" data-testid="user-search-bar"><SearchField value={search} onChange={setSearch} placeholder="Cari pengurus (nama, email, jabatan, divisi)…" testId="user-search-input" /><Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | AccountStatus)}><SelectTrigger className="h-10" data-testid="user-status-filter" aria-label="Filter status akun"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem><SelectItem value="active">Aktif</SelectItem><SelectItem value="must_change_password">Wajib ganti password</SelectItem><SelectItem value="inactive">Nonaktif</SelectItem></SelectContent></Select></div>{visibleUsers.length === 0 ? <SearchEmptyState testId="user-search-empty" onClear={() => { setSearch(""); setStatusFilter("all"); }} /> : <div className="divide-y">{visibleUsers.map((user) => {
        const status = statusBadge[user.status];
        const showActions = canManage && !user.isSuperAdmin;
        return <article key={user.id} data-testid={`user-row-${user.id}`} className={`flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between ${user.isActive ? "" : "bg-muted/40"}`}>
          <div className={`min-w-0 ${user.isActive ? "" : "opacity-70"}`}><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{user.name}</p>{user.isSuperAdmin && <SuperAdminBadge testId={`super-admin-badge-${user.id}`} />}<Badge variant="outline" className={status.className} data-testid={`user-status-${user.id}`}>{status.label}</Badge>{user.neverLoggedIn && user.status !== "inactive" && <Badge variant="outline" data-testid={`user-never-logged-in-${user.id}`}>Belum Login</Badge>}{!user.hasLogin && <Badge variant="outline">Belum punya akun login</Badge>}</div><p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p><div className="mt-2 flex flex-wrap gap-2"><Badge>{roleLabels[user.role]}</Badge>{user.divisionName && <Badge variant="outline">{user.divisionName}</Badge>}</div></div>
          {showActions && <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openEdit(user)} data-testid={`edit-user-${user.id}`}><Pencil />Edit</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setPending({ kind: "reset", user })} data-testid={`reset-password-${user.id}`}><KeyRound />Reset Password</Button>
            {user.isActive ? <Button type="button" variant="outline" size="sm" onClick={() => setPending({ kind: "deactivate", user })} data-testid={`deactivate-user-${user.id}`}><PowerOff />Nonaktifkan</Button> : <Button type="button" variant="outline" size="sm" disabled={working} onClick={() => void activate(user)} data-testid={`activate-user-${user.id}`}><Power />Aktifkan</Button>}
            <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => setPending({ kind: "delete", user })} data-testid={`delete-user-${user.id}`}><Trash2 />Hapus User</Button>
          </div>}
        </article>;
      })}</div>}</>}
    </section>}

    <Dialog open={formOpen} onOpenChange={(open) => { if (!saving) setFormOpen(open); }}><DialogContent><form onSubmit={saveUser} data-testid="user-form"><DialogHeader><DialogTitle>{editing ? "Edit Pengurus" : "Tambah Pengurus"}</DialogTitle><DialogDescription>Email harus sama dengan email akun login pengurus yang akan digunakan.</DialogDescription></DialogHeader><div className="grid gap-4 py-5"><div className="grid gap-2"><Label htmlFor="user-name">Nama lengkap</Label><Input id="user-name" data-testid="user-form-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={120} /></div><div className="grid gap-2"><Label htmlFor="user-email">Email akun pengurus</Label><Input id="user-email" data-testid="user-form-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required maxLength={180} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Role</Label><Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value as UserRole, divisionId: value === "kadiv" ? form.divisionId : "" })}><SelectTrigger className="w-full" data-testid="user-form-role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ketua_ksb">Ketua/KSB</SelectItem><SelectItem value="bendahara">Bendahara</SelectItem><SelectItem value="kadiv">Kadiv</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent></Select></div><div className="grid gap-2"><Label>Divisi</Label><SearchableSelect testId="user-form-division" value={String(form.divisionId)} onChange={(value) => setForm({ ...form, divisionId: value })} disabled={form.role !== "kadiv"} placeholder={form.role === "kadiv" ? "Pilih divisi" : "Tidak diperlukan"} searchPlaceholder="Cari divisi..." options={divisions.map((division) => ({ value: String(division.id), label: division.name }))} /></div></div>{!editing && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900" data-testid="user-form-temp-password-info">Password tidak perlu diisi. Akun baru otomatis memakai password sementara dan user wajib membuat password baru saat login pertama.</div>}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Batal</Button><Button type="submit" data-testid="user-form-submit" disabled={saving || !form.name.trim() || !form.email.trim() || (form.role === "kadiv" && !form.divisionId)}>{saving && <LoaderCircle className="animate-spin" />}Simpan</Button></DialogFooter></form></DialogContent></Dialog>

    <AlertDialog open={Boolean(pending)} onOpenChange={(open) => { if (!open && !working) setPending(null); }}>
      <AlertDialogContent data-testid={pending ? `${pending.kind}-dialog` : undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle>{pending?.kind === "reset" ? "Reset password akun ini?" : pending?.kind === "deactivate" ? "Nonaktifkan akun pengurus?" : "Hapus akun pengurus?"}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <div className="rounded-xl border bg-muted/40 p-3 text-foreground"><p><span className="text-muted-foreground">Nama:</span> <strong data-testid="dialog-user-name">{pending?.user.name}</strong></p><p><span className="text-muted-foreground">Email:</span> <strong data-testid="dialog-user-email">{pending?.user.email}</strong></p></div>
              {pending?.kind === "reset" && <p>Password akun akan dikembalikan ke password sementara dan user wajib membuat password baru saat login berikutnya.</p>}
              {pending?.kind === "deactivate" && <p>User tidak dapat login dan sesi yang sedang berjalan diakhiri. Profil, histori, dan data bisnis tetap tersimpan. Akun dapat diaktifkan kembali kapan saja.</p>}
              {pending?.kind === "delete" && <><p>User tidak akan dapat login kembali setelah akun dihapus.</p><div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900" data-testid="delete-history-warning"><TriangleAlert className="mt-0.5 size-4 shrink-0" /><p>Riwayat aktivitas, program kerja, transaksi, event, LPJ, approval, kehadiran, dan seluruh data historis user tidak boleh ikut terhapus.</p></div></>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={working} data-testid="dialog-cancel">Batal</AlertDialogCancel>
          <AlertDialogAction variant={pending?.kind === "reset" ? "default" : "destructive"} onClick={(event) => { event.preventDefault(); void runPending(); }} disabled={working} data-testid="dialog-confirm">{working && <LoaderCircle className="animate-spin" />}{pending?.kind === "reset" ? "Reset Password" : pending?.kind === "deactivate" ? "Nonaktifkan" : "Hapus User"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={Boolean(notice)} onOpenChange={(open) => { if (!open) setNotice(null); }}>
      <DialogContent data-testid="temp-password-dialog">
        <DialogHeader><DialogTitle data-testid="temp-password-dialog-title">{notice?.title}</DialogTitle><DialogDescription>{notice?.user.name} · {notice?.user.email}</DialogDescription></DialogHeader>
        <div className="space-y-3 py-2 text-sm leading-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Password sementara</p><p className="mt-1 select-all font-mono text-lg font-bold text-emerald-950" data-testid="temp-password-value">{notice?.temporaryPassword}</p></div>
          <p className="text-muted-foreground">User wajib mengganti password setelah login.</p>
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => { if (notice) void navigator.clipboard?.writeText(notice.temporaryPassword).then(() => toast.success("Password sementara disalin.")).catch(() => undefined); }} data-testid="copy-temp-password">Salin</Button><Button type="button" onClick={() => setNotice(null)} data-testid="temp-password-dialog-close">Selesai</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
