"use client";

import { useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Copy, Download, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { publicOrigin } from "@/lib/public-origin";

/**
 * Akses cepat form publik EXISTING /form/member (Profil Usaha & Testimoni Member).
 * Hanya membuka / menyalin / menampilkan QR link — tidak membuat form baru, tidak menyentuh API/data submission.
 */
const FORM_PATH = "/form/member";

function formUrl() {
  return `${publicOrigin()}${FORM_PATH}`;
}

export function MemberFormShare() {
  const [qrOpen, setQrOpen] = useState(false);
  const [qrImage, setQrImage] = useState("");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(formUrl());
      toast.success("Link form Profil Usaha & Testimoni disalin.");
    } catch {
      toast.error("Link belum dapat disalin. Salin manual: " + formUrl());
    }
  }

  async function showQr() {
    setQrOpen(true);
    if (!qrImage) {
      try {
        setQrImage(await QRCode.toDataURL(formUrl(), { width: 720, margin: 2, color: { dark: "#102d20", light: "#ffffff" } }));
      } catch {
        toast.error("QR Code belum dapat dibuat.");
      }
    }
  }

  return (
    <div className="mt-5 rounded-xl border bg-muted/30 p-4" data-testid="member-form-share">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Form publik untuk member</p>
          <p className="mt-0.5 break-all text-xs text-muted-foreground" data-testid="member-form-share-url">{formUrl()}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:shrink-0">
          <Button asChild size="sm" className="min-h-11 sm:min-h-10">
            <a href={FORM_PATH} target="_blank" rel="noopener noreferrer" data-testid="member-form-open-button">
              <ExternalLink className="size-4" />Buka Form Publik
            </a>
          </Button>
          <Button type="button" size="sm" variant="outline" className="min-h-11 sm:min-h-10" onClick={() => void copyLink()} data-testid="member-form-copy-button">
            <Copy className="size-4" />Salin Link
          </Button>
          <Button type="button" size="sm" variant="outline" className="min-h-11 sm:min-h-10" onClick={() => void showQr()} data-testid="member-form-qr-button">
            <QrCode className="size-4" />QR Code Form
          </Button>
        </div>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-md" data-testid="member-form-qr-dialog">
          <DialogHeader>
            <DialogTitle>QR Form Profil Usaha & Testimoni</DialogTitle>
            <DialogDescription>Tampilkan QR ini di layar atau unduh untuk dibagikan ke member.</DialogDescription>
          </DialogHeader>
          {qrImage ? (
            <div className="text-center">
              <Image unoptimized src={qrImage} width={720} height={720} alt="QR form Profil Usaha & Testimoni" data-testid="member-form-qr-image"
                className="mx-auto h-auto w-full max-w-72 rounded-2xl border p-3" />
              <p className="mt-3 break-all text-xs text-muted-foreground">{formUrl()}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => void copyLink()} data-testid="member-form-qr-copy-button"><Copy />Salin Link</Button>
                <Button asChild>
                  <a href={qrImage} download="qr-form-profil-usaha-testimoni.png" data-testid="member-form-qr-download"><Download className="size-4" />Unduh QR</a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="mx-auto aspect-square w-full max-w-72 animate-pulse rounded-2xl bg-muted" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
