export type UserRole = "ketua_ksb" | "bendahara" | "kadiv" | "viewer";

export type AccessUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  divisionId: number | null;
  divisionName: string | null;
};

export type AppAccess = {
  authenticated: boolean;
  registered: boolean;
  identity: { name: string; email: string } | null;
  user: AccessUser | null;
  /** true hanya untuk Super Admin utama (lihat lib/super-admin.ts). */
  isSuperAdmin: boolean;
  /** Sesi valid, tetapi pengguna wajib mengganti password sementara sebelum memakai aplikasi. */
  passwordChangeRequired: boolean;
  permissions: {
    manageUsers: boolean;
    /** Tambah/edit/reset password/aktif-nonaktif/hapus akun — hanya Super Admin. */
    manageAccounts: boolean;
    manageAllPrograms: boolean;
    manageOwnDivision: boolean;
    writePrograms: boolean;
    manageTreasury: boolean;
    manageMembership: boolean;
  };
};

export const anonymousAccess: AppAccess = {
  authenticated: false,
  registered: false,
  identity: null,
  user: null,
  isSuperAdmin: false,
  passwordChangeRequired: false,
  permissions: {
    manageUsers: false,
    manageAccounts: false,
    manageAllPrograms: false,
    manageOwnDivision: false,
    writePrograms: false,
    manageTreasury: false,
    manageMembership: false,
  },
};
