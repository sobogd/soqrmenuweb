"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowUp,
  ArrowDown,
  Plus,
  ArrowUpDown,
  Loader2,
  Check,
  ChevronRight,
  Eye,
  Shield,
  Activity,
  MousePointerClick,
  Send,
  Search,
  KeyRound,
  Save,
  UtensilsCrossed,
  Wand2,
  Share2,
  Palette,
  Phone,
  Languages,
  Banknote,
  BarChart3,
  CalendarDays,
  Armchair,
  CreditCard,
  ClipboardList,
  HelpCircle,
  Home,
  LogOut,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { MenuPreviewModal } from "@/components/menu-preview-modal";
import { toast } from "sonner";
import { useDashboard, PAGE_PATHS, type PageKey } from "../_context/dashboard-context";
import { Link, useRouter } from "@/i18n/routing";
import type { Category } from "@/types";
import { formatPrice } from "@/lib/currencies";
import { track, DashboardEvent } from "@/lib/dashboard-events";

const navSections: { key: string; page: PageKey; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "menu", page: "menu", icon: UtensilsCrossed },
  { key: "appearance", page: "appearance", icon: Palette },
  { key: "contacts", page: "contacts", icon: Phone },
  { key: "settings", page: "settings", icon: Languages },
  { key: "currency", page: "currency", icon: Banknote },
  { key: "qrMenu", page: "qrMenu", icon: Share2 },
  { key: "analytics", page: "analytics", icon: BarChart3 },
  { key: "tables", page: "tables", icon: Armchair },
  { key: "reservations", page: "reservations", icon: CalendarDays },
  { key: "orders", page: "orders", icon: ClipboardList },
  { key: "billing", page: "billing", icon: CreditCard },
];

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

interface HubPageProps {
  initialItems: ItemWithTranslations[];
  initialCategories: Category[];
  initialCurrency: string;
  restaurantName: string;
  slug: string | null;
  isAdmin?: boolean;
}

export function HubPage({ initialItems, initialCategories, initialCurrency, restaurantName, slug, isAdmin }: HubPageProps) {
  const { translations, scanUsage, isAnonymous } = useDashboard();
  const tHome = useTranslations("dashboard.home");
  const tPages = useTranslations("dashboard.pages");
  const router = useRouter();
  const tItems = translations.items;
  const tMenu = translations.menu;

  const [items, setItems] = useState<ItemWithTranslations[]>(initialItems);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [currency] = useState(initialCurrency);
  const [sortMode, setSortMode] = useState(false);
  const [moving, setMoving] = useState<{ id: string; direction: "up" | "down" } | null>(null);

  useEffect(() => {
    track(DashboardEvent.SHOWED_MENU);
  }, []);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const hasOnlyDemoItems = items.length === 0 || items.every((i) => i.isDemo);

  const navEventMap: Record<string, DashboardEvent> = {
    menu: DashboardEvent.CLICKED_NAV_MENU,
    appearance: DashboardEvent.CLICKED_NAV_DESIGN,
    contacts: DashboardEvent.CLICKED_NAV_CONTACTS,
    settings: DashboardEvent.CLICKED_NAV_SETTINGS,
    currency: DashboardEvent.CLICKED_NAV_DESIGN,
    qrMenu: DashboardEvent.CLICKED_NAV_QR,
    analytics: DashboardEvent.CLICKED_NAV_ANALYTICS,
    tables: DashboardEvent.CLICKED_NAV_TABLES,
    reservations: DashboardEvent.CLICKED_NAV_RESERVATIONS,
    orders: DashboardEvent.CLICKED_NAV_ORDERS,
    billing: DashboardEvent.CLICKED_NAV_BILLING,
  };

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
        track(DashboardEvent.ERROR_TOGGLE, { page: "menu", entity: "item" });
        toast.error(tItems.updateError);
      } else {
        toast.success(newActive ? `${itemName} ${tItems.enabled}` : `${itemName} ${tItems.disabled}`);
      }
    } catch {
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, isActive: currentActive } : i)));
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

      const categoryOrder = newSorted.map((cat, index) => ({ id: cat.id, sortOrder: index }));

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
      {/* Header */}
      <header className="shrink-0 border-b border-border px-6 bg-muted/30 backdrop-blur-lg">
        <div className="flex items-center py-3 max-w-lg mx-auto">
          <div className="flex items-center justify-center h-10 w-10 -ml-2">
            <Home className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold flex-1 ml-3 truncate">{translations.pages.home}</h1>
          <button
            onClick={() => { track(DashboardEvent.CLICKED_HELP); router.push(PAGE_PATHS.support); }}
            className="flex items-center justify-center h-10 w-10 -mr-2"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 pt-4 pb-6">
        <div className="max-w-lg mx-auto flex flex-col gap-4">

          {/* View menu */}
          {!sortMode && slug && items.length > 0 && (
            <MenuPreviewModal menuUrl={`/m/${slug}`}>
              <button
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(to right, hsl(9,100%,58%), #f59e0b)" }}
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
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
              >
                <Save className="h-4 w-4" />
                {tHome("saveMenu")}
              </button>
            </Link>
          )}

          {/* Scan menu button — only when user has no own items */}
          {!sortMode && hasOnlyDemoItems && (
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

          {/* Navigation card */}
          {!sortMode && (
            <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
              {navSections.map((item, index) => (
                <button
                  key={item.key}
                  onClick={() => { track(navEventMap[item.key]); router.push(PAGE_PATHS[item.page]); }}
                  className={`flex items-center gap-3 w-full h-11 px-4 hover:bg-muted/50 transition-colors ${
                    index > 0 ? "border-t border-border/50" : ""
                  }`}
                >
                  <item.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium flex-1 text-left">{tPages(item.page)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Logout */}
          {!sortMode && (
            <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
              <button
                onClick={() => { track(DashboardEvent.CLICKED_LOGOUT); router.push("/logout"); }}
                className="flex items-center gap-3 w-full h-11 px-4 hover:bg-muted/50 transition-colors"
              >
                <LogOut className="h-5 w-5 text-red-400 shrink-0" />
                <span className="text-sm font-medium text-red-400 flex-1 text-left">{translations.logout}</span>
              </button>
            </div>
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
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium flex-1 text-left">{label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
