"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Check, Loader2, X, Upload, Sparkles } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useDashboard } from "../_context/dashboard-context";
import { PageHeader } from "../_ui/page-header";
import { DashboardContent } from "../_ui/dashboard-content";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { track, DashboardEvent } from "@/lib/dashboard-events";
import type { MenuItemDraft } from "./menu-item-form";

function getDraftKey(categoryId: string, itemId?: string) {
  return `draft:menu-item:${categoryId}:${itemId || "new"}`;
}

interface MenuItemImagePageProps {
  categoryId: string;
  itemId?: string;
}

export function MenuItemImagePage({ categoryId, itemId }: MenuItemImagePageProps) {
  const { translations } = useDashboard();
  const router = useRouter();
  const t = translations.items;
  const draftKey = getDraftKey(categoryId, itemId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showGenerateLimitDialog, setShowGenerateLimitDialog] = useState(false);

  useEffect(() => {
    const draftJson = sessionStorage.getItem(draftKey);
    if (draftJson) {
      const draft: MenuItemDraft = JSON.parse(draftJson);
      setImageUrl(draft.imageUrl || "");
      setDraftName(draft.name || "");
      setDraftDescription(draft.description || "");
      setHasDraft(true);
    } else {
      router.back();
    }
  }, []);

  // Sync imageUrl to draft on every change
  useEffect(() => {
    if (!hasDraft) return;
    const draftJson = sessionStorage.getItem(draftKey);
    if (draftJson) {
      const draft: MenuItemDraft = JSON.parse(draftJson);
      draft.imageUrl = imageUrl;
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [imageUrl]);

  function isAiImage(url: string) {
    const filename = url.split("/").pop() || "";
    return filename.startsWith("ai-");
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      track(DashboardEvent.ERROR_VALIDATION, { page: "item", field: "image_type" });
      setValidationError("Invalid file type. Allowed: JPEG, PNG, WebP, GIF");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      track(DashboardEvent.ERROR_VALIDATION, { page: "item", field: "image_size" });
      setValidationError("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.url);
      } else {
        const data = await res.json();
        track(DashboardEvent.ERROR_UPLOAD, { page: "item" });
        setValidationError(data.error || "Failed to upload image");
      }
    } catch {
      track(DashboardEvent.ERROR_UPLOAD, { page: "item" });
      setValidationError("Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleGenerateImage(sourceImageUrl?: string) {
    track(sourceImageUrl ? DashboardEvent.CLICKED_STYLIZE_ITEM_IMAGE : DashboardEvent.CLICKED_GENERATE_ITEM_IMAGE);
    setGenerating(true);
    try {
      const res = await fetch("/api/items/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName.trim(),
          description: draftDescription.trim() || undefined,
          sourceImageUrl: sourceImageUrl || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.url);
      } else if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "limit_reached") {
          track(DashboardEvent.SHOWED_GENERATE_LIMIT_MODAL);
          setShowGenerateLimitDialog(true);
        } else {
          toast.error(t.generateImageError);
        }
      } else {
        toast.error(t.generateImageError);
      }
    } catch {
      toast.error(t.generateImageError);
    } finally {
      setGenerating(false);
    }
  }

  if (!hasDraft) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0">
        <PageHeader title={t.image} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
        <DashboardContent innerClassName="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-muted/30">
            {imageUrl ? (
              <div className="p-4">
                <div className="relative inline-block">
                  <div className="relative h-48 w-48 rounded-lg overflow-hidden border border-border">
                    <Image
                      src={imageUrl}
                      alt="Item"
                      fill
                      className="object-cover"
                      sizes="192px"
                    />
                  </div>
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
                    onClick={() => setImageUrl("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-center h-48 cursor-pointer hover:bg-muted/50 transition-colors rounded-xl"
                onClick={() => { track(DashboardEvent.CLICKED_UPLOAD_ITEM_IMAGE); fileInputRef.current?.click(); }}
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Uploading...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t.uploadImage}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageUpload}
            disabled={uploading}
          />
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(to right, hsl(9,100%,58%), #f59e0b)" }}
          >
            <Check className="h-4 w-4" />
            {t.save}
          </button>
          {draftName.trim() && (!imageUrl || !isAiImage(imageUrl)) && (
            <button
              type="button"
              onClick={() => imageUrl ? handleGenerateImage(imageUrl) : handleGenerateImage()}
              disabled={generating || !draftName.trim()}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-border bg-muted/30 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {generating ? t.generatingImage : imageUrl ? t.stylize : t.generateImage}
            </button>
          )}
        </DashboardContent>
      </div>

      <AlertDialog open={!!validationError} onOpenChange={() => setValidationError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{validationError}</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">{validationError}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setValidationError(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showGenerateLimitDialog} onOpenChange={setShowGenerateLimitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.generateLimitReached}</DialogTitle>
            <DialogDescription>{t.generateLimitDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateLimitDialog(false)}>
              {t.cancel}
            </Button>
            <Button onClick={() => { track(DashboardEvent.CLICKED_AI_SUBSCRIBE); setShowGenerateLimitDialog(false); router.push("/dashboard/billing"); }}>
              {t.subscribe}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
