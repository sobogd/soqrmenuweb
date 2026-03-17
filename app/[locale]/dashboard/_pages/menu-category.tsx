"use client";

import { useState, useMemo } from "react";
import {
  ArrowUp,
  ArrowDown,
  Plus,
  ArrowUpDown,
  Loader2,
  X,
  ArrowLeft,
  ChevronRight,
  Check,
  Pencil,
  UtensilsCrossed,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useDashboard } from "../_context/dashboard-context";
import { useRouter } from "@/i18n/routing";
import type { Category } from "@/types";
import { formatPrice } from "@/lib/currencies";
import { DashboardContent } from "../_ui/dashboard-content";

interface ItemWithTranslations {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  allergens: string[];
  sortOrder: number;
  isActive: boolean;
  isDemo: boolean;
  categoryId: string;
  category: Pick<Category, "id" | "name" | "sortOrder">;
}

interface MenuCategoryPageProps {
  categoryId: string;
  categoryName: string;
  initialItems: ItemWithTranslations[];
  currency: string;
}

export function MenuCategoryPage({ categoryId, categoryName, initialItems, currency }: MenuCategoryPageProps) {
  const { translations } = useDashboard();
  const router = useRouter();
  const tItems = translations.items;
  const tMenu = translations.menu;
  const tCategories = translations.categories;

  const [items, setItems] = useState<ItemWithTranslations[]>(initialItems);
  const [sortMode, setSortMode] = useState(false);
  const [originalOrder, setOriginalOrder] = useState<ItemWithTranslations[]>([]);
  const [savingSort, setSavingSort] = useState(false);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder),
    [items]
  );

  const showSortButton = items.length > 1;

  function handleStartSortMode() {
    setOriginalOrder([...items]);
    setSortMode(true);
  }

  function handleCancelSortMode() {
    setItems(originalOrder);
    setSortMode(false);
  }

  function handleMoveItem(itemId: string, direction: "up" | "down") {
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIndex = sorted.findIndex((i) => i.id === itemId);
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const newSorted = [...sorted];
    [newSorted[currentIndex], newSorted[swapIndex]] = [newSorted[swapIndex], newSorted[currentIndex]];

    setItems(
      newSorted.map((i, index) => ({ ...i, sortOrder: index }))
    );
  }

  async function handleSaveSortOrder() {
    setSavingSort(true);
    try {
      const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
      const itemOrder = sorted.map((i, index) => ({ id: i.id, sortOrder: index }));

      const res = await fetch("/api/items/reorder-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, items: itemOrder }),
      });

      if (res.ok) {
        toast.success(tItems.sortSaved);
        setSortMode(false);
      } else {
        toast.error(tItems.sortError);
      }
    } catch {
      toast.error(tItems.sortError);
    } finally {
      setSavingSort(false);
    }
  }

  async function handleToggleItemActive(itemId: string, currentActive: boolean, itemName: string) {
    const newActive = !currentActive;
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, isActive: newActive } : i)));

    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, isActive: currentActive } : i)));
        toast.error(tItems.updateError);
      } else {
        toast.success(newActive ? `${itemName} ${tItems.enabled}` : `${itemName} ${tItems.disabled}`);
      }
    } catch {
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, isActive: currentActive } : i)));
      toast.error(tItems.updateError);
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
          <h1 className="text-xl font-semibold flex-1 ml-3 truncate">{categoryName}</h1>
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
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <UtensilsCrossed className="h-5 w-5 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground/60">{tMenu.noItems}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
              {sortedItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 ${index > 0 ? "border-t border-border/50" : ""}`}
                >
                  <div
                    onClick={() => {
                      if (!sortMode) router.push(`/dashboard/menu/${categoryId}/${item.id}`);
                    }}
                    className={`flex items-center flex-1 min-w-0 h-11 px-4 transition-colors ${
                      sortMode ? "" : "hover:bg-muted/50 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Switch hidden but functionality preserved */}
                      {item.isDemo && <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground/60 uppercase shrink-0">{tMenu.sampleBadge}</span>}
                      <span className="text-sm font-medium truncate">{item.name}</span>
                    </div>
                    {!sortMode && (
                      item.isDemo
                        ? <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 ml-1" />
                        : <span className="text-sm text-muted-foreground ml-2 shrink-0">{formatPrice(item.price, currency)}</span>
                    )}
                  </div>

                  {sortMode && (
                    <div className="flex items-center gap-0.5 pr-2">
                      <button
                        onClick={() => handleMoveItem(item.id, "up")}
                        disabled={index === 0 || savingSort}
                        className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleMoveItem(item.id, "down")}
                        disabled={index === sortedItems.length - 1 || savingSort}
                        className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
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
              {savingSort ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" />{tItems.saveSort}</>}
            </button>
          ) : (
            <div className="flex flex-col gap-4">
              <button
                onClick={() => router.push(`/dashboard/menu/${categoryId}/add`)}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(to right, hsl(9,100%,58%), #f59e0b)" }}
              >
                <Plus className="h-4 w-4" />
                {tMenu.addItem}
              </button>
              <button
                onClick={() => router.push(`/dashboard/categories/${categoryId}`)}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-border bg-muted/30 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                {tCategories.editCategory}
              </button>
            </div>
          )}
        </DashboardContent>
      </div>
    </div>
  );
}
