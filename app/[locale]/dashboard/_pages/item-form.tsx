"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { FormFieldUnderline } from "../_ui/form-field-underline";
import Image from "next/image";
import { Loader2, X, Upload, Sparkles, ChevronDown, AlignLeft, ImageIcon, ShieldAlert, LayoutGrid, Check, Languages, Trash2, Type, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";
import { useDashboard } from "../_context/dashboard-context";
import { useRouter } from "@/i18n/routing";
import { track, DashboardEvent } from "@/lib/dashboard-events";
import { LANGUAGE_NAMES } from "../_lib/constants";
import { ALLERGENS, type AllergenCode } from "@/lib/allergens";
import type { Category } from "@/types";

interface TranslationData {
  name?: string;
  description?: string;
}

interface ItemWithTranslations {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  allergens: string[];
  sortOrder: number;
  isActive: boolean;
  categoryId: string;
  translations?: Record<string, TranslationData> | null;
  category: Pick<Category, "id" | "name" | "sortOrder">;
}

interface RestaurantLanguages {
  languages: string[];
  defaultLanguage: string;
  accentColor: string | null;
}

interface ItemFormPageProps {
  item?: ItemWithTranslations;
  categories: Category[];
  restaurant: RestaurantLanguages;
  initialCategoryId?: string;
  onSaved: (item: ItemWithTranslations) => void;
  onDeleted: (id: string) => void;
}

export function ItemFormPage({ item, categories, restaurant, initialCategoryId, onSaved, onDeleted }: ItemFormPageProps) {
  const { translations } = useDashboard();
  const router = useRouter();
  const t = translations.items;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tAi = useTranslations("dashboard.aiTranslate");

  const otherLanguages = useMemo(
    () => restaurant.languages.filter((l) => l !== restaurant.defaultLanguage),
    [restaurant.languages, restaurant.defaultLanguage]
  );

  const isEdit = !!item;

  const initialName = item?.name ?? "";
  const initialDescription = item?.description ?? "";
  const initialPrice = item?.price?.toString() ?? "";
  const initialImageUrl = item?.imageUrl ?? "";
  const initialAllergens = useMemo(() => item?.allergens ?? [], [item]);
  const initialItemTranslations = useMemo(
    () => (item?.translations as Record<string, TranslationData>) ?? {},
    [item]
  );
  const initialCategoryIdValue = item?.categoryId ?? initialCategoryId ?? (categories.length >= 1 && !item ? categories[0].id : "");

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [price, setPrice] = useState(initialPrice);
  const [categoryId, setCategoryId] = useState(initialCategoryIdValue);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [allergens, setAllergens] = useState<string[]>(initialAllergens);
  const [isActive] = useState(item?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAllergensDialog, setShowAllergensDialog] = useState(false);
  const [tempAllergens, setTempAllergens] = useState<string[]>([]);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false);
  const [tempDescription, setTempDescription] = useState("");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState("");

  const descriptionRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);
  const [showGenerateLimitDialog, setShowGenerateLimitDialog] = useState(false);
  const [itemTranslations, setItemTranslations] = useState<Record<string, TranslationData>>(initialItemTranslations);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [translatingLangs, setTranslatingLangs] = useState<Set<string>>(new Set());
  const [showTranslateLimitDialog, setShowTranslateLimitDialog] = useState(false);
  const [showTranslationDialog, setShowTranslationDialog] = useState(false);
  const [translationDialogLang, setTranslationDialogLang] = useState<string>("");
  const [tempTranslation, setTempTranslation] = useState<TranslationData>({});
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [tempName, setTempName] = useState("");
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [tempPrice, setTempPrice] = useState("");

  const hasChanges = useMemo(() => {
    if (!isEdit) {
      return !!(name.trim() || description.trim() || price);
    }
    return (
      name !== initialName ||
      description !== initialDescription ||
      price !== initialPrice ||
      categoryId !== initialCategoryIdValue ||
      imageUrl !== initialImageUrl ||
      JSON.stringify(allergens) !== JSON.stringify(initialAllergens) ||
      JSON.stringify(itemTranslations) !== JSON.stringify(initialItemTranslations)
    );
  }, [isEdit, name, description, price, categoryId, imageUrl, allergens, itemTranslations, initialName, initialDescription, initialPrice, initialCategoryIdValue, initialImageUrl, initialAllergens, initialItemTranslations]);

  useEffect(() => {
    track(DashboardEvent.SHOWED_ITEM_FORM);
  }, []);

  function openTranslationDialog(lang: string) {
    setTranslationDialogLang(lang);
    setTempTranslation(itemTranslations[lang] ?? {});
    setShowTranslationDialog(true);
  }

  async function handleTranslateTemp(lang: string) {
    const srcLang = restaurant.defaultLanguage;
    const hasName = name.trim();
    const hasDesc = description.trim();
    if (!hasName && !hasDesc) return;

    track(DashboardEvent.CLICKED_AI_TRANSLATE);
    setTranslatingLangs((prev) => new Set(prev).add(lang));

    try {
      const promises: Promise<{ field: "name" | "description"; text: string } | null>[] = [];

      if (hasName) {
        promises.push(
          fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: name.trim(), targetLanguage: lang, sourceLanguage: srcLang }),
          }).then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              return { field: "name" as const, text: data.translatedText };
            }
            if (res.status === 403) {
              const data = await res.json().catch(() => ({}));
              if (data.error === "limit_reached") setShowTranslateLimitDialog(true);
            }
            return null;
          })
        );
      }

      if (hasDesc) {
        promises.push(
          fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: description.trim(), targetLanguage: lang, sourceLanguage: srcLang }),
          }).then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              return { field: "description" as const, text: data.translatedText };
            }
            return null;
          })
        );
      }

      const results = await Promise.all(promises);
      const updates: TranslationData = {};
      for (const result of results) {
        if (result) updates[result.field] = result.text;
      }
      if (Object.keys(updates).length > 0) {
        setTempTranslation((prev) => ({ ...prev, ...updates }));
      }
    } catch {
      toast.error(t.translateError);
    } finally {
      setTranslatingLangs((prev) => {
        const next = new Set(prev);
        next.delete(lang);
        return next;
      });
    }
  }

  function saveTranslation() {
    const lang = translationDialogLang;
    if (!lang) return;
    setItemTranslations((prev) => ({
      ...prev,
      [lang]: {
        name: tempTranslation.name?.trim() || undefined,
        description: tempTranslation.description?.trim() || undefined,
      },
    }));
    setShowTranslationDialog(false);
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
        showImageDialog ? setTempImageUrl(data.url) : setImageUrl(data.url);
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

  function isAiImage(url: string) {
    const filename = url.split("/").pop() || "";
    return filename.startsWith("ai-");
  }

  async function handleGenerateImage(sourceImageUrl?: string) {
    track(sourceImageUrl ? DashboardEvent.CLICKED_STYLIZE_ITEM_IMAGE : DashboardEvent.CLICKED_GENERATE_ITEM_IMAGE);
    setGenerating(true);
    try {
      const res = await fetch("/api/items/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          categoryName: categories.find((c) => c.id === categoryId)?.name || undefined,
          accentColor: restaurant.accentColor || undefined,
          sourceImageUrl: sourceImageUrl || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        showImageDialog ? setTempImageUrl(data.url) : setImageUrl(data.url);
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

  async function handleDelete() {
    if (!item) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(t.deleted);
        onDeleted(item.id);
      } else {
        const data = await res.json();
        track(DashboardEvent.ERROR_DELETE, { page: "item" });
        toast.error(data.error || t.deleteError);
      }
    } catch {
      track(DashboardEvent.ERROR_DELETE, { page: "item" });
      toast.error(t.deleteError);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      track(DashboardEvent.ERROR_VALIDATION, { page: "item", field: "name" });
      setValidationError(t.nameRequired);
      return;
    }

    if (!categoryId) {
      track(DashboardEvent.ERROR_VALIDATION, { page: "item", field: "category" });
      setValidationError(t.categoryRequired);
      return;
    }

    if (price && (isNaN(Number(price)) || Number(price) < 0)) {
      track(DashboardEvent.ERROR_VALIDATION, { page: "item", field: "price" });
      setValidationError(t.priceRequired);
      return;
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/items/${item!.id}` : "/api/items";
      const method = isEdit ? "PUT" : "POST";

      const cleanTranslations: Record<string, TranslationData> = {};
      for (const lang of restaurant.languages) {
        if (lang === restaurant.defaultLanguage) continue;
        const trans = itemTranslations[lang];
        if (trans?.name?.trim() || trans?.description?.trim()) {
          cleanTranslations[lang] = {
            name: trans.name?.trim() || undefined,
            description: trans.description?.trim() || undefined,
          };
        }
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          price: price ? Number(price) : 0,
          imageUrl: imageUrl || null,
          allergens,
          categoryId,
          isActive,
          translations: Object.keys(cleanTranslations).length > 0 ? cleanTranslations : null,
        }),
      });

      if (res.ok) {
        track(DashboardEvent.CLICKED_SAVE_ITEM);
        const saved = (await res.json()) as ItemWithTranslations;
        toast.success(isEdit ? t.updated : t.created);
        onSaved(saved);
      } else {
        const data = await res.json();
        track(DashboardEvent.ERROR_SAVE, { page: "item" });
        toast.error(data.error || t.saveError);
      }
    } catch {
      track(DashboardEvent.ERROR_SAVE, { page: "item" });
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  const dialogs = (
    <>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-lg font-semibold pr-6">{t.delete}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{t.deleteConfirm}</DialogDescription>
          <div className="flex items-center justify-end gap-6 mt-2">
            <button type="button" onClick={() => setShowDeleteDialog(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t.cancel}</button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-500 transition-colors disabled:opacity-50">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}{t.delete}
            </button>
          </div>
        </DialogContent>
      </Dialog>

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

      <Dialog open={showTranslateLimitDialog} onOpenChange={setShowTranslateLimitDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-lg font-semibold pr-6">{tAi("limitReached")}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{tAi("limitReachedDescription")}</DialogDescription>
          <div className="flex items-center justify-end gap-6 mt-2">
            <button type="button" onClick={() => setShowTranslateLimitDialog(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{tAi("cancel")}</button>
            <button type="button" onClick={() => { track(DashboardEvent.CLICKED_AI_SUBSCRIBE); setShowTranslateLimitDialog(false); router.push("/dashboard/billing"); }} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">{tAi("upgrade")}</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showGenerateLimitDialog} onOpenChange={setShowGenerateLimitDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-lg font-semibold pr-6">{t.generateLimitReached}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{t.generateLimitDescription}</DialogDescription>
          <div className="flex items-center justify-end gap-6 mt-2">
            <button type="button" onClick={() => setShowGenerateLimitDialog(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t.cancel}</button>
            <button type="button" onClick={() => { track(DashboardEvent.CLICKED_AI_SUBSCRIBE); setShowGenerateLimitDialog(false); router.push("/dashboard/billing"); }} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">{t.subscribe}</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent className="sm:max-w-[384px]">
          <DialogTitle className="text-lg font-semibold pr-6">{t.name}</DialogTitle>
          <DialogDescription className="sr-only">{t.name}</DialogDescription>
          <input
            type="text"
            autoFocus
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onFocus={() => track(DashboardEvent.FOCUSED_ITEM_NAME)}
            placeholder={t.namePlaceholder}
            className="w-full mt-2 text-sm bg-transparent outline-none leading-5 p-0 placeholder:text-muted-foreground/30 border-b-[1.5px] border-border pb-2"
          />
          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => setShowNameDialog(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={() => { setName(tempName); setShowNameDialog(false); }}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t.save}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent className="sm:max-w-[384px]">
          <DialogTitle className="text-lg font-semibold pr-6">{t.price}</DialogTitle>
          <DialogDescription className="sr-only">{t.price}</DialogDescription>
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            value={tempPrice}
            onChange={(e) => {
              const clean = e.target.value.replace(",", ".").replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
              setTempPrice(clean);
            }}
            onFocus={() => track(DashboardEvent.FOCUSED_ITEM_PRICE)}
            placeholder={t.pricePlaceholder}
            className="w-full mt-2 text-sm bg-transparent outline-none leading-5 p-0 placeholder:text-muted-foreground/30 border-b-[1.5px] border-border pb-2"
          />
          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => setShowPriceDialog(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={() => { setPrice(tempPrice); setShowPriceDialog(false); }}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t.save}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDescriptionDialog} onOpenChange={setShowDescriptionDialog}>
        <DialogContent className="sm:max-w-[384px]">
          <DialogTitle className="text-lg font-semibold pr-6">{t.description}</DialogTitle>
          <DialogDescription className="sr-only">{t.description}</DialogDescription>
          <textarea
            ref={descriptionRef}
            value={tempDescription}
            onChange={(e) => {
              setTempDescription(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            placeholder={t.descriptionPlaceholder}
            rows={1}
            className="w-full mt-2 text-sm bg-transparent outline-none resize-none leading-5 p-0 placeholder:text-muted-foreground/30 border-b-[1.5px] border-border pb-2 overflow-hidden"
            style={{ minHeight: "1.25rem" }}
          />
          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => setShowDescriptionDialog(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={() => { setDescription(tempDescription); setShowDescriptionDialog(false); }}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t.save}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-[384px]">
          <DialogTitle className="text-lg font-semibold pr-6">{t.image}</DialogTitle>
          <DialogDescription className="sr-only">{t.image}</DialogDescription>
          <div className="mt-2">
            {tempImageUrl ? (
              <div className="flex items-center gap-4 mb-2">
                <div className="relative h-24 w-24 rounded-xl overflow-hidden border border-border shrink-0">
                  <Image src={tempImageUrl} alt="Item" fill className="object-cover" sizes="96px" />
                </div>
                <button
                  type="button"
                  onClick={() => setTempImageUrl("")}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <div className="-mx-6">
              <button
                type="button"
                onClick={() => { track(DashboardEvent.CLICKED_UPLOAD_ITEM_IMAGE); fileInputRef.current?.click(); }}
                disabled={uploading}
                className="flex items-center gap-3 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
              >
                <Upload className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
                <span className="text-sm flex-1">{t.uploadImage}</span>
                {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </button>
              {(!tempImageUrl || !isAiImage(tempImageUrl)) && (
                <button
                  type="button"
                  onClick={() => tempImageUrl ? handleGenerateImage(tempImageUrl) : handleGenerateImage()}
                  disabled={generating || !name.trim()}
                  className="flex items-center gap-3 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                >
                  <Sparkles className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1">{tempImageUrl ? t.stylize : t.generateImage}</span>
                  {generating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </button>
              )}
              {tempImageUrl && (
                <button
                  type="button"
                  onClick={() => setTempImageUrl("")}
                  className="flex items-center gap-3 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50"
                >
                  <Trash2 className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1">{t.removeImage}</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={() => setShowImageDialog(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={() => { setImageUrl(tempImageUrl); setShowImageDialog(false); }}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t.save}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-[384px]">
          <DialogTitle className="text-lg font-semibold pr-6">{t.category}</DialogTitle>
          <DialogDescription className="sr-only">{t.category}</DialogDescription>
          <div className="-mx-6 mt-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { track(DashboardEvent.CHANGED_ITEM_CATEGORY); setCategoryId(cat.id); setShowCategoryDialog(false); }}
                className="flex items-center gap-3 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50"
              >
                <span className="text-sm flex-1">{cat.name}</span>
                {categoryId === cat.id && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-start mt-4">
            <button
              type="button"
              onClick={() => setShowCategoryDialog(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.cancel}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTranslationDialog} onOpenChange={setShowTranslationDialog}>
        <DialogContent className="sm:max-w-[384px]">
          <DialogTitle className="text-lg font-semibold pr-6">{LANGUAGE_NAMES[translationDialogLang] || translationDialogLang}</DialogTitle>
          <DialogDescription className="sr-only">{LANGUAGE_NAMES[translationDialogLang] || translationDialogLang}</DialogDescription>
          <div className="mt-2 space-y-5">
            <FormFieldUnderline
              label={t.name}
              value={tempTranslation.name || ""}
              onChange={(v) => setTempTranslation((prev) => ({ ...prev, name: v }))}
              placeholder={t.namePlaceholder}
            />
            <FormFieldUnderline
              label={t.description}
              value={tempTranslation.description || ""}
              onChange={(v) => setTempTranslation((prev) => ({ ...prev, description: v }))}
              placeholder={t.descriptionPlaceholder}
              multiline
              autoGrow
            />
          </div>
          {(() => {
            const isTranslating = translatingLangs.has(translationDialogLang);
            return (
              <div className="-mx-6 mt-4">
                <button
                  type="button"
                  onClick={() => handleTranslateTemp(translationDialogLang)}
                  disabled={isTranslating || (!name.trim() && !description.trim())}
                  className="flex items-center gap-3 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                >
                  <Sparkles className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1">{isTranslating ? tAi("translating") : tAi("translate")}</span>
                  {isTranslating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </button>
              </div>
            );
          })()}
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={() => setShowTranslationDialog(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={saveTranslation}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t.save}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAllergensDialog} onOpenChange={setShowAllergensDialog}>
        <DialogContent className="sm:max-w-[384px]">
          <DialogTitle className="text-lg font-semibold pr-6">{t.allergens}</DialogTitle>
          <DialogDescription className="sr-only">{t.allergens}</DialogDescription>
          <div className="flex flex-wrap gap-2 mt-2">
            {ALLERGENS.map((allergen) => {
              const isSelected = tempAllergens.includes(allergen.code);
              return (
                <button
                  key={allergen.code}
                  type="button"
                  onClick={() => setTempAllergens((prev) =>
                    isSelected ? prev.filter((c) => c !== allergen.code) : [...prev, allergen.code]
                  )}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm border transition-colors ${
                    isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="text-base leading-none">{allergen.icon}</span>
                  <span>{(t.allergenNames as Record<AllergenCode, string>)[allergen.code] || allergen.code}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={() => setShowAllergensDialog(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={() => { setAllergens(tempAllergens); setShowAllergensDialog(false); }}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t.save}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  return (
    <>
      <DialogTitle className="text-lg font-semibold pr-6">
        {isEdit ? t.editItem : t.addItem}
      </DialogTitle>
      <DialogDescription className="sr-only">
        {isEdit ? t.editItem : t.addItem}
      </DialogDescription>

      <div className="overflow-y-auto -mx-6 px-6 max-h-[60vh]">
        <form id="item-form-dialog" onSubmit={handleSubmit} className="space-y-5 mt-2 pb-2">
          <div className="-mx-6 -my-2">
            {(!initialCategoryId || isEdit) && (
              <button
                type="button"
                onClick={() => setShowCategoryDialog(true)}
                className="flex items-center gap-3 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50"
              >
                <LayoutGrid className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
                <span className="text-sm flex-1">{t.category}</span>
                {categoryId ? (
                  <span className="text-sm text-muted-foreground truncate max-w-[45%]">
                    {categories.find((c) => c.id === categoryId)?.name}
                  </span>
                ) : (
                  <span className="text-sm text-primary">{t.add || "Add"}</span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => { setTempName(name); setShowNameDialog(true); }}
              className="flex items-center gap-3 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50"
            >
              <Type className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
              <span className="text-sm flex-1">{t.name}</span>
              {name ? (
                <span className="text-sm text-muted-foreground truncate max-w-[45%]">{name}</span>
              ) : (
                <span className="text-sm text-primary">{t.add || "Add"}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setTempDescription(description); setShowDescriptionDialog(true); }}
              className="flex items-center gap-3 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50"
            >
              <AlignLeft className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
              <span className="text-sm flex-1">{t.description}</span>
              {description ? (
                <span className="text-sm text-muted-foreground truncate max-w-[45%]">{description}</span>
              ) : (
                <span className="text-sm text-primary">{t.add || "Add"}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setTempPrice(price); setShowPriceDialog(true); }}
              className="flex items-center gap-3 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50"
            >
              <Tag className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
              <span className="text-sm flex-1">{t.price}</span>
              {price ? (
                <span className="text-sm text-muted-foreground truncate max-w-[45%]">{price}</span>
              ) : (
                <span className="text-sm text-primary">{t.add || "Add"}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setTempImageUrl(imageUrl); setShowImageDialog(true); }}
              className="flex items-center gap-3 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50"
            >
              <ImageIcon className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
              <span className="text-sm flex-1">{t.image}</span>
              {imageUrl ? (
                <div className="relative h-6 w-6 rounded-sm overflow-hidden border border-border shrink-0">
                  <Image src={imageUrl} alt="Item" fill className="object-cover" sizes="24px" />
                </div>
              ) : (
                <span className="text-sm text-primary">{t.add || "Add"}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setTempAllergens(allergens); setShowAllergensDialog(true); }}
              className="flex items-center gap-3 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50"
            >
              <ShieldAlert className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
              <span className="text-sm flex-1">{t.allergens}</span>
              {allergens.length > 0 ? (
                <span className="flex gap-1">
                  {allergens.map((code) => {
                    const a = ALLERGENS.find((x) => x.code === code);
                    return a ? <span key={code} className="text-base leading-none">{a.icon}</span> : null;
                  })}
                </span>
              ) : (
                <span className="text-sm text-primary">{t.add || "Add"}</span>
              )}
            </button>

            {otherLanguages.map((lang) => {
              const trans = itemTranslations[lang];
              const summary = trans?.name || trans?.description || "";
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => openTranslationDialog(lang)}
                  className="flex items-center gap-3 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50"
                >
                  <Languages className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1">{LANGUAGE_NAMES[lang] || lang}</span>
                  {summary ? (
                    <span className="text-sm text-muted-foreground truncate max-w-[45%]">{summary}</span>
                  ) : (
                    <span className="text-sm text-primary">{t.add || "Add"}</span>
                  )}
                </button>
              );
            })}
          </div>

        </form>
      </div>

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageUpload} disabled={uploading} />

      <div className="flex items-center justify-between mt-2">
        {isEdit ? (
          <button
            type="button"
            onClick={() => { track(DashboardEvent.CLICKED_DELETE_ITEM); setShowDeleteDialog(true); }}
            disabled={saving || deleting}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {t.delete}
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          form="item-form-dialog"
          disabled={saving || deleting || uploading || generating || !hasChanges}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}{t.save}
        </button>
      </div>

      {dialogs}
    </>
  );
}
