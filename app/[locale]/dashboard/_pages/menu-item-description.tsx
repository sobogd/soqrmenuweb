"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useDashboard } from "../_context/dashboard-context";
import { PageHeader } from "../_ui/page-header";
import { DashboardContent } from "../_ui/dashboard-content";
import type { MenuItemDraft } from "./menu-item-form";

function getDraftKey(categoryId: string, itemId?: string) {
  return `draft:menu-item:${categoryId}:${itemId || "new"}`;
}

interface MenuItemDescriptionPageProps {
  categoryId: string;
  itemId?: string;
}

export function MenuItemDescriptionPage({ categoryId, itemId }: MenuItemDescriptionPageProps) {
  const { translations } = useDashboard();
  const router = useRouter();
  const t = translations.items;
  const draftKey = getDraftKey(categoryId, itemId);

  const [description, setDescription] = useState("");
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const draftJson = sessionStorage.getItem(draftKey);
    if (draftJson) {
      const draft: MenuItemDraft = JSON.parse(draftJson);
      setDescription(draft.description || "");
      setHasDraft(true);
    } else {
      router.back();
    }
  }, []);

  // Sync description to draft on every change
  useEffect(() => {
    if (!hasDraft) return;
    const draftJson = sessionStorage.getItem(draftKey);
    if (draftJson) {
      const draft: MenuItemDraft = JSON.parse(draftJson);
      draft.description = description;
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    }
  }, [description]);

  if (!hasDraft) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0">
        <PageHeader title={t.description} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
        <DashboardContent>
          <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descriptionPlaceholder}
              rows={6}
              autoFocus
              className="w-full px-4 py-3 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/30 resize-none"
            />
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
