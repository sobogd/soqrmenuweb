"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X, Trash2, Sparkles, ChevronDown, ChevronRight, AlignLeft, ImageIcon, ShieldAlert } from "lucide-react";
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
import { useTranslations } from "next-intl";
import { useDashboard } from "../_context/dashboard-context";
import { PageLoader } from "../_ui/page-loader";
import { PageHeader } from "../_ui/page-header";
import { useRouter } from "@/i18n/routing";
import { track, DashboardEvent } from "@/lib/dashboard-events";
import { LANGUAGE_NAMES } from "../_lib/constants";
import { getAllergenIcon } from "@/lib/allergens";
import { useRestaurantLanguages } from "../_hooks/use-restaurant-languages";
import type { Category } from "@/types";
import { DashboardContent } from "../_ui/dashboard-content";

function getDraftKey(categoryId: string, itemId?: string) {
  return `draft:menu-item:${categoryId}:${itemId || "new"}`;
}

export interface MenuItemDraft {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  imageUrl: string;
  allergens: string[];
  isActive: boolean;
  itemTranslations: Record<string, TranslationData>;
}

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

interface MenuItemFormPageProps {
  id?: string;
  categoryId: string;
}

export function MenuItemFormPage({ id, categoryId: paramCategoryId }: MenuItemFormPageProps) {
  const { translations } = useDashboard();
  const router = useRouter();
  const t = translations.items;
  const { restaurant, loading: loadingRestaurant, otherLanguages } = useRestaurantLanguages();
  const backHref = `/dashboard/menu/${paramCategoryId}`;

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState(paramCategoryId || "");
  const [imageUrl, setImageUrl] = useState("");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemTranslations, setItemTranslations] = useState<Record<string, TranslationData>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [translatingLangs, setTranslatingLangs] = useState<Set<string>>(new Set());
  const [showTranslateLimitDialog, setShowTranslateLimitDialog] = useState(false);
  const tAi = useTranslations("dashboard.aiTranslate");

  const isEdit = !!id;

  const draftKey = getDraftKey(paramCategoryId, id);

  useEffect(() => {
    track(DashboardEvent.SHOWED_ITEM_FORM);
    fetchData();
  }, [id]);

  function restoreFromDraft(draft: MenuItemDraft) {
    setName(draft.name);
    setDescription(draft.description);
    setPrice(draft.price);
    setCategoryId(draft.categoryId);
    setImageUrl(draft.imageUrl);
    setAllergens(draft.allergens);
    setIsActive(draft.isActive);
    setItemTranslations(draft.itemTranslations);
  }

  async function fetchData() {
    try {
      // Check for draft first
      const draftJson = sessionStorage.getItem(draftKey);
      if (draftJson) {
        const draft: MenuItemDraft = JSON.parse(draftJson);
        restoreFromDraft(draft);
      }

      const promises: Promise<Response>[] = [
        fetch("/api/categories"),
      ];
      if (id && !draftJson) {
        promises.push(fetch(`/api/items/${id}`));
      }

      const results = await Promise.all(promises);
      const [categoriesRes, itemRes] = results;

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
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
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      track(DashboardEvent.ERROR_FETCH, { page: "item" });
      toast.error(t.fetchError);
      if (id) router.push(backHref);
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

  async function handleDelete() {
    if (!id) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(t.deleted);
        router.push(backHref);
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
        sessionStorage.removeItem(draftKey);
        track(DashboardEvent.CLICKED_SAVE_ITEM);
        toast.success(isEdit ? t.updated : t.created);
        router.push(backHref);
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

  function saveDraftAndNavigateTo(subpage: string) {
    const draft: MenuItemDraft = {
      name, description, price, categoryId, imageUrl, allergens, isActive, itemTranslations,
    };
    sessionStorage.setItem(draftKey, JSON.stringify(draft));
    const basePath = id
      ? `/dashboard/menu/${paramCategoryId}/${id}`
      : `/dashboard/menu/${paramCategoryId}/add`;
    router.push(`${basePath}/${subpage}`);
  }

  if (loading || loadingRestaurant) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0">
        <PageHeader title={isEdit ? t.editItem : t.addItem} />
      </div>

      <form id="menu-item-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
        <DashboardContent innerClassName="flex flex-col gap-4">

          {/* Main fields */}
          <div>
            <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
              {/* Category */}
              {categories.length > 1 && isEdit && (
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

          {/* Description + Image + Allergens */}
          <div>
            <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
              {/* Description */}
              <button
                type="button"
                onClick={() => saveDraftAndNavigateTo("description")}
                className="flex items-center w-full h-11 px-4 gap-3"
              >
                <AlignLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm text-left">{t.description}</span>
                <span className={`h-2 w-2 rounded-full shrink-0 ${description ? "bg-primary" : "bg-muted-foreground/30"}`} />
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
              <div className="border-t border-border mx-4" />
              {/* Image */}
              <button
                type="button"
                onClick={() => saveDraftAndNavigateTo("image")}
                className="flex items-center w-full h-11 px-4 gap-3"
              >
                <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm text-left">{t.image}</span>
                <span className={`h-2 w-2 rounded-full shrink-0 ${imageUrl ? "bg-primary" : "bg-muted-foreground/30"}`} />
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
              <div className="border-t border-border mx-4" />
              {/* Allergens */}
              <button
                type="button"
                onClick={() => saveDraftAndNavigateTo("allergens")}
                className="flex items-center w-full h-11 px-4 gap-3"
              >
                <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm text-left">{t.allergens}</span>
                {allergens.length > 0 && <span className="text-xs text-muted-foreground">{allergens.length}</span>}
                <span className={`h-2 w-2 rounded-full shrink-0 ${allergens.length > 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
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

          {/* Actions */}
          <div className="flex flex-col gap-4">
            <button
              type="submit"
              disabled={saving || deleting}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: "linear-gradient(to right, hsl(9,100%,58%), #f59e0b)" }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" />{t.save}</>}
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={() => { track(DashboardEvent.CLICKED_DELETE_ITEM); setShowDeleteDialog(true); }}
                disabled={saving || deleting}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-border bg-muted/30 text-sm font-medium text-destructive hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {t.delete}
              </button>
            )}
          </div>

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
            <Button variant="destructive" onClick={handleDelete} loading={deleting}>
              <Trash2 className="h-4 w-4 mr-2" />
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

    </div>
  );
}
