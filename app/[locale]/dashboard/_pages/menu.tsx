"use client";

import { useState, useMemo, useEffect } from "react";
import { useBlockBack } from "../_hooks/use-back-intercept";
import { useTranslations } from "next-intl";
import { ArrowUp, ArrowDown, Plus, ArrowUpDown, Loader2, Check, ChevronRight, Menu as MenuIcon, Eye, Shield, Activity, MousePointerClick, Send, Search, KeyRound, Save, Wand2, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { MenuPreviewModal } from "@/components/menu-preview-modal";
import { toast } from "sonner";
import { useDashboard } from "../_context/dashboard-context";
import { DashboardNavHeader, DashboardNavSidebar, DashboardNavItems } from "../_components/dashboard-nav";
import { Link, useRouter } from "@/i18n/routing";
import type { Category } from "@/types";
import { formatPrice } from "@/lib/currencies";
import { track, DashboardEvent } from "@/lib/dashboard-events";
import { CategoryFormPage } from "./category-form";
import { ItemFormPage } from "./item-form";

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
  translations?: Record<string, { name?: string; description?: string }> | null;
  category: Pick<Category, "id" | "name" | "sortOrder">;
}

interface CategoryWithTranslations extends Category {
  translations?: Record<string, { name?: string }> | null;
}

interface RestaurantLanguages {
  languages: string[];
  defaultLanguage: string;
  accentColor: string | null;
}

interface MenuPageProps {
  initialItems: ItemWithTranslations[];
  initialCategories: CategoryWithTranslations[];
  initialCurrency: string;
  restaurantName: string;
  slug: string | null;
  isAdmin?: boolean;
  restaurantLanguages: RestaurantLanguages;
}

export function MenuPage({ initialItems, initialCategories, initialCurrency, restaurantName, slug, isAdmin, restaurantLanguages }: MenuPageProps) {
  useBlockBack();
  const { translations, scanUsage, isAnonymous } = useDashboard();
  const tHome = useTranslations("dashboard.home");
  const router = useRouter();
  const tItems = translations.items;
  const tCategories = translations.categories;
  const tMenu = translations.menu;
  const pageTitle = translations.pages.menu;

  const [items, setItems] = useState<ItemWithTranslations[]>(initialItems);
  const [categories, setCategories] = useState<CategoryWithTranslations[]>(initialCategories);
  const [currency] = useState(initialCurrency);
  const [sortMode, setSortMode] = useState(false);
  const [moving, setMoving] = useState<{ id: string; direction: "up" | "down" } | null>(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [categorySheetId, setCategorySheetId] = useState<string | undefined>(undefined);
  const [itemSheetOpen, setItemSheetOpen] = useState(false);
  const [itemSheetId, setItemSheetId] = useState<string | undefined>(undefined);
  const [itemSheetCategoryId, setItemSheetCategoryId] = useState<string | undefined>(undefined);
  const [itemFormDirty, setItemFormDirty] = useState(false);
  const [showItemCloseConfirm, setShowItemCloseConfirm] = useState(false);
  const [categoryFormDirty, setCategoryFormDirty] = useState(false);
  const [showCategoryCloseConfirm, setShowCategoryCloseConfirm] = useState(false);
  const [fillingDemo, setFillingDemo] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  async function handleFillDemo() {
    setFillingDemo(true);
    try {
      const res = await fetch("/api/demo-menu", { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        toast.error(tMenu.demoError);
        setFillingDemo(false);
      }
    } catch {
      toast.error(tMenu.demoError);
      setFillingDemo(false);
    }
  }

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  function openCategorySheet(id?: string) {
    setCategorySheetId(id);
    setCategorySheetOpen(true);
  }

  function handleCategorySaved(saved: CategoryWithTranslations) {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      return exists
        ? prev.map((c) => (c.id === saved.id ? saved : c))
        : [...prev, saved];
    });
    setCategorySheetOpen(false);
  }

  function handleCategoryDeleted(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setItems((prev) => prev.filter((i) => i.categoryId !== id));
    setCategorySheetOpen(false);
  }

  function openItemSheet(id?: string, categoryId?: string) {
    setItemSheetId(id);
    setItemSheetCategoryId(categoryId);
    setItemSheetOpen(true);
  }

  function handleItemSaved(saved: ItemWithTranslations) {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === saved.id);
      return exists
        ? prev.map((i) => (i.id === saved.id ? saved : i))
        : [...prev, saved];
    });
    setItemSheetOpen(false);
  }

  function handleItemDeleted(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setItemSheetOpen(false);
  }

  useEffect(() => {
    track(DashboardEvent.SHOWED_MENU);
  }, []);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  async function handleToggleItemActive(
    itemId: string,
    currentActive: boolean,
    itemName: string
  ) {
    const newActive = !currentActive;

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isActive: newActive } : i))
    );

    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, isActive: currentActive } : i))
        );
        track(DashboardEvent.ERROR_TOGGLE, { page: "menu", entity: "item" });
        toast.error(tItems.updateError);
      } else {
        toast.success(newActive ? `${itemName} ${tItems.enabled}` : `${itemName} ${tItems.disabled}`);
      }
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, isActive: currentActive } : i))
      );
      track(DashboardEvent.ERROR_TOGGLE, { page: "menu", entity: "item" });
      toast.error(tItems.updateError);
    }
  }

  async function handleMoveCategory(categoryId: string, direction: "up" | "down") {
    track(DashboardEvent.SORTED_CATEGORY);
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIndex = sorted.findIndex((c) => c.id === categoryId);
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const current = sorted[currentIndex];
    const swap = sorted[swapIndex];

    setMoving({ id: categoryId, direction });

    try {
      const newSorted = sorted.map((c) => {
        if (c.id === current.id) return { ...c, sortOrder: swap.sortOrder };
        if (c.id === swap.id) return { ...c, sortOrder: current.sortOrder };
        return c;
      }).sort((a, b) => a.sortOrder - b.sortOrder);

      const categoryOrder = newSorted.map((cat, index) => ({
        id: cat.id,
        sortOrder: index,
      }));

      const res = await fetch("/api/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: categoryOrder }),
      });

      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => {
            if (c.id === current.id) return { ...c, sortOrder: swap.sortOrder };
            if (c.id === swap.id) return { ...c, sortOrder: current.sortOrder };
            return c;
          })
        );
      } else {
        track(DashboardEvent.ERROR_SORT, { page: "menu", entity: "category" });
        toast.error(tItems.sortError);
      }
    } catch {
      track(DashboardEvent.ERROR_SORT, { page: "menu", entity: "category" });
      toast.error(tItems.sortError);
    } finally {
      setMoving(null);
    }
  }

  async function handleMoveItem(itemId: string, direction: "up" | "down") {
    track(DashboardEvent.SORTED_ITEM);
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const categoryItems = items
      .filter((i) => i.categoryId === item.categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const currentIndex = categoryItems.findIndex((i) => i.id === itemId);
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (swapIndex < 0 || swapIndex >= categoryItems.length) return;

    const swapItem = categoryItems[swapIndex];

    setMoving({ id: itemId, direction });

    try {
      const newItems = items.map((i) => {
        if (i.id === itemId) return { ...i, sortOrder: swapItem.sortOrder };
        if (i.id === swapItem.id) return { ...i, sortOrder: item.sortOrder };
        return i;
      });

      const newCategoryItems = newItems
        .filter((i) => i.categoryId === item.categoryId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i, index) => ({ id: i.id, sortOrder: index }));

      const res = await fetch("/api/items/reorder-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: item.categoryId, items: newCategoryItems }),
      });

      if (res.ok) {
        setItems(newItems);
      } else {
        track(DashboardEvent.ERROR_SORT, { page: "menu", entity: "item" });
        toast.error(tItems.sortError);
      }
    } catch {
      track(DashboardEvent.ERROR_SORT, { page: "menu", entity: "item" });
      toast.error(tItems.sortError);
    } finally {
      setMoving(null);
    }
  }

  const showSortButton = categories.length > 1 || items.length > 1;

  return (
    <div className="flex flex-col h-full">
      {/* Custom header */}
      <header className="shrink-0 border-b border-border px-6 bg-background/80 backdrop-blur-lg">
        <div className="flex items-center py-3 max-w-lg md:max-w-none md:w-[45rem] mx-auto md:gap-4">
          <DashboardNavHeader />
          {/* Mobile: burger menu */}
          <Popover modal>
            <PopoverTrigger asChild>
              <button
                onClick={() => track(DashboardEvent.CLICKED_HAMBURGER_MENU)}
                className="flex items-center justify-center h-10 w-10 -ml-2 md:hidden"
              >
                <MenuIcon className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0 w-56 rounded-xl bg-popover overflow-hidden">
              <DashboardNavItems excludePages={["menu"]} />
            </PopoverContent>
          </Popover>
          {/* Right part: title + sort */}
          <h1 className="text-xl font-semibold flex-1 ml-3 md:ml-0 truncate">{tMenu.yourMenu}</h1>
          {showSortButton && (
            sortMode ? (
              <button
                onClick={() => setSortMode(false)}
                className="flex items-center justify-center h-10 w-10 -mr-2"
              >
                <Check className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={() => { track(DashboardEvent.CLICKED_SORT_MENU); setSortMode(true); }}
                className="flex items-center justify-center h-10 w-10 -mr-2"
              >
                <ArrowUpDown className="h-5 w-5" />
              </button>
            )
          )}
        </div>
      </header>

      {/* Content */}
      <div className="relative flex-1 overflow-auto px-6 pt-4 pb-6">
        <div className="max-w-lg md:max-w-none md:w-[45rem] mx-auto md:flex md:gap-4 min-h-full">
          <DashboardNavSidebar />
          <div className="flex-1 min-w-0 flex flex-col gap-4 min-h-full">
          {/* View menu */}
          {slug && items.length > 0 && (
            <MenuPreviewModal menuUrl={`/m/${slug}`}>
              <button
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium hover:bg-green-500/15 transition-colors"
                onClick={() => track(DashboardEvent.CLICKED_VIEW_MENU)}
              >
                <Eye className="h-4 w-4" />
                {tHome("viewMenu")}
              </button>
            </MenuPreviewModal>
          )}

          {/* Save (anonymous) */}
          {!sortMode && isAnonymous && items.length > 0 && (
            <Link href="/dashboard/save" onClick={() => track(DashboardEvent.CLICKED_SAVE_MENU)}>
              <button
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-white text-sm font-medium shadow-md hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
              >
                <Save className="h-4 w-4" />
                {tHome("saveMenu")}
              </button>
            </Link>
          )}

          {/* Admin shortcuts */}
          {!sortMode && isAdmin && (
            <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
              {([
                { path: "/dashboard/admin", icon: Shield, label: "Companies" },
                { path: "/dashboard/admin/analytics", icon: Activity, label: "Analytics" },
                { path: "/dashboard/sessions", icon: MousePointerClick, label: "Sessions" },
                { path: "/dashboard/keywords", icon: KeyRound, label: "Keywords" },
                { path: "/dashboard/search-terms", icon: Search, label: "Search Terms" },
                { path: "/dashboard/google-ads", icon: Send, label: "Google Ads" },
              ]).map(({ path, icon: Icon, label }, index) => (
                <button
                  key={path}
                  onClick={() => router.push(path)}
                  className={`flex items-center gap-3 w-full h-11 px-4 hover:bg-muted/50 transition-colors ${
                    index > 0 ? "border-t border-border/50" : ""
                  }`}
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium flex-1 text-left">{label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                </button>
              ))}
            </div>
          )}

        {(
          <div className="flex flex-col gap-4">
            {items.length === 0 && !sortMode && (
              <>
                <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                  <button
                    onClick={() => { track(DashboardEvent.CLICKED_SCAN_MENU); router.push("/dashboard/scan"); }}
                    className="flex items-center gap-3 w-full px-4 py-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl shrink-0" style={{ background: "linear-gradient(to bottom right, hsl(9,100%,58%), #f59e0b)" }}>
                      <Wand2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tMenu.onboarding.scanTitle}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{tMenu.onboarding.scanSubtitle}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                  </button>
                  <button
                    onClick={handleFillDemo}
                    disabled={fillingDemo}
                    className="flex items-center gap-3 w-full px-4 py-4 border-t border-border/50 hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl shrink-0" style={{ background: "linear-gradient(to bottom right, #6366f1, #a855f7)" }}>
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tMenu.demoButton}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{tMenu.demoSubtitle}</p>
                    </div>
                    {fillingDemo ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                    )}
                  </button>
                  <button
                    onClick={() => setManualMode(true)}
                    className="flex items-center gap-3 w-full px-4 py-4 border-t border-border/50 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl shrink-0" style={{ background: "linear-gradient(to bottom right, #10b981, #059669)" }}>
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tMenu.manualTitle}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{tMenu.manualSubtitle}</p>
                    </div>
                    {manualMode ? (
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                    )}
                  </button>
                </div>

                {manualMode && (() => {
                  const step1Done = categories.length >= 1;
                  const step2Done = items.length > 0;
                  const step2Active = step1Done && !step2Done;
                  return (
                    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                      <button
                        onClick={() => { track(DashboardEvent.CLICKED_ADD_CATEGORY); openCategorySheet(); }}
                        disabled={step1Done}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/50 transition-colors text-left disabled:opacity-60 disabled:cursor-default disabled:hover:bg-transparent"
                      >
                        <div className={`flex items-center justify-center h-7 w-7 rounded-full shrink-0 text-xs font-semibold ${step1Done ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-primary text-primary-foreground"}`}>
                          {step1Done ? <Check className="h-4 w-4" /> : "1"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{tMenu.onboarding.step1Title}</p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{tMenu.onboarding.step1Subtitle}</p>
                        </div>
                        {!step1Done && <ChevronRight className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                      <button
                        onClick={() => { if (!step2Active) return; track(DashboardEvent.CLICKED_ADD_ITEM); openItemSheet(undefined, categories[0]?.id); }}
                        disabled={!step2Active}
                        className="flex items-center gap-3 w-full px-4 py-3 border-t border-border/50 hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-default disabled:hover:bg-transparent"
                      >
                        <div className={`flex items-center justify-center h-7 w-7 rounded-full shrink-0 text-xs font-semibold ${step2Active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          2
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{tMenu.onboarding.step2Title}</p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{tMenu.onboarding.step2Subtitle}</p>
                        </div>
                        {step2Active && <ChevronRight className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                      <div className="flex items-center gap-3 w-full px-4 py-3 border-t border-border/50 opacity-50">
                        <div className="flex items-center justify-center h-7 w-7 rounded-full shrink-0 text-xs font-semibold bg-muted text-muted-foreground">3</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{tMenu.onboarding.step3Title}</p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{tMenu.onboarding.step3Subtitle}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
            {items.length > 0 && (
            <div className="flex flex-col gap-4">
              {sortedCategories.map((category, catIndex) => {
                const categoryItems = items
                  .filter((i) => i.categoryId === category.id)
                  .sort((a, b) => a.sortOrder - b.sortOrder);

                return (
                  <div key={category.id} className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                    {/* Category header */}
                    <div
                      onClick={() => { if (!sortMode) { track(DashboardEvent.CLICKED_CATEGORY_ROW); openCategorySheet(category.id); } }}
                      className={`flex items-center gap-2 px-4 h-11 bg-muted/50 transition-colors ${
                        sortMode ? "" : "cursor-pointer hover:bg-muted/70"
                      }`}
                    >
                      {sortMode && (
                        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleMoveCategory(category.id, "up")}
                            disabled={catIndex === 0 || !!moving}
                            className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-30"
                          >
                            {moving && moving.id === category.id && moving.direction === "up" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ArrowUp className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleMoveCategory(category.id, "down")}
                            disabled={catIndex === sortedCategories.length - 1 || !!moving}
                            className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-30"
                          >
                            {moving && moving.id === category.id && moving.direction === "down" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ArrowDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      )}
                      <div className={`flex items-center flex-1 min-w-0 ${sortMode ? "ml-2" : ""}`}>
                        <span className="flex-1 text-[0.8125rem] font-semibold uppercase tracking-wider text-muted-foreground truncate">{category.name}</span>
                        {!sortMode && <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 -mr-2" />}
                      </div>
                    </div>

                    {/* Items */}
                    <div>
                      {categoryItems.length === 0 && !sortMode && (
                        <div className="py-1.5">
                          <div className="flex items-center justify-center w-full h-11 px-4 text-center">
                            <p className="text-sm font-medium text-muted-foreground/80">{tMenu.noItemsInCategory}</p>
                          </div>
                        </div>
                      )}
                      {categoryItems.length > 0 && (
                      <div className="py-1.5">
                      {categoryItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 border-t border-border/50 first:border-t-0"
                        >
                          <div
                            onClick={() => { if (!sortMode) { track(DashboardEvent.CLICKED_ITEM_ROW); openItemSheet(item.id); } }}
                            className={`flex items-center flex-1 min-w-0 h-11 px-4 transition-colors ${
                              sortMode ? "" : "hover:bg-muted/50 cursor-pointer"
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {!sortMode && (
                                <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                                  <Switch
                                    checked={item.isActive}
                                    onCheckedChange={() => {
                                      track(DashboardEvent.TOGGLED_MENU_ITEM_ACTIVE);
                                      handleToggleItemActive(item.id, item.isActive, item.name);
                                    }}
                                  />
                                </div>
                              )}
                              <span className="text-sm font-medium truncate">{item.name}</span>
                            </div>

                            {!sortMode && (
                              <div className="flex items-center gap-2 ml-2 -mr-2">
                                <span className="text-sm text-muted-foreground">
                                  {formatPrice(item.price, currency)}
                                </span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                              </div>
                            )}
                          </div>

                          {sortMode && (
                            <div className="flex items-center gap-0.5 pr-2">
                              <button
                                onClick={() => handleMoveItem(item.id, "up")}
                                disabled={index === 0 || !!moving}
                                className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-30"
                              >
                                {moving && moving.id === item.id && moving.direction === "up" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ArrowUp className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleMoveItem(item.id, "down")}
                                disabled={index === categoryItems.length - 1 || !!moving}
                                className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-30"
                              >
                                {moving && moving.id === item.id && moving.direction === "down" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ArrowDown className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      </div>
                      )}
                      {!sortMode && (
                        <button
                          onClick={() => { track(DashboardEvent.CLICKED_ADD_ITEM); openItemSheet(undefined, category.id); }}
                          className="flex items-center justify-center gap-2 w-full h-11 px-4 border-t border-border/50 bg-muted/50 text-sm font-medium text-primary hover:bg-muted/70 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          {tMenu.addItem}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            {items.length > 0 && !sortMode && (
              <button
                onClick={() => { track(DashboardEvent.CLICKED_ADD_CATEGORY); openCategorySheet(); }}
                className="flex items-center justify-center gap-1 w-full h-11 -mt-2 text-primary text-sm font-medium hover:text-primary/80 transition-colors mb-24"
              >
                <Plus className="h-3.5 w-3.5" />
                {tMenu.addCategory}
              </button>
            )}
          </div>
        )}
        </div>{/* end Main content column */}
        </div>{/* end flex container */}
      </div>

      <Dialog
        open={categorySheetOpen}
        onOpenChange={(open) => {
          if (open) { setCategorySheetOpen(true); return; }
          if (categoryFormDirty) { setShowCategoryCloseConfirm(true); return; }
          setCategorySheetOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-[434px]" onOpenAutoFocus={(e) => e.preventDefault()}>
          <CategoryFormPage
            key={`${categorySheetOpen}-${categorySheetId}`}
            category={categorySheetId ? categories.find((c) => c.id === categorySheetId) : undefined}
            restaurant={restaurantLanguages}
            onSaved={handleCategorySaved}
            onDeleted={handleCategoryDeleted}
            onDirtyChange={setCategoryFormDirty}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showCategoryCloseConfirm} onOpenChange={setShowCategoryCloseConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-lg font-semibold pr-6">{tCategories.unsavedChanges}</DialogTitle>
          <DialogDescription className="sr-only">{tCategories.unsavedChanges}</DialogDescription>
          <div className="flex items-center justify-end gap-6 mt-4">
            <button
              type="button"
              onClick={() => { setShowCategoryCloseConfirm(false); setCategoryFormDirty(false); setCategorySheetOpen(false); }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {tCategories.discard}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCategoryCloseConfirm(false);
                const formEl = document.getElementById("category-form-dialog") as HTMLFormElement | null;
                formEl?.requestSubmit();
              }}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {tCategories.save}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={itemSheetOpen}
        onOpenChange={(open) => {
          if (open) { setItemSheetOpen(true); return; }
          if (itemFormDirty) { setShowItemCloseConfirm(true); return; }
          setItemSheetOpen(false);
        }}
      >
        <DialogContent
          className="sm:max-w-[434px]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ItemFormPage
            key={`${itemSheetOpen}-${itemSheetId}`}
            item={itemSheetId ? items.find((i) => i.id === itemSheetId) : undefined}
            categories={categories}
            restaurant={restaurantLanguages}
            initialCategoryId={itemSheetCategoryId}
            onSaved={handleItemSaved}
            onDeleted={handleItemDeleted}
            onDirtyChange={setItemFormDirty}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showItemCloseConfirm} onOpenChange={setShowItemCloseConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="text-lg font-semibold pr-6">{tItems.unsavedChanges}</DialogTitle>
          <DialogDescription className="sr-only">{tItems.unsavedChanges}</DialogDescription>
          <div className="flex items-center justify-end gap-6 mt-4">
            <button
              type="button"
              onClick={() => { setShowItemCloseConfirm(false); setItemFormDirty(false); setItemSheetOpen(false); }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {tItems.discard}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowItemCloseConfirm(false);
                const formEl = document.getElementById("item-form-dialog") as HTMLFormElement | null;
                formEl?.requestSubmit();
              }}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {tItems.save}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
