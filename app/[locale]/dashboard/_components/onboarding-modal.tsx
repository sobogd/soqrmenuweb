"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  Loader2, Check, Upload, Wand2, Moon, Sun, Flame, Layers,
  ArrowLeft, QrCode, ExternalLink, Search, Globe, DollarSign, Store, ChevronRight,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CURRENCIES } from "@/lib/currencies";
import { LANGUAGE_NAMES } from "../_lib/constants";

export interface OnboardingData {
  restaurantId: string;
  categoryId: string;
  categoryName: string;
  initialCurrency: string;
  initialLanguage: string;
  menuSlug: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

const PRESET_STYLES: { key: string; icon: React.ElementType; gradient: string; iconClass?: string }[] = [
  { key: "dark",    icon: Moon,   gradient: "from-slate-800 to-slate-950" },
  { key: "light",   icon: Sun,    gradient: "from-amber-100 to-stone-200", iconClass: "text-amber-800" },
  { key: "warm",    icon: Flame,  gradient: "from-amber-600 to-orange-800" },
  { key: "pattern", icon: Layers, gradient: "from-zinc-700 to-zinc-900" },
];

const ALL_LANGUAGES = Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({ code, name }));

export function OnboardingModal({ data }: { data: OnboardingData }) {
  const t = useTranslations("onboarding");
  const router = useRouter();

  const [step, setStep] = useState<Step>(() => {
    if (typeof window === "undefined") return 1;
    const saved = parseInt(localStorage.getItem("onboarding_step") ?? "1", 10);
    return (saved >= 1 && saved <= 4 ? saved : 1) as Step;
  });
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Step 1
  const [restaurantName, setRestaurantName] = useState("");
  const [currency, setCurrency] = useState(data.initialCurrency);
  const [language, setLanguage] = useState(data.initialLanguage);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");

  // Step 2
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [generatingPreset, setGeneratingPreset] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3
  const [categoryName, setCategoryName] = useState(data.categoryName);
  const [dishName, setDishName] = useState("");
  const [dishPrice, setDishPrice] = useState("");

  // Step 4
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");

  const menuUrl = data.menuSlug ? `https://iq-rest.com/m/${data.menuSlug}` : "";
  const selectedCurrency = CURRENCIES.find((c) => c.code === currency);
  const filteredCurrencies = currencySearch.trim()
    ? CURRENCIES.filter((c) =>
        c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
        c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
        c.symbol.toLowerCase().includes(currencySearch.toLowerCase())
      )
    : CURRENCIES;

  function goToStep(s: Step) {
    localStorage.setItem("onboarding_step", String(s));
    setStep(s);
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleStep1Next() {
    if (!restaurantName.trim()) { setValidationError(t("step1.nameRequired")); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: restaurantName.trim(), currency, defaultLanguage: language, languages: [language] }),
      });
      if (!res.ok) throw new Error();
      goToStep(2);
    } catch { setValidationError(t("saveError")); }
    finally { setSaving(false); }
  }

  async function handleGeneratePreset(style: string) {
    setGeneratingPreset(style);
    try {
      const res = await fetch("/api/onboarding/generate-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style }),
      });
      if (res.ok) { const d = await res.json(); setBackgroundUrl(d.url); }
      else setValidationError(t("step2.generateError"));
    } catch { setValidationError(t("step2.generateError")); }
    finally { setGeneratingPreset(null); }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) { const d = await res.json(); setBackgroundUrl(d.url); }
      else setValidationError(t("step2.uploadError"));
    } catch { setValidationError(t("step2.uploadError")); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }

  async function handleStep2Next() {
    if (backgroundUrl) {
      setSaving(true);
      try {
        await fetch("/api/restaurant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: backgroundUrl }),
        });
      } catch { /* non-critical */ }
      finally { setSaving(false); }
    }
    goToStep(3);
  }

  async function handleStep3Create() {
    if (!dishName.trim()) { setValidationError(t("step3.nameRequired")); return; }
    const priceNum = parseFloat(dishPrice.replace(",", "."));
    if (!dishPrice.trim() || isNaN(priceNum) || priceNum < 0) { setValidationError(t("step3.priceRequired")); return; }
    setSaving(true);
    try {
      if (categoryName.trim() && categoryName.trim() !== data.categoryName) {
        await fetch(`/api/categories/${data.categoryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: categoryName.trim() }),
        });
      }
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: dishName.trim(), price: priceNum, categoryId: data.categoryId }),
      });
      if (!res.ok) throw new Error();
      goToStep(4);
    } catch { setValidationError(t("saveError")); }
    finally { setSaving(false); }
  }

  async function handleStep4(skip = false) {
    setSaving(true);
    try {
      if (!skip && (phone.trim() || instagram.trim())) {
        await fetch("/api/restaurant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phone.trim() || null, instagram: instagram.trim() || null }),
        });
      }
      await fetch("/api/onboarding/complete", { method: "POST" });
      localStorage.removeItem("onboarding_step");
      goToStep(5);
    } catch { setValidationError(t("saveError")); }
    finally { setSaving(false); }
  }

  // ── Step titles ──────────────────────────────────────────────────────────
  const stepTitles: Record<Step, string> = {
    1: t("step1.title"),
    2: t("step2.title"),
    3: t("step3.title"),
    4: t("step4.title"),
    5: t("step5.title"),
  };

  return (
    <>
      {/* ── Main onboarding dialog ── */}
      <Dialog open onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-[434px] max-h-[90vh] overflow-y-auto [&>button]:hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {step > 1 && step < 5 && (
            <button
              onClick={() => goToStep((step - 1) as Step)}
              className="-ml-1 -mt-1 mb-1 flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-foreground transition-colors rounded-md"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          <DialogTitle className="text-2xl font-bold pr-6">{stepTitles[step]}</DialogTitle>
          <DialogDescription className="sr-only">{stepTitles[step]}</DialogDescription>
          {step === 1 && <p className="text-base text-muted-foreground -mt-3">{t("step1.setupText")}</p>}

          {step < 5 && (
            <div className="flex gap-1.5 -mx-6 px-6 mt-1">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          )}

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="-mx-6 mt-4">
              {/* Restaurant name row */}
              <div className="border-t border-border/60">
                <div className="flex items-center gap-2 px-6 py-3">
                  <Store className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
                  <span className="text-sm shrink-0">{t("step1.nameLabel")}</span>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleStep1Next()}
                    placeholder={t("step1.namePlaceholder")}
                    autoFocus
                    className="flex-1 text-sm bg-transparent outline-none text-right placeholder:text-primary/60"
                  />
                </div>
              </div>

              {/* Language row → picker */}
              <div className="border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowLangPicker(true)}
                  className="flex items-center gap-2 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50"
                >
                  <Globe className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1">{t("step1.languageLabel")}</span>
                  <span className="text-sm text-muted-foreground">{LANGUAGE_NAMES[language] ?? language}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 ml-1" />
                </button>
              </div>

              {/* Currency row → picker */}
              <div className="border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowCurrencyPicker(true)}
                  className="flex items-center gap-2 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50"
                >
                  <DollarSign className="h-[18px] w-[18px] text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1">{t("step1.currencyLabel")}</span>
                  <span className="text-sm text-muted-foreground">
                    {selectedCurrency ? `${selectedCurrency.symbol} ${selectedCurrency.code}` : currency}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 ml-1" />
                </button>
              </div>

              <div className="border-t border-border/60 px-6 pt-6 flex items-end justify-between gap-8">
                <p className="text-sm text-muted-foreground">{t("step1.autoDetected")}</p>
                <button
                  onClick={handleStep1Next}
                  disabled={saving}
                  className="shrink-0 flex items-center gap-2 px-4 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("step1.next")}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="-mx-6 mt-4">
              {/* Background preview */}
              {backgroundUrl && (
                <div className="mx-6 mb-4 relative rounded-xl overflow-hidden h-28">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={backgroundUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center px-4 gap-1.5">
                    <Check className="h-3.5 w-3.5 text-white shrink-0" />
                    <span className="text-xs text-white font-medium">{t("step2.selected")}</span>
                  </div>
                </div>
              )}

              {/* Upload */}
              <div className="border-t border-border/60">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !!generatingPreset}
                  className="flex items-center gap-3 px-6 py-3.5 w-full text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl shrink-0 bg-gradient-to-br from-sky-400 to-blue-600">
                    {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Upload className="h-5 w-5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t("step2.uploadOwn")}</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{t("step2.uploadOwnSubtitle")}</p>
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
              </div>

              {/* AI presets */}
              {PRESET_STYLES.map(({ key, icon: Icon, gradient, iconClass }) => {
                const isGenerating = generatingPreset === key;
                return (
                  <div key={key} className="border-t border-border/60">
                    <button
                      onClick={() => handleGeneratePreset(key)}
                      disabled={!!generatingPreset || uploading}
                      className="flex items-center gap-3 px-6 py-3.5 w-full text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                    >
                      <div className={`flex items-center justify-center h-10 w-10 rounded-xl shrink-0 bg-gradient-to-br ${gradient}`}>
                        {isGenerating
                          ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                          : <Icon className={`h-5 w-5 ${iconClass ?? "text-white"}`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{t(`step2.presets.${key}`)}</p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {isGenerating ? t("step2.generating") : t("step2.generateSubtitle")}
                        </p>
                      </div>
                      {!isGenerating && <Wand2 className="h-4 w-4 text-muted-foreground/30 shrink-0" />}
                    </button>
                  </div>
                );
              })}

              <div className="border-t border-border/60 px-6 pt-4">
                <button
                  onClick={handleStep2Next}
                  disabled={saving || !!generatingPreset || uploading}
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {backgroundUrl ? t("step2.next") : t("step2.skip")}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="-mx-6 mt-4">
              <p className="px-6 pb-3 text-sm text-muted-foreground">{t("step3.motivation")}</p>

              {/* Category name row */}
              <div className="border-t border-border/60">
                <div className="flex items-center gap-3 px-6 py-3">
                  <span className="text-sm text-muted-foreground w-20 shrink-0">{t("step3.categoryLabel")}</span>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder={t("step3.categoryPlaceholder")}
                    className="flex-1 text-sm font-medium bg-transparent outline-none text-right placeholder:text-muted-foreground/40 placeholder:font-normal"
                  />
                </div>
              </div>

              {/* Dish name row */}
              <div className="border-t border-border/60">
                <div className="flex items-center gap-3 px-6 py-3">
                  <span className="text-sm text-muted-foreground w-20 shrink-0">{t("step3.dishNameLabel")}</span>
                  <input
                    type="text"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    placeholder={t("step3.dishNamePlaceholder")}
                    autoFocus
                    className="flex-1 text-sm font-medium bg-transparent outline-none text-right placeholder:text-primary/60 placeholder:font-normal"
                  />
                </div>
              </div>

              {/* Price row */}
              <div className="border-t border-border/60">
                <div className="flex items-center gap-3 px-6 py-3">
                  <span className="text-sm text-muted-foreground w-20 shrink-0">{t("step3.priceLabel")}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={dishPrice}
                    onChange={(e) => setDishPrice(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 text-sm font-medium bg-transparent outline-none text-right placeholder:text-muted-foreground/40 placeholder:font-normal"
                  />
                </div>
              </div>

              <div className="border-t border-border/60 px-6 pt-4">
                <button
                  onClick={handleStep3Create}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("step3.createMenu")}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4 ── */}
          {step === 4 && (
            <div className="-mx-6 mt-4">
              <p className="px-6 pb-3 text-sm text-muted-foreground">{t("step4.subtitle")}</p>

              {/* Phone row */}
              <div className="border-t border-border/60">
                <div className="flex items-center gap-3 px-6 py-3">
                  <span className="text-sm text-muted-foreground w-20 shrink-0">{t("step4.phoneLabel")}</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("step4.phonePlaceholder")}
                    className="flex-1 text-sm font-medium bg-transparent outline-none text-right placeholder:text-muted-foreground/40 placeholder:font-normal"
                  />
                </div>
              </div>

              {/* Instagram row */}
              <div className="border-t border-border/60">
                <div className="flex items-center gap-3 px-6 py-3">
                  <span className="text-sm text-muted-foreground w-20 shrink-0">{t("step4.instagramLabel")}</span>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder={t("step4.instagramPlaceholder")}
                    className="flex-1 text-sm font-medium bg-transparent outline-none text-right placeholder:text-muted-foreground/40 placeholder:font-normal"
                  />
                </div>
              </div>

              <div className="border-t border-border/60 px-6 pt-4 flex flex-col gap-3">
                <button
                  onClick={() => handleStep4(false)}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("step4.next")}
                </button>
                <button
                  onClick={() => handleStep4(true)}
                  disabled={saving}
                  className="flex items-center justify-center w-full h-9 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {t("step4.skip")}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5 ── */}
          {step === 5 && (
            <div className="-mx-6 mt-4">
              <div className="flex flex-col items-center gap-4 px-6 pb-2">
                <div className="text-5xl">🎉</div>
                <p className="text-sm text-muted-foreground text-center">{t("step5.subtitle")}</p>
                {menuUrl && (
                  <div className="p-4 bg-white rounded-2xl shadow-md">
                    <QRCodeSVG value={menuUrl} size={160} bgColor="#ffffff" fgColor="#000000" level="M" />
                  </div>
                )}
              </div>

              <div className="border-t border-border/60 px-6 pt-4 flex flex-col gap-2.5">
                {menuUrl && (
                  <a
                    href={menuUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-semibold hover:bg-green-500/15 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t("step5.viewMenu")}
                  </a>
                )}
                <button
                  onClick={() => router.refresh()}
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <QrCode className="h-4 w-4" />
                  {t("step5.goToDashboard")}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Language picker ── */}
      <Dialog open={showLangPicker} onOpenChange={setShowLangPicker}>
        <DialogContent className="sm:max-w-[384px] max-h-[75vh] flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogTitle className="text-lg font-semibold pr-6">{t("step1.languageLabel")}</DialogTitle>
          <DialogDescription className="sr-only">{t("step1.languageLabel")}</DialogDescription>
          <div className="-mx-6 mt-2 overflow-y-auto flex-1">
            {ALL_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => { setLanguage(lang.code); setShowLangPicker(false); }}
                className="flex items-center gap-3 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50"
              >
                <span className="text-sm flex-1">{lang.name}</span>
                {language === lang.code && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Currency picker ── */}
      <Dialog open={showCurrencyPicker} onOpenChange={(open) => { setShowCurrencyPicker(open); if (!open) setCurrencySearch(""); }}>
        <DialogContent className="sm:max-w-[384px] max-h-[75vh] flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogTitle className="text-lg font-semibold pr-6">{t("step1.currencyLabel")}</DialogTitle>
          <DialogDescription className="sr-only">{t("step1.currencyLabel")}</DialogDescription>
          <div className="flex items-center gap-3 -mx-6 px-6 py-2 border-b border-border/60">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={currencySearch}
              onChange={(e) => setCurrencySearch(e.target.value)}
              placeholder="Search…"
              autoFocus
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40"
            />
          </div>
          <div className="-mx-6 overflow-y-auto flex-1">
            {filteredCurrencies.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => { setCurrency(c.code); setCurrencySearch(""); setShowCurrencyPicker(false); }}
                className="flex items-center gap-3 px-6 py-3 w-full text-left transition-colors hover:bg-muted/50"
              >
                <span className="w-6 text-xs font-semibold text-muted-foreground shrink-0">{c.symbol}</span>
                <span className="text-sm flex-1">{c.name}</span>
                {currency === c.code && <Check className="h-4 w-4 text-primary shrink-0" />}
                <span className="text-xs text-muted-foreground/60 shrink-0">{c.code}</span>
              </button>
            ))}
            {filteredCurrencies.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground/60">
                <Search className="h-5 w-5" />
                <p className="text-sm">No results</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Validation error ── */}
      <Dialog open={!!validationError} onOpenChange={(open) => { if (!open) setValidationError(null); }}>
        <DialogContent className="sm:max-w-[384px] [&>button]:hidden">
          <DialogDescription className="sr-only">{validationError}</DialogDescription>
          <div className="flex flex-col gap-4">
            <DialogTitle className="text-lg font-semibold">{validationError}</DialogTitle>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="flex items-center gap-2 px-4 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
