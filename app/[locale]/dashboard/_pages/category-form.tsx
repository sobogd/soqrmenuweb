"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2, Sparkles, Languages } from "lucide-react";
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
import { FormFieldUnderline } from "../_ui/form-field-underline";
import { useRouter } from "@/i18n/routing";
import { track, DashboardEvent } from "@/lib/dashboard-events";
import { LANGUAGE_NAMES } from "../_lib/constants";
import type { Category } from "@/types";

interface CategoryWithTranslations extends Category {
  translations?: Record<string, { name?: string }> | null;
}

interface RestaurantLanguages {
  languages: string[];
  defaultLanguage: string;
}

interface CategoryFormPageProps {
  category?: CategoryWithTranslations;
  restaurant: RestaurantLanguages;
  onSaved: (category: CategoryWithTranslations) => void;
  onDeleted: (id: string) => void;
}

export function CategoryFormPage({ category, restaurant, onSaved, onDeleted }: CategoryFormPageProps) {
  const { translations } = useDashboard();
  const router = useRouter();
  const t = translations.categories;
  const tAi = useTranslations("dashboard.aiTranslate");

  const isEdit = !!category;
  const otherLanguages = useMemo(
    () => restaurant.languages.filter((l) => l !== restaurant.defaultLanguage),
    [restaurant.languages, restaurant.defaultLanguage]
  );

  const initialName = category?.name ?? "";
  const initialTranslations = useMemo(
    () => (category?.translations as Record<string, { name?: string }>) ?? {},
    [category]
  );

  const [name, setName] = useState(initialName);
  const [isActive] = useState(category?.isActive ?? true);
  const [categoryTranslations, setCategoryTranslations] = useState<Record<string, { name?: string }>>(initialTranslations);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [translatingLangs, setTranslatingLangs] = useState<Set<string>>(new Set());
  const [showTranslateLimitDialog, setShowTranslateLimitDialog] = useState(false);
  const [showTranslationDialog, setShowTranslationDialog] = useState(false);
  const [translationDialogLang, setTranslationDialogLang] = useState<string>("");
  const [tempTranslationName, setTempTranslationName] = useState("");

  const hasChanges = useMemo(() => {
    if (!isEdit) return !!name.trim();
    return (
      name !== initialName ||
      JSON.stringify(categoryTranslations) !== JSON.stringify(initialTranslations)
    );
  }, [isEdit, name, categoryTranslations, initialName, initialTranslations]);

  useEffect(() => {
    track(DashboardEvent.SHOWED_CATEGORY_FORM);
  }, []);

  function openTranslationDialog(lang: string) {
    setTranslationDialogLang(lang);
    setTempTranslationName(categoryTranslations[lang]?.name || "");
    setShowTranslationDialog(true);
  }

  async function handleTranslateTemp(lang: string) {
    const srcLang = restaurant.defaultLanguage;
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
        setTempTranslationName(data.translatedText);
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

  function saveTranslation() {
    const lang = translationDialogLang;
    if (!lang) return;
    const trimmed = tempTranslationName.trim();
    setCategoryTranslations((prev) => ({
      ...prev,
      [lang]: trimmed ? { name: trimmed } : {},
    }));
    setShowTranslationDialog(false);
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
        onDeleted(category.id);
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
      const url = isEdit ? `/api/categories/${category!.id}` : "/api/categories";
      const method = isEdit ? "PUT" : "POST";

      const cleanTranslations: Record<string, { name: string }> = {};
      for (const lang of restaurant.languages) {
        if (lang === restaurant.defaultLanguage) continue;
        const trans = categoryTranslations[lang];
        if (trans?.name?.trim()) {
          cleanTranslations[lang] = { name: trans.name.trim() };
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
        const saved = (await res.json()) as CategoryWithTranslations;
        toast.success(isEdit ? t.updated : t.created);
        onSaved(saved);
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

      <Dialog open={showTranslationDialog} onOpenChange={setShowTranslationDialog}>
        <DialogContent className="sm:max-w-[384px]">
          <DialogTitle className="text-lg font-semibold pr-6">{LANGUAGE_NAMES[translationDialogLang] || translationDialogLang}</DialogTitle>
          <DialogDescription className="sr-only">{LANGUAGE_NAMES[translationDialogLang] || translationDialogLang}</DialogDescription>
          <div className="mt-2">
            <FormFieldUnderline
              label={t.name}
              value={tempTranslationName}
              onChange={setTempTranslationName}
              placeholder={t.namePlaceholder}
            />
          </div>
          {(() => {
            const isTranslating = translatingLangs.has(translationDialogLang);
            return (
              <div className="-mx-6 mt-4">
                <button
                  type="button"
                  onClick={() => handleTranslateTemp(translationDialogLang)}
                  disabled={isTranslating || !name.trim()}
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

  return (
    <>
      <DialogTitle className="text-lg font-semibold pr-6">
        {isEdit ? t.editCategory : t.addCategory}
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
          autoFocus
          onFocus={() => track(DashboardEvent.FOCUSED_CATEGORY_NAME)}
        />
        {otherLanguages.length > 0 && (
          <div className="-mx-6 -my-2">
            {otherLanguages.map((lang) => {
              const summary = categoryTranslations[lang]?.name || "";
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
                    <span className="text-sm text-primary">Add</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </form>

      <div className="flex items-center justify-between mt-2">
        {isEdit ? (
          <button
            type="button"
            onClick={() => { track(DashboardEvent.CLICKED_DELETE_CATEGORY); setShowDeleteDialog(true); }}
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
          form="category-form-dialog"
          disabled={saving || deleting || !hasChanges}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}{t.save}
        </button>
      </div>

      {dialogs}
    </>
  );
}
