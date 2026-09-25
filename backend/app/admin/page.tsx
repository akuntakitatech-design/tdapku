import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProgramApp from "@/components/program-management/program-app";
import { chatGPTSignInPath, chatGPTSignOutPath } from "@/app/chatgpt-auth";

export const metadata: Metadata = {
  title: "Backoffice Pengurus — TDA Pekanbaru 9.0",
  description: "Sistem internal pengelolaan Program Kerja TDA Pekanbaru 9.0.",
  robots: { index: false, follow: false },
};

// Dinamis: status sesi (wajib ganti password) diperiksa di server setiap permintaan.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (process.env.TDA_RUNTIME !== "chatgpt") {
    const { getVpsSessionIdentity } = await import("@/lib/vps-auth");
    const identity = await getVpsSessionIdentity().catch(() => null);
    // Password sementara belum diganti → Dashboard tidak boleh dibuka.
    if (identity?.mustChangePassword) redirect("/account/password?return_to=%2Fadmin");
  }
  return (
    <ProgramApp
      signInPath={chatGPTSignInPath("/admin")}
      signOutPath={chatGPTSignOutPath("/admin")}
    />
  );
}
