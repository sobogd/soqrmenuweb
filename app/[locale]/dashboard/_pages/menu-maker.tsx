"use client";

import { useState, useMemo } from "react";
import {
  ArrowUp,
  ArrowDown,
  Plus,
  ArrowUpDown,
  Loader2,
  X,
  ChevronRight,
  ArrowLeft,
  Wand2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useDashboard } from "../_context/dashboard-context";
import { useRouter } from "@/i18n/routing";
import type { Category } from "@/types";
import { DashboardContent } from "../_ui/dashboard-content";
import { track, DashboardEvent } from "@/lib/dashboard-events";

interface MenuMakerPageProps {
  initialCategories: Category[];
  itemCounts: Record<string, number>;
  hasOnlyDemoItems: boolean;
}

export function MenuMakerPage({ initialCategories, itemCounts, hasOnlyDemoItems }: MenuMakerPageProps) {
  const { translations } = useDashboard();
  const router = useRouter();
  const tMenu = translations.menu;
  const tCategories = translations.categories;

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [sortMode, setSortMode] = useState(false);
  const [originalOrder, setOriginalOrder] = useState<Category[]>([]);
  const [savingSort, setSavingSort] = useState(false);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const showSortButton = categories.length > 1;

  function handleStartSortMode() {
    setOriginalOrder([...categories]);
    setSortMode(true);
  }

  function handleCancelSortMode() {
    setCategories(originalOrder);
    setSortMode(false);
  }

  function handleMoveCategory(categoryId: string, direction: "up" | "down") {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIndex = sorted.findIndex((c) => c.id === categoryId);
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const newSorted = [...sorted];
    [newSorted[currentIndex], newSorted[swapIndex]] = [newSorted[swapIndex], newSorted[currentIndex]];

    setCategories(
      newSorted.map((c, index) => ({ ...c, sortOrder: index }))
    );
  }

  async function handleSaveSortOrder() {
    setSavingSort(true);
    try {
      const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
      const categoryOrder = sorted.map((cat, index) => ({ id: cat.id, sortOrder: index }));

      const res = await fetch("/api/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: categoryOrder }),
      });

      if (res.ok) {
        toast.success(tCategories.sortSaved);
        setSortMode(false);
      } else {
        toast.error(tCategories.sortError);
      }
    } catch {
      toast.error(tCategories.sortError);
    } finally {
      setSavingSort(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="shrink-0 border-b border-border px-6 bg-muted/30 backdrop-blur-lg">
        <div className="flex items-center py-3 max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center h-10 w-10 -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold flex-1 ml-3 truncate">{translations.pages.menu}</h1>
          {showSortButton && (
            sortMode ? (
              <button
                onClick={handleCancelSortMode}
                disabled={savingSort}
                className="flex items-center justify-center h-10 w-10 -mr-2"
              >
                <X className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={handleStartSortMode}
                className="flex items-center justify-center h-10 w-10 -mr-2"
              >
                <ArrowUpDown className="h-5 w-5" />
              </button>
            )
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 pt-4 pb-6">
        <DashboardContent innerClassName="flex flex-col gap-4">
          {/* Scan menu button — only when user has no own items */}
          {hasOnlyDemoItems && (
            <button
              onClick={() => { track(DashboardEvent.CLICKED_SCAN_MENU); router.push("/dashboard/scan"); }}
              className="flex items-center gap-3 w-full rounded-xl border border-border bg-muted/30 p-4 hover:bg-muted/50 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-xl shrink-0" style={{ background: "linear-gradient(to bottom right, hsl(9,100%,58%), #f59e0b)" }}>
                <Wand2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{tMenu.scanButton}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{tMenu.scanDescription}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
            </button>
          )}

          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-muted-foreground text-center">{tCategories.noCategories}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
              {sortedCategories.map((category, index) => (
                <div
                  key={category.id}
                  className={index > 0 ? "border-t border-border/50" : ""}
                >
                  <div
                    onClick={() => {
                      if (!sortMode) router.push(`/dashboard/menu/${category.id}`);
                    }}
                    className={`flex items-center gap-2 px-4 h-12 transition-colors ${
                      sortMode ? "" : "cursor-pointer hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      {category.isDemo && <span className="mr-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground/60 uppercase shrink-0">{tMenu.sampleBadge}</span>}
                      <span className="text-sm font-medium truncate">{category.name}</span>
                      <span className="text-xs text-muted-foreground/60 ml-2 shrink-0">
                        {itemCounts[category.id] || 0}
                      </span>
                    </div>
                    {sortMode ? (
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleMoveCategory(category.id, "up")}
                          disabled={index === 0 || savingSort}
                          className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-30"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMoveCategory(category.id, "down")}
                          disabled={index === sortedCategories.length - 1 || savingSort}
                          className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-30"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {sortMode ? (
            <button
              onClick={handleSaveSortOrder}
              disabled={savingSort}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: "linear-gradient(to right, hsl(9,100%,58%), #f59e0b)" }}
            >
              {savingSort ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" />{tCategories.saveSort}</>}
            </button>
          ) : (
            <button
              onClick={() => router.push("/dashboard/categories/add")}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(to right, hsl(9,100%,58%), #f59e0b)" }}
            >
              <Plus className="h-4 w-4" />
              {tMenu.addCategory}
            </button>
          )}
        </DashboardContent>
      </div>
    </div>
  );
}
