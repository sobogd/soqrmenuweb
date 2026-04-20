"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { FormFieldUnderline } from "../_ui/form-field-underline";
import Image from "next/image";
import { Loader2, X, Trash2, Upload, Sparkles, ChevronDown, AlignLeft, ImageIcon, ShieldAlert, LayoutGrid, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
import { useLocale, useTranslations } from "next-intl";
import { useDashboard } from "../_context/dashboard-context";
import { PageLoader } from "../_ui/page-loader";
import { PageHeader } from "../_ui/page-header";
import { useRouter } from "@/i18n/routing";
import { track, DashboardEvent } from "@/lib/dashboard-events";
import { LANGUAGE_NAMES } from "../_lib/constants";
import { ALLERGENS, type AllergenCode } from "@/lib/allergens";
import { useRestaurantLanguages } from "../_hooks/use-restaurant-languages";
import type { Category } from "@/types";
import { DashboardContent } from "../_ui/dashboard-content";

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

interface ItemFormPageProps {
  id?: string;
  initialCategoryId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function ItemFormPage({ id, initialCategoryId, onClose, onSuccess }: ItemFormPageProps) {
  const { translations } = useDashboard();
  const router = useRouter();
  const locale = useLocale();
  const t = translations.items;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { restaurant, loading: loadingRestaurant, otherLanguages } = useRestaurantLanguages();

  const knownLanguagesRef = useRef<string[]>([]);
  if (!loadingRestaurant && otherLanguages.length > 0) {
    knownLanguagesRef.current = otherLanguages;
  }
  const knownLanguages = knownLanguagesRef.current;

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategoryId || "");
  const [imageUrl, setImageUrl] = useState("");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
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
  const [itemTranslations, setItemTranslations] = useState<Record<string, TranslationData>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [translatingLangs, setTranslatingLangs] = useState<Set<string>>(new Set());
  const [showTranslateLimitDialog, setShowTranslateLimitDialog] = useState(false);
  const tAi = useTranslations("dashboard.aiTranslate");

  // Original values for change detection (edit mode)
  const [originalName, setOriginalName] = useState("");
  const [originalDescription, setOriginalDescription] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [originalCategoryId, setOriginalCategoryId] = useState(initialCategoryId || "");
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [originalAllergens, setOriginalAllergens] = useState<string[]>([]);
  const [originalTranslations, setOriginalTranslations] = useState<Record<string, TranslationData>>({});

  const isEdit = !!id;

  const hasChanges = useMemo(() => {
    if (!isEdit) {
      return !!(name.trim() || description.trim() || price);
    }
    return (
      name !== originalName ||
      description !== originalDescription ||
      price !== originalPrice ||
      categoryId !== originalCategoryId ||
      imageUrl !== originalImageUrl ||
      JSON.stringify(allergens) !== JSON.stringify(originalAllergens) ||
      JSON.stringify(itemTranslations) !== JSON.stringify(originalTranslations)
    );
  }, [isEdit, name, description, price, categoryId, imageUrl, allergens, itemTranslations, originalName, originalDescription, originalPrice, originalCategoryId, originalImageUrl, originalAllergens, originalTranslations]);

  useEffect(() => {
    track(DashboardEvent.SHOWED_ITEM_FORM);
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const promises: Promise<Response>[] = [
        fetch("/api/categories"),
      ];
      if (id) {
        promises.push(fetch(`/api/items/${id}`));
      }

      const results = await Promise.all(promises);
      const [categoriesRes, itemRes] = results;

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
        // Auto-select category when only one exists (new item without preset category)
        if (!id && !initialCategoryId && categoriesData.length >= 1 && !categoryId) {
          setCategoryId(categoriesData[0].id);
        }
      }

      if (id && itemRes) {
        if (!itemRes.ok) throw new Error("Failed to fetch item");
        const item: ItemWithTranslations = await itemRes.json();
        const itemName = item.name;
        const itemDesc = item.description || "";
        const itemPrice = item.price?.toString() || "";
        const itemImage = item.imageUrl || "";
        const itemAllergens = item.allergens || [];
        const itemTrans = (item.translations as Record<string, TranslationData>) || {};

        setName(itemName);
        setDescription(itemDesc);
        setPrice(itemPrice);
        setCategoryId(item.categoryId);
        setImageUrl(itemImage);
        setAllergens(itemAllergens);
        setIsActive(item.isActive);
        setItemTranslations(itemTrans);

        setOriginalName(itemName);
        setOriginalDescription(itemDesc);
        setOriginalPrice(itemPrice);
        setOriginalCategoryId(item.categoryId);
        setOriginalImageUrl(itemImage);
        setOriginalAllergens(itemAllergens);
        setOriginalTranslations(itemTrans);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      track(DashboardEvent.ERROR_FETCH, { page: "item" });
      toast.error(t.fetchError);
      if (id) onClose ? onClose() : router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  function handleTranslationChange(lang: string, field: "name" | "description", value: string) {
    setItemTranslations((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }));
  }

  async function handleTranslateSection(lang: string) {
    const srcLang = restaurant?.defaultLanguage || "en";
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
      for (const result of results) {
        if (result) handleTranslationChange(lang, result.field, result.text);
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
          accentColor: restaurant?.accentColor || undefined,
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
    if (!id) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(t.deleted);
        onSuccess ? onSuccess() : router.push("/dashboard");
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
      const url = isEdit ? `/api/items/${id}` : "/api/items";
      const method = isEdit ? "PUT" : "POST";

      const cleanTranslations: Record<string, TranslationData> = {};
      if (restaurant) {
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
        toast.success(isEdit ? t.updated : t.created);
        onSuccess ? onSuccess() : router.push("/dashboard");
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

  function handleToggleAllergen(code: string) {
    if (allergens.includes(code)) {
      setAllergens(allergens.filter((c) => c !== code));
    } else {
      setAllergens([...allergens, code]);
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

  if (onClose) {
    const isLoading = loading || loadingRestaurant;

    return (
      <>
        <DialogTitle className="text-lg font-semibold pr-6">
          {isLoading ? (
            <span className="inline-block w-36 bg-muted rounded animate-pulse">&nbsp;</span>
          ) : (
            isEdit ? t.editItem : t.addItem
          )}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isEdit ? t.editItem : t.addItem}
        </DialogDescription>

        <div className="overflow-y-auto -mx-6 px-6 max-h-[60vh]">
          <form id="item-form-dialog" onSubmit={handleSubmit} className="space-y-5 mt-2 pb-2">


            {/* Name */}
            <FormFieldUnderline
              id="name"
              label={t.name}
              value={name}
              onChange={setName}
              placeholder={t.namePlaceholder}
              isLoading={isLoading}
              autoFocus={!isLoading}
              onFocus={() => track(DashboardEvent.FOCUSED_ITEM_NAME)}
            />

            {/* Price */}
            <FormFieldUnderline
              id="price"
              label={t.price}
              value={price}
              onChange={(v) => {
                const clean = v.replace(",", ".").replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                setPrice(clean);
              }}
              placeholder={t.pricePlaceholder}
              isLoading={isLoading}
              inputMode="decimal"
              onFocus={() => track(DashboardEvent.FOCUSED_ITEM_PRICE)}
            />

            {/* Category / Description / Image / Allergens */}
            <div className="-mx-6 -my-2">
              {(!initialCategoryId || isEdit) && (
                <button
                  type="button"
                  onClick={() => setShowCategoryDialog(true)}
                  disabled={isLoading}
                  className={`flex items-center gap-3 px-6 py-3 w-full text-left transition-colors ${isLoading ? "animate-pulse pointer-events-none" : "hover:bg-muted/50"}`}
                >
                  <LayoutGrid className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1">{t.category}</span>
                  {isLoading ? (
                    <span className="h-4 w-16 bg-muted rounded-sm" />
                  ) : categoryId ? (
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
                onClick={() => { setTempDescription(description); setShowDescriptionDialog(true); }}
                disabled={isLoading}
                className={`flex items-center gap-3 px-6 py-3 w-full text-left transition-colors ${isLoading ? "animate-pulse pointer-events-none" : "hover:bg-muted/50"}`}
              >
                <AlignLeft className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
                <span className="text-sm flex-1">{t.description}</span>
                {isLoading ? (
                  <span className="h-4 w-16 bg-muted rounded-sm" />
                ) : description ? (
                  <span className="text-sm text-muted-foreground truncate max-w-[45%]">{description}</span>
                ) : (
                  <span className="text-sm text-primary">{t.add || "Add"}</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setTempImageUrl(imageUrl); setShowImageDialog(true); }}
                disabled={isLoading}
                className={`flex items-center gap-3 px-6 py-3 w-full text-left transition-colors ${isLoading ? "animate-pulse pointer-events-none" : "hover:bg-muted/50"}`}
              >
                <ImageIcon className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
                <span className="text-sm flex-1">{t.image}</span>
                {isLoading ? (
                  <span className="h-4 w-16 bg-muted rounded-sm" />
                ) : imageUrl ? (
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
                disabled={isLoading}
                className={`flex items-center gap-3 px-6 py-3 w-full text-left transition-colors ${isLoading ? "animate-pulse pointer-events-none" : "hover:bg-muted/50"}`}
              >
                <ShieldAlert className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
                <span className="text-sm flex-1">{t.allergens}</span>
                {isLoading ? (
                  <span className="h-4 w-16 bg-muted rounded-sm" />
                ) : allergens.length > 0 ? (
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
            </div>

            {/* Translations */}
            {knownLanguages.map((lang) => {
              const isTranslating = translatingLangs.has(lang);
              return (
                <div key={lang} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{LANGUAGE_NAMES[lang] || lang}</span>
                    {!isLoading && (
                      <button
                        type="button"
                        onClick={() => handleTranslateSection(lang)}
                        disabled={isTranslating || (!name.trim() && !description.trim())}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                      >
                        {isTranslating ? tAi("translating") : tAi("translate")}
                        {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                  <FormFieldUnderline
                    label={t.name}
                    value={itemTranslations[lang]?.name || ""}
                    onChange={(v) => handleTranslationChange(lang, "name", v)}
                    placeholder={t.namePlaceholder}
                    isLoading={isLoading}
                  />
                  <FormFieldUnderline
                    label={t.description}
                    value={itemTranslations[lang]?.description || ""}
                    onChange={(v) => handleTranslationChange(lang, "description", v)}
                    placeholder={t.descriptionPlaceholder}
                    isLoading={isLoading}
                    multiline
                    rows={2}
                  />
                </div>
              );
            })}

          </form>
        </div>

        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageUpload} disabled={uploading} />

        <div className="flex items-center justify-between mt-6">
          {isEdit ? (
            isLoading ? (
              <span className="text-sm font-medium inline-block w-14 bg-muted rounded animate-pulse">&nbsp;</span>
            ) : (
              <button
                type="button"
                onClick={() => { track(DashboardEvent.CLICKED_DELETE_ITEM); setShowDeleteDialog(true); }}
                disabled={saving || deleting}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {t.delete}
              </button>
            )
          ) : (
            <span />
          )}
          {isLoading ? (
            <span className="text-sm font-medium inline-block w-10 bg-muted rounded animate-pulse">&nbsp;</span>
          ) : (
            <button
              type="submit"
              form="item-form-dialog"
              disabled={saving || deleting || uploading || generating}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{t.save}
            </button>
          )}
        </div>

        {!isLoading && dialogs}
      </>
    );
  }

  if (loading || loadingRestaurant) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0">
        <PageHeader title={isEdit ? t.editItem : t.addItem} backHref="/dashboard">
          <Button
            type="submit"
            form="item-form"
            disabled={saving || deleting || uploading || generating || !hasChanges}
            variant="default"
            size="sm"
            className={!hasChanges ? "opacity-40" : ""}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t.save}
          </Button>
        </PageHeader>
      </div>

      <form id="item-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
        <DashboardContent innerClassName="space-y-6">

          {/* General */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground px-4 mb-1.5">{t.general}</p>
            <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
              {/* Category */}
              {categories.length > 1 && (!initialCategoryId || isEdit) && (
                <>
                  <div className="flex items-center h-11 px-4">
                    <label htmlFor="category" className="text-sm text-muted-foreground shrink-0 mr-3">{t.category}</label>
                    <div className="relative flex-1 flex justify-end">
                      <select
                        id="category"
                        value={categoryId}
                        onChange={(e) => { track(DashboardEvent.CHANGED_ITEM_CATEGORY); setCategoryId(e.target.value); }}
                        className="appearance-none bg-transparent text-sm text-right pr-5 cursor-pointer focus:outline-none min-w-0"
                      >
                        <option value="">{t.categoryPlaceholder}</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
                    </div>
                  </div>
                  <div className="border-t border-border mx-4" />
                </>
              )}
              {/* Name */}
              <div className="flex items-center h-11 px-4">
                <label htmlFor="name" className="text-sm text-muted-foreground shrink-0 mr-3">{t.name}</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => track(DashboardEvent.FOCUSED_ITEM_NAME)}
                  placeholder={t.namePlaceholder}
                  className="flex-1 text-sm text-right bg-transparent focus:outline-none placeholder:text-muted-foreground/30 min-w-0"
                />
              </div>
              <div className="border-t border-border mx-4" />
              {/* Price */}
              <div className="flex items-center h-11 px-4">
                <label htmlFor="price" className="text-sm text-muted-foreground shrink-0 mr-3">{t.price}</label>
                <input
                  id="price"
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onFocus={() => track(DashboardEvent.FOCUSED_ITEM_PRICE)}
                  onChange={(e) => {
                    const cleanValue = e.target.value
                      .replace(",", ".")
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./g, "$1");
                    setPrice(cleanValue);
                  }}
                  placeholder={t.pricePlaceholder}
                  className="flex-1 text-sm text-right bg-transparent focus:outline-none placeholder:text-muted-foreground/30 min-w-0"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground px-4 mb-1.5">{t.description}</p>
            <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => track(DashboardEvent.FOCUSED_ITEM_DESCRIPTION)}
                placeholder={t.descriptionPlaceholder}
                rows={3}
                className="w-full px-4 py-3 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/30 resize-none"
              />
            </div>
          </div>

          {/* Image */}
          <div>
            <div className="flex items-center justify-between px-4 mb-1.5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t.image}</p>
              {(!imageUrl || (imageUrl && !isAiImage(imageUrl))) && (
                <button
                  type="button"
                  onClick={() => imageUrl ? handleGenerateImage(imageUrl) : handleGenerateImage()}
                  disabled={generating || !name.trim()}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  {generating ? t.generatingImage : imageUrl ? t.stylize : t.generateImage}
                  {generating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
            <div className="rounded-xl border border-border bg-muted/30">
              {imageUrl ? (
                <div className="p-4">
                  <div className="relative inline-block">
                    <div className="relative h-32 w-32 rounded-lg overflow-hidden border border-border">
                      <Image
                        src={imageUrl}
                        alt="Item"
                        fill
                        className="object-cover"
                        sizes="128px"
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
                  className="flex items-center justify-center h-28 cursor-pointer hover:bg-muted/50 transition-colors rounded-xl"
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
          </div>

          {/* Allergens */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground px-4 mb-1.5">{t.allergens}</p>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map((allergen) => {
                  const isSelected = allergens.includes(allergen.code);
                  return (
                    <button
                      key={allergen.code}
                      type="button"
                      onClick={() => handleToggleAllergen(allergen.code)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm border transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-base leading-none">{allergen.icon}</span>
                      <span>{(t.allergenNames as Record<AllergenCode, string>)[allergen.code] || allergen.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Translation sections */}
          {otherLanguages.map((lang) => {
            const isTranslating = translatingLangs.has(lang);
            return (
              <div key={lang}>
                <div className="flex items-center justify-between px-4 mb-1.5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{LANGUAGE_NAMES[lang] || lang}</p>
                  <button
                    type="button"
                    onClick={() => handleTranslateSection(lang)}
                    disabled={isTranslating || (!name.trim() && !description.trim())}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                  >
                    {isTranslating ? tAi("translating") : tAi("translate")}
                    {isTranslating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                  {/* Name */}
                  <div className="flex items-center h-11 px-4">
                    <label className="text-sm text-muted-foreground shrink-0 mr-3">{t.name}</label>
                    <input
                      type="text"
                      value={itemTranslations[lang]?.name || ""}
                      onChange={(e) => handleTranslationChange(lang, "name", e.target.value)}
                      placeholder={t.namePlaceholder}
                      className="flex-1 text-sm text-right bg-transparent focus:outline-none placeholder:text-muted-foreground/30 min-w-0"
                    />
                  </div>
                  <div className="border-t border-border mx-4" />
                  {/* Description */}
                  <textarea
                    value={itemTranslations[lang]?.description || ""}
                    onChange={(e) => handleTranslationChange(lang, "description", e.target.value)}
                    placeholder={t.descriptionPlaceholder}
                    rows={2}
                    className="w-full px-4 py-3 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/30 resize-none"
                  />
                </div>
              </div>
            );
          })}

          {/* Delete */}
          {isEdit && (
            <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
              <button
                type="button"
                onClick={() => { track(DashboardEvent.CLICKED_DELETE_ITEM); setShowDeleteDialog(true); }}
                disabled={saving || deleting}
                className="flex items-center gap-3 w-full h-11 px-4 hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">{t.delete}</span>
              </button>
            </div>
          )}

        </DashboardContent>
      </form>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.delete}</DialogTitle>
            <DialogDescription>{t.deleteConfirm}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              <X className="h-4 w-4 mr-2" />
              {t.cancel}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t.delete}
            </Button>
          </DialogFooter>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tAi("limitReached")}</DialogTitle>
            <DialogDescription>{tAi("limitReachedDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTranslateLimitDialog(false)}>
              {tAi("cancel")}
            </Button>
            <Button onClick={() => { track(DashboardEvent.CLICKED_AI_SUBSCRIBE); setShowTranslateLimitDialog(false); router.push("/dashboard/billing"); }}>
              {tAi("upgrade")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
