"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Loader2, Trash2, X, Sparkles } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { FormFieldUnderline } from "../_ui/form-field-underline";
import { PageHeader } from "../_ui/page-header";
import { useRouter } from "@/i18n/routing";
import { track, DashboardEvent } from "@/lib/dashboard-events";
import { LANGUAGE_NAMES } from "../_lib/constants";
import { useRestaurantLanguages } from "../_hooks/use-restaurant-languages";
import type { Category } from "@/types";
import { DashboardContent } from "../_ui/dashboard-content";

interface CategoryWithTranslations extends Category {
  translations?: Record<string, { name?: string }> | null;
}

interface CategoryFormPageProps {
  id?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function CategoryFormPage({ id, onClose, onSuccess }: CategoryFormPageProps) {
  const { translations } = useDashboard();
  const router = useRouter();
  const locale = useLocale();
  const t = translations.categories;
  const tAi = useTranslations("dashboard.aiTranslate");
  const { restaurant, loading: loadingRestaurant, otherLanguages } = useRestaurantLanguages();

  const [loading, setLoading] = useState(!!id);
  const [category, setCategory] = useState<CategoryWithTranslations | null>(null);
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryTranslations, setCategoryTranslations] = useState<
    Record<string, { name?: string }>
  >({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [translatingLangs, setTranslatingLangs] = useState<Set<string>>(new Set());
  const [showTranslateLimitDialog, setShowTranslateLimitDialog] = useState(false);

  // Original values for change detection
  const [originalName, setOriginalName] = useState("");
  const [originalTranslations, setOriginalTranslations] = useState<Record<string, { name?: string }>>({});

  const isEdit = !!id;

  const knownLanguagesRef = useRef<string[]>([]);
  if (!loadingRestaurant && otherLanguages.length > 0) {
    knownLanguagesRef.current = otherLanguages;
  }
  const knownLanguages = knownLanguagesRef.current;

  const hasChanges = useMemo(() => {
    if (!isEdit) {
      return !!name.trim();
    }
    return (
      name !== originalName ||
      JSON.stringify(categoryTranslations) !== JSON.stringify(originalTranslations)
    );
  }, [isEdit, name, categoryTranslations, originalName, originalTranslations]);

  useEffect(() => {
    track(DashboardEvent.SHOWED_CATEGORY_FORM);
    if (id) {
      fetchCategory(id);
    }
  }, [id]);

  async function fetchCategory(categoryId: string) {
    try {
const response = await fetch(`/api/categories/${categoryId}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data: CategoryWithTranslations = await response.json();
      setCategory(data);
      const catName = data.name;
      const catTrans = (data.translations as Record<string, { name?: string }>) || {};

      setName(catName);
      setIsActive(data.isActive);
      setCategoryTranslations(catTrans);

      setOriginalName(catName);
      setOriginalTranslations(catTrans);
    } catch (error) {
      console.error("Failed to fetch category:", error);
      track(DashboardEvent.ERROR_FETCH, { page: "category" });
      toast.error(t.fetchError);
      onClose ? onClose() : router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  function handleTranslationChange(lang: string, value: string) {
    setCategoryTranslations((prev) => ({
      ...prev,
      [lang]: { ...prev[lang], name: value },
    }));
  }

  async function handleTranslateSection(lang: string) {
    const srcLang = restaurant?.defaultLanguage || "en";
    if (!name.trim()) return;

    track(DashboardEvent.CLICKED_AI_TRANSLATE);
    setTranslatingLangs((prev) => new Set(prev).add(lang));

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: name.trim(), targetLanguage: lang, sourceLanguage: srcLang }),
      });

      if (res.ok) {
        const data = await res.json();
        handleTranslationChange(lang, data.translatedText);
      } else if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "limit_reached") setShowTranslateLimitDialog(true);
        else toast.error(t.translateError);
      } else {
        toast.error(t.translateError);
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
    if (!category) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(t.deleted);
        onSuccess ? onSuccess() : router.push("/dashboard");
      } else {
        const data = await res.json();
        track(DashboardEvent.ERROR_DELETE, { page: "category" });
        toast.error(data.error || t.deleteError);
      }
    } catch {
      track(DashboardEvent.ERROR_DELETE, { page: "category" });
      toast.error(t.deleteError);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      track(DashboardEvent.ERROR_VALIDATION, { page: "category", field: "name" });
      setValidationError(t.nameRequired);
      return;
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/categories/${id}` : "/api/categories";
      const method = isEdit ? "PUT" : "POST";

      const cleanTranslations: Record<string, { name: string }> = {};
      if (restaurant) {
        for (const lang of restaurant.languages) {
          if (lang === restaurant.defaultLanguage) continue;
          const trans = categoryTranslations[lang];
          if (trans?.name?.trim()) {
            cleanTranslations[lang] = { name: trans.name.trim() };
          }
        }
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          isActive,
          translations: Object.keys(cleanTranslations).length > 0 ? cleanTranslations : null,
        }),
      });

      if (res.ok) {
        track(DashboardEvent.CLICKED_SAVE_CATEGORY);
        toast.success(isEdit ? t.updated : t.created);
        onSuccess ? onSuccess() : router.push("/dashboard");
      } else {
        const data = await res.json();
        track(DashboardEvent.ERROR_SAVE, { page: "category" });
        toast.error(data.error || t.saveError);
      }
    } catch {
      track(DashboardEvent.ERROR_SAVE, { page: "category" });
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  if ((loading || loadingRestaurant) && !onClose) {
    return <PageLoader />;
  }

  const formContent = (
    <>
      {/* Name */}
      <div className="relative rounded-xl border border-border px-4 pt-4 pb-3">
        <label htmlFor="name" className="absolute -top-2.5 left-3 px-1 bg-background text-xs text-muted-foreground">
          {t.name}
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => track(DashboardEvent.FOCUSED_CATEGORY_NAME)}
          placeholder={t.namePlaceholder}
          className="w-full text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/30"
        />
      </div>

      {/* Translation sections */}
      {otherLanguages.map((lang) => {
        const isTranslating = translatingLangs.has(lang);
        return (
          <div key={lang} className="relative rounded-xl border border-border px-4 pt-4 pb-3">
            <div className="absolute -top-2.5 left-3 right-3 flex items-center justify-between">
              <span className="px-1 bg-background text-xs text-muted-foreground uppercase tracking-wider">
                {LANGUAGE_NAMES[lang] || lang}
              </span>
              <button
                type="button"
                onClick={() => handleTranslateSection(lang)}
                disabled={isTranslating || !name.trim()}
                className="px-1 bg-background flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {isTranslating ? tAi("translating") : tAi("translate")}
                {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              </button>
            </div>
            <input
              type="text"
              value={categoryTranslations[lang]?.name || ""}
              onChange={(e) => handleTranslationChange(lang, e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/30"
            />
          </div>
        );
      })}
    </>
  );

  const pageDeleteButton = isEdit && (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => { track(DashboardEvent.CLICKED_DELETE_CATEGORY); setShowDeleteDialog(true); }}
        disabled={saving || deleting}
        className="flex items-center gap-3 w-full h-11 px-4 hover:bg-muted/50 transition-colors disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4 text-red-400" />
        <span className="text-sm font-medium text-red-400">{t.delete}</span>
      </button>
    </div>
  );

  const dialogs = (
    <>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-lg font-semibold pr-6">{t.delete}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{t.deleteConfirm}</DialogDescription>
          <div className="flex items-center justify-end gap-6 mt-2">
            <button
              type="button"
              onClick={() => setShowDeleteDialog(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
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
            <button
              type="button"
              onClick={() => setShowTranslateLimitDialog(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {tAi("cancel")}
            </button>
            <button
              type="button"
              onClick={() => { track(DashboardEvent.CLICKED_AI_SUBSCRIBE); setShowTranslateLimitDialog(false); router.push("/dashboard/billing"); }}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {tAi("upgrade")}
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
            isEdit ? t.editCategory : t.addCategory
          )}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isEdit ? t.editCategory : t.addCategory}
        </DialogDescription>

        <form id="category-form-dialog" onSubmit={handleSubmit} className="space-y-5 mt-2">
          <FormFieldUnderline
            id="name"
            label={t.name}
            value={name}
            onChange={setName}
            placeholder={t.namePlaceholder}
            isLoading={isLoading}
            autoFocus={!isLoading}
            onFocus={() => track(DashboardEvent.FOCUSED_CATEGORY_NAME)}
          />
          {knownLanguages.map((lang) => {
            const isTranslating = translatingLangs.has(lang);
            return (
              <FormFieldUnderline
                key={lang}
                label={LANGUAGE_NAMES[lang] || lang}
                value={categoryTranslations[lang]?.name || ""}
                onChange={(v) => handleTranslationChange(lang, v)}
                placeholder={t.namePlaceholder}
                isLoading={isLoading}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => handleTranslateSection(lang)}
                    disabled={isTranslating || !name.trim()}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                  >
                    {isTranslating ? tAi("translating") : tAi("translate")}
                    {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  </button>
                }
              />
            );
          })}
        </form>

        <div className="flex items-center justify-between mt-6">
          {isEdit ? (
            isLoading ? (
              <span className="text-sm font-medium inline-block w-14 bg-muted rounded animate-pulse">&nbsp;</span>
            ) : (
              <button
                type="button"
                onClick={() => { track(DashboardEvent.CLICKED_DELETE_CATEGORY); setShowDeleteDialog(true); }}
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
              form="category-form-dialog"
              disabled={saving || deleting}
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

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0">
        <PageHeader title={isEdit ? t.editCategory : t.addCategory} backHref="/dashboard">
          <Button
            type="submit"
            form="category-form"
            disabled={saving || deleting || !hasChanges}
            variant="default"
            size="sm"
            className={!hasChanges ? "opacity-40" : ""}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t.save}
          </Button>
        </PageHeader>
      </div>

      <form id="category-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
        <DashboardContent innerClassName="space-y-6">
          {formContent}
          {pageDeleteButton}
        </DashboardContent>
      </form>

      {dialogs}
    </div>
  );
}
