"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "../_v2/icons";
import { PageHeader } from "../_v2/ui";
import { LogoutLink } from "./logout-link";
import { DashboardEvent, track } from "@/lib/dashboard-events";

const CARDS: { href: string; titleKey: string; descKey: string }[] = [
 { href: "/dashboard/settings/about", titleKey: "about", descKey: "aboutDesc" },
 { href: "/dashboard/settings/contacts", titleKey: "contacts", descKey: "contactsDesc" },
 { href: "/dashboard/settings/branding", titleKey: "branding", descKey: "brandingDesc" },
 { href: "/dashboard/settings/general", titleKey: "general", descKey: "generalDesc" },
 { href: "/dashboard/settings/tables", titleKey: "tables", descKey: "tablesDesc" },
 { href: "/dashboard/settings/orders", titleKey: "orders", descKey: "ordersDesc" },
 { href: "/dashboard/settings/bookings", titleKey: "bookings", descKey: "bookingsDesc" },
 { href: "/dashboard/settings/languages", titleKey: "languages", descKey: "languagesDesc" },
 { href: "/dashboard/settings/billing", titleKey: "billing", descKey: "billingDesc" },
 { href: "/dashboard/settings/support", titleKey: "support", descKey: "supportDesc" },
];

export default function SettingsHubPage() {
 const t = useTranslations("dashboard.settingsHub");
 const [isAdmin, setIsAdmin] = useState(false);

 useEffect(() => {
 track(DashboardEvent.SHOWED_SETTINGS);
 fetch("/api/auth/check")
 .then((r) => (r.ok ? r.json() : null))
 .then((data) => setIsAdmin(!!data?.isAdmin))
 .catch(() => {});
 }, []);

 return (
 <div className="max-w-2xl mx-auto">
 <PageHeader title={t("title")} subtitle={t("subtitle")} />
 <div className="space-y-2.5">
 {CARDS.map((card) => (
 <Link
 key={card.href}
 href={card.href}
 onClick={() => track(DashboardEvent.CLICKED_SETTINGS_ROW, { row: card.href })}
 className="w-full text-left p-4 bg-card border border-border rounded-xl transition-colors flex items-center justify-between gap-3"
 >
 <div className="min-w-0">
 <div className="text-sm font-medium text-foreground">{t(`rows.${card.titleKey}` as never)}</div>
 <div className="text-xs text-muted-foreground leading-snug mt-0.5">{t(`rows.${card.descKey}` as never)}</div>
 </div>
 <ChevronRightIcon size={16} className="text-muted-foreground shrink-0" />
 </Link>
 ))}
 {isAdmin ? (
 <>
 <Link
 href="/dashboard/settings/admin/companies"
 onClick={() => track(DashboardEvent.CLICKED_SETTINGS_ROW, { row: "/dashboard/settings/admin/companies" })}
 className="w-full text-left p-4 bg-card border border-border rounded-xl transition-colors flex items-center justify-between gap-3"
 >
 <div className="min-w-0">
 <div className="text-sm font-medium text-foreground">{t("rows.companies")}</div>
 <div className="text-xs text-muted-foreground leading-snug mt-0.5">
 {t("rows.companiesDesc")}
 </div>
 </div>
 <ChevronRightIcon size={16} className="text-muted-foreground shrink-0" />
 </Link>
 <Link
 href="/dashboard/settings/admin/sessions"
 onClick={() => track(DashboardEvent.CLICKED_SETTINGS_ROW, { row: "/dashboard/settings/admin/sessions" })}
 className="w-full text-left p-4 bg-card border border-border rounded-xl transition-colors flex items-center justify-between gap-3"
 >
 <div className="min-w-0">
 <div className="text-sm font-medium text-foreground">{t("rows.sessions")}</div>
 <div className="text-xs text-muted-foreground leading-snug mt-0.5">
 {t("rows.sessionsDesc")}
 </div>
 </div>
 <ChevronRightIcon size={16} className="text-muted-foreground shrink-0" />
 </Link>
 </>
 ) : null}
 <LogoutLink />
 </div>
 </div>
 );
}
