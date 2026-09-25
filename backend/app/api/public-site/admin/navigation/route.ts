import { accessErrorResponse, requireKetua } from "@/db/access-control";
import {
  createPublicNavigationItem,
  deletePublicNavigationItem,
  getPublicNavigationItem,
  listPublicNavigation,
  setPublicNavigationItemActive,
  updatePublicNavigationItem,
} from "@/db/public-site";
import { validateNavigationInput } from "@/lib/public-navigation";

/*
 * ADMIN Navigasi Website Publik (Website 02A). Otorisasi = CMS existing (requireKetua) untuk SEMUA method.
 * Admin melihat semua item (aktif & nonaktif). Publik TIDAK memakai route ini (lihat /api/public-site: aktif saja).
 * Setiap aksi hanya menyentuh satu baris public_navigation_items.
 */
export const dynamic = "force-dynamic";

function parseId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

const invalid = (errors: Record<string, string>) =>
  Response.json({ error: Object.values(errors)[0] || "Data menu tidak valid.", fieldErrors: errors }, { status: 400 });

export async function GET() {
  try {
    await requireKetua();
    return Response.json({ items: await listPublicNavigation() });
  } catch (reason) {
    return accessErrorResponse(reason, "Menu navigasi belum dapat dimuat.");
  }
}

/** Tambah menu. */
export async function POST(request: Request) {
  try {
    const user = await requireKetua();
    const parsed = validateNavigationInput(await readJson(request));
    if (!parsed.ok) return invalid(parsed.errors);
    const id = await createPublicNavigationItem(parsed.value, user.id);
    return Response.json({ item: await getPublicNavigationItem(id) }, { status: 201 });
  } catch (reason) {
    return accessErrorResponse(reason, "Menu belum dapat ditambahkan.");
  }
}

/** Edit menu (label, URL, urutan, lokasi, status). */
export async function PUT(request: Request) {
  try {
    const user = await requireKetua();
    const input = await readJson(request);
    const id = parseId(input.id);
    if (!id) return Response.json({ error: "ID menu tidak valid." }, { status: 400 });
    const parsed = validateNavigationInput(input);
    if (!parsed.ok) return invalid(parsed.errors);
    if (!(await getPublicNavigationItem(id))) return Response.json({ error: "Menu tidak ditemukan." }, { status: 404 });
    await updatePublicNavigationItem(id, parsed.value, user.id);
    return Response.json({ item: await getPublicNavigationItem(id) });
  } catch (reason) {
    return accessErrorResponse(reason, "Menu belum dapat disimpan.");
  }
}

/** Aktifkan / nonaktifkan menu. */
export async function PATCH(request: Request) {
  try {
    const user = await requireKetua();
    const input = await readJson(request);
    const id = parseId(input.id);
    if (!id) return Response.json({ error: "ID menu tidak valid." }, { status: 400 });
    if (typeof input.isActive !== "boolean") return Response.json({ error: "Status aktif tidak valid." }, { status: 400 });
    if (!(await getPublicNavigationItem(id))) return Response.json({ error: "Menu tidak ditemukan." }, { status: 404 });
    await setPublicNavigationItemActive(id, input.isActive, user.id);
    return Response.json({ item: await getPublicNavigationItem(id) });
  } catch (reason) {
    return accessErrorResponse(reason, "Status menu belum dapat diperbarui.");
  }
}

/** Hapus menu (hanya item navigasi; halaman tujuan tidak tersentuh). */
export async function DELETE(request: Request) {
  try {
    await requireKetua();
    const id = parseId((await readJson(request)).id);
    if (!id) return Response.json({ error: "ID menu tidak valid." }, { status: 400 });
    if (!(await getPublicNavigationItem(id))) return Response.json({ error: "Menu tidak ditemukan." }, { status: 404 });
    // Jangan ikut menghapus sub-menu (FK ON DELETE CASCADE existing): tolak bila item punya anak.
    if ((await listPublicNavigation()).some((item) => Number(item.parentId) === id)) {
      return Response.json({ error: "Menu ini memiliki sub-menu. Hapus sub-menu terlebih dahulu." }, { status: 409 });
    }
    await deletePublicNavigationItem(id);
    return Response.json({ success: true });
  } catch (reason) {
    return accessErrorResponse(reason, "Menu belum dapat dihapus.");
  }
}
