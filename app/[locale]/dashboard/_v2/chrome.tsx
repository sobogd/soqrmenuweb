"use client";

import { useEffect, useRef, ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
 CalendarIcon,
 ChartIcon,
 FlameIcon,
 GridIcon,
 ReceiptIcon,
 SettingsIcon,
} from "./icons";
import { RestaurantProvider } from "./restaurant-context";
import type { Restaurant, TabId } from "./types";
import { DashboardEvent, track } from "@/lib/dashboard-events";

const NAV_EVENT: Record<TabId, DashboardEvent> = {
 menu: DashboardEvent.CLICKED_NAV_MENU,
 reservations: DashboardEvent.CLICKED_NAV_RESERVATIONS,
 orders: DashboardEvent.CLICKED_NAV_ORDERS,
 kitchen: DashboardEvent.CLICKED_NAV_KITCHEN,
 analytics: DashboardEvent.CLICKED_NAV_ANALYTICS,
 settings: DashboardEvent.CLICKED_NAV_SETTINGS,
};

interface NavTab {
 id: TabId;
 label: string;
 href: string;
 icon: React.ComponentType<{ size?: number; className?: string }>;
}

const KITCHEN_ENABLED = process.env.NEXT_PUBLIC_KITCHEN === "TRUE";

const NAV_TABS: NavTab[] = [
 { id: "menu", label: "Menu", href: "/dashboard", icon: GridIcon },
 { id: "reservations", label: "Bookings", href: "/dashboard/reservations", icon: CalendarIcon },
 { id: "orders", label: "Orders", href: "/dashboard/orders", icon: ReceiptIcon },
 ...(KITCHEN_ENABLED
 ? [{ id: "kitchen" as TabId, label: "Kitchen", href: "/dashboard/kitchen", icon: FlameIcon }]
 : []),
 { id: "analytics", label: "Analytics", href: "/dashboard/analytics", icon: ChartIcon },
 { id: "settings", label: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
];

// Match a pathname (locale-aware: /en/dashboard/...) to a tab id.
function getActiveTab(pathname: string): TabId {
 // Strip locale prefix: /en/dashboard/foo → /dashboard/foo
 const stripped = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
 if (stripped.startsWith("/dashboard/reservations")) return "reservations";
 if (stripped.startsWith("/dashboard/orders")) return "orders";
 if (stripped.startsWith("/dashboard/kitchen")) return "kitchen";
 if (stripped.startsWith("/dashboard/analytics")) return "analytics";
 if (stripped.startsWith("/dashboard/settings")) return "settings";
 // Menu sub-routes (categories, items, options) are part of the menu tab.
 return "menu";
}

export function DashboardChrome({
 restaurant,
 children,
}: {
 restaurant: Restaurant;
 children: ReactNode;
}) {
 // Always-on vertical scrollbar prevents layout shift on collapse/expand.
 useEffect(() => {
 const prev = document.documentElement.style.overflowY;
 document.documentElement.style.overflowY = "scroll";
 return () => {
 document.documentElement.style.overflowY = prev;
 };
 }, []);

 const pathname = usePathname();
 const activeTab = getActiveTab(pathname || "/dashboard");

 return (
 <RestaurantProvider restaurant={restaurant}>
 <div className="min-h-screen bg-secondary antialiased tracking-tight">
 <TopBar restaurant={restaurant} activeTab={activeTab} />
 <main className="px-4 md:px-6 py-5 md:py-4 pb-24 md:pb-10">{children}</main>
 <BottomNav activeTab={activeTab} />
 </div>
 </RestaurantProvider>
 );
}

function TopBar({ restaurant, activeTab }: { restaurant: Restaurant; activeTab: TabId }) {
 const headerRef = useRef<HTMLElement | null>(null);

 useEffect(() => {
 const el = headerRef.current;
 if (!el) return;
 function update() {
 if (!el) return;
 // Hidden via `display: none` on mobile (`hidden md:block`) — offsetParent is null;
 // treat it as 0 so sticky sub-bars sit flush at the top instead of inheriting the
 // desktop fallback height.
 const h = el.offsetParent === null ? 0 : el.getBoundingClientRect().height;
 document.documentElement.style.setProperty("--topbar-h", h + "px");
 }
 update();
 const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
 if (ro) ro.observe(el);
 window.addEventListener("resize", update);
 return () => {
 window.removeEventListener("resize", update);
 ro?.disconnect();
 };
 }, []);

 return (
 <header
 ref={headerRef}
 className="hidden md:block sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border"
 >
 <div className="max-w-5xl mx-auto px-4 md:px-6">
 <div className="flex items-center justify-between gap-3 py-4">
 <h1 className="min-w-0 text-lg font-medium text-foreground truncate">
 {restaurant.name || "Untitled restaurant"}
 </h1>
 <nav className="flex items-center gap-1 shrink-0">
 {NAV_TABS.map((tab) => {
 const isActive = activeTab === tab.id;
 const cls = isActive
 ? "bg-foreground text-background"
 : "text-muted-foreground";
 return (
 <Link
 key={tab.id}
 href={tab.href}
 onClick={() => track(NAV_EVENT[tab.id])}
 className={"h-9 px-3 text-sm font-medium rounded-lg transition-colors inline-flex items-center " + cls}
 >
 {tab.label}
 </Link>
 );
 })}
 </nav>
 </div>
 </div>
 </header>
 );
}

function BottomNav({ activeTab }: { activeTab: TabId }) {
 return (
 <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-md border-t border-border">
 <div className="flex items-stretch">
 {NAV_TABS.map((tab) => {
 const isActive = activeTab === tab.id;
 const TabIcon = tab.icon;
 const cls = isActive ? "text-foreground" : "text-muted-foreground";
 return (
 <Link
 key={tab.id}
 href={tab.href}
 onClick={() => track(NAV_EVENT[tab.id])}
 className={"flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors " + cls}
 >
 <TabIcon size={20} />
 <span className="text-[10px] font-medium">{tab.label}</span>
 </Link>
 );
 })}
 </div>
 </nav>
 );
}
