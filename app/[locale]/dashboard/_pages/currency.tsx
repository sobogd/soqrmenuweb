"use client";

import { useState, useMemo } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useDashboard } from "../_context/dashboard-context";
import { PageHeader } from "../_ui/page-header";
import { track, DashboardEvent } from "@/lib/dashboard-events";
import { CURRENCIES } from "@/lib/currencies";
import { DashboardContent } from "../_ui/dashboard-content";
import { toast } from "sonner";

interface CurrencyPageProps {
  initialCurrency: string;
}

export function CurrencyPage({ initialCurrency }: CurrencyPageProps) {
  const t = useTranslations("dashboard.design");
  const router = useRouter();
  const { translations } = useDashboard();

  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState(initialCurrency);
  const [originalCurrency] = useState(initialCurrency);

  const hasChanges = useMemo(() => currency !== originalCurrency, [currency, originalCurrency]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency }),
      });
      if (res.ok) {
        toast.success(t("saved"));
        router.push("/dashboard");
      } else {
        const data = await res.json();
        toast.error(data.error || t("saveError"));
      }
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0">
        <PageHeader title={translations.pages.currency}>
          <Button
            type="submit"
            form="currency-form"
            disabled={saving || !hasChanges}
            variant="default"
            size="sm"
            className={!hasChanges ? "opacity-40" : ""}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
          </Button>
        </PageHeader>
      </div>
      <form id="currency-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
        <DashboardContent innerClassName="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground px-4 mb-1.5">{t("currency")}</p>
            <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
              <div className="flex items-center h-11 px-4">
                <label htmlFor="currency" className="text-sm text-muted-foreground shrink-0 mr-3">{t("currency")}</label>
                <div className="relative flex-1 flex justify-end">
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => { track(DashboardEvent.CHANGED_CURRENCY); setCurrency(e.target.value); }}
                    className="appearance-none bg-transparent text-sm text-right pr-5 cursor-pointer focus:outline-none"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </DashboardContent>
      </form>
    </div>
  );
}
