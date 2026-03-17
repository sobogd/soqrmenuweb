"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { ALLERGENS, type AllergenCode } from "@/lib/allergens";
import { useDashboard } from "../_context/dashboard-context";
import { PageHeader } from "../_ui/page-header";
import { DashboardContent } from "../_ui/dashboard-content";
import type { MenuItemDraft } from "./menu-item-form";

function getDraftKey(categoryId: string, itemId?: string) {
  return `draft:menu-item:${categoryId}:${itemId || "new"}`;
}

interface MenuItemAllergensPageProps {
  categoryId: string;
  itemId?: string;
}

export function MenuItemAllergensPage({ categoryId, itemId }: MenuItemAllergensPageProps) {
  const { translations } = useDashboard();
  const router = useRouter();
  const t = translations.items;
  const draftKey = getDraftKey(categoryId, itemId);

  const [allergens, setAllergens] = useState<string[]>([]);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const draftJson = sessionStorage.getItem(draftKey);
    if (draftJson) {
      const draft: MenuItemDraft = JSON.parse(draftJson);
      setAllergens(draft.allergens || []);
      setHasDraft(true);
    } else {
      router.back();
    }
  }, []);

  // Sync allergens to draft on every change
  useEffect(() => {
    if (!hasDraft) return;
    const draftJson = sessionStorage.getItem(draftKey);
    if (draftJson) {
      const draft: MenuItemDraft = JSON.parse(draftJson);
      draft.allergens = allergens;
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [allergens]);

  function handleToggle(code: string) {
    setAllergens((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  if (!hasDraft) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0">
        <PageHeader title={t.allergens} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
        <DashboardContent innerClassName="space-y-2">
          <p className="text-xs text-muted-foreground/60 px-4 mb-1">{t.allergensHint}</p>
          <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
            {ALLERGENS.map((allergen, i) => {
              const isSelected = allergens.includes(allergen.code);
              return (
                <div key={allergen.code}>
                  {i > 0 && <div className="border-t border-border mx-4" />}
                  <button
                    type="button"
                    onClick={() => handleToggle(allergen.code)}
                    className="flex items-center w-full h-11 px-4"
                  >
                    <span className="text-base leading-none mr-3">{allergen.icon}</span>
                    <span className="text-sm flex-1 text-left">
                      {(t.allergenNames as Record<AllergenCode, string>)[allergen.code] || allergen.code}
                    </span>
                    <span className={`h-2 w-2 rounded-full shrink-0 ${isSelected ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity mt-4"
            style={{ background: "linear-gradient(to right, hsl(9,100%,58%), #f59e0b)" }}
          >
            <Check className="h-4 w-4" />
            {t.save}
          </button>
        </DashboardContent>
      </div>
    </div>
  );
}
