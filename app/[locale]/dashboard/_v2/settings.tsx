"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRightIcon, CheckIcon, CopyIcon, SendIcon, SparklesIcon, CloseIcon } from "./icons";
import {
  PageHeader,
  SubpageStickyBar,
  ToggleSwitch,
  uploadFile,
} from "./ui";
import { TablesPage } from "./tables";
import { inputClass, secondaryBtn } from "./tokens";
import { MapPicker } from "@/components/map-picker";
import { slugify } from "./helpers";
import { AVAILABLE_LANGUAGES } from "./i18n";
import {
  fetchSubscriptionStatus,
  createCheckoutSession,
  openBillingPortal,
  fetchSupportMessages,
  sendSupportMessage,
  updateRestaurant,
  updateRestaurantLanguages,
  type ApiSupportMessage,
} from "./api";
import type { Booking, Order, Restaurant, TableEntity } from "./types";

const ACCENT_COLORS = [
  "#A8174E", "#C8102E", "#D55427", "#92684C", "#A8531A", "#D4A017", "#D9C29A", "#6F8246", "#3D7259", "#1F5959",
  "#1F3B57", "#314D8C", "#5B6E80", "#7E5F87", "#5E4734", "#9E866B", "#E8541C", "#3B3B3B", "#000000",
];

const CURRENCIES = [
  { code: "EUR", label: "EUR (€)" },
  { code: "USD", label: "USD ($)" },
  { code: "GBP", label: "GBP (£)" },
  { code: "RUB", label: "RUB (₽)" },
  { code: "UAH", label: "UAH (₴)" },
  { code: "BRL", label: "BRL (R$)" },
  { code: "MXN", label: "MXN ($)" },
  { code: "ARS", label: "ARS ($)" },
  { code: "CLP", label: "CLP ($)" },
  { code: "COP", label: "COP ($)" },
  { code: "TRY", label: "TRY (₺)" },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 150, 180];

const TIME_OPTIONS = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      out.push((h < 10 ? "0" + h : h) + ":" + (m < 10 ? "0" + m : m));
    }
  }
  return out;
})();

type SettingsView =
  | { name: "list" }
  | { name: "about" }
  | { name: "contacts" }
  | { name: "branding" }
  | { name: "general" }
  | { name: "tables" }
  | { name: "orders" }
  | { name: "bookings" }
  | { name: "languages" }
  | { name: "billing" }
  | { name: "support" };

const Divider = () => <div className="border-t border-border my-5" />;

// ── About ──

export function AboutSettingsPage({
  restaurant,
  setRestaurant,
  onBack,
}: {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant>>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState({
    name: restaurant.name,
    subtitle: restaurant.subtitle,
    showTitleOnHomepage: restaurant.showTitleOnHomepage,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const canSave = draft.name.trim().length > 0;

  async function save() {
    if (!canSave) return;
    try {
      await updateRestaurant({
        title: draft.name.trim(),
        subtitle: draft.subtitle.trim() || null,
        hideTitle: !draft.showTitleOnHomepage,
      });
    } catch {
      return;
    }
    setRestaurant((r) => ({
      ...r,
      name: draft.name.trim(),
      subtitle: draft.subtitle.trim(),
      showTitleOnHomepage: draft.showTitleOnHomepage,
    }));
    onBack();
  }

  return (
    <div>
      <SubpageStickyBar onBack={onBack} onSave={save} canSave={canSave} />
      <div className="max-w-2xl mx-auto pt-5 md:pt-8">
        <div className="mb-5">
          <div className="text-xs text-muted-foreground">Settings</div>
          <h2 className="text-xl font-medium text-foreground mt-1">About</h2>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
          <label htmlFor="about-title" className="block text-sm font-medium text-foreground mb-1.5">Title</label>
          <input
            id="about-title"
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Love Eatery"
            className={inputClass}
          />
          <Divider />
          <label htmlFor="about-subtitle" className="block text-sm font-medium text-foreground mb-1.5">Subtitle</label>
          <input
            id="about-subtitle"
            type="text"
            value={draft.subtitle}
            onChange={(e) => setDraft((d) => ({ ...d, subtitle: e.target.value }))}
            placeholder="Love at the first bite"
            className={inputClass}
          />
          <Divider />
          <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
            <div>
              <div className="text-sm font-medium text-foreground">Show title on homepage</div>
              <div className="text-xs text-muted-foreground leading-snug mt-0.5">
                Displayed on the homepage of your public website.
              </div>
            </div>
            <ToggleSwitch
              checked={draft.showTitleOnHomepage}
              onChange={() => setDraft((d) => ({ ...d, showTitleOnHomepage: !d.showTitleOnHomepage }))}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

// ── Contacts ──

export function ContactsSettingsPage({
  restaurant,
  setRestaurant,
  onBack,
}: {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant>>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState({
    contacts: { ...restaurant.contacts },
    location: { ...restaurant.location },
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  async function save() {
    try {
      await updateRestaurant({
        phone: draft.contacts.phone.trim() || null,
        instagram: draft.contacts.instagram.replace(/^@/, "").trim() || null,
        whatsapp: draft.contacts.whatsapp.trim() || null,
        address: draft.location.address.trim() || null,
        x: draft.location.lng !== null ? String(draft.location.lng) : null,
        y: draft.location.lat !== null ? String(draft.location.lat) : null,
      });
    } catch {
      return;
    }
    setRestaurant((r) => ({
      ...r,
      contacts: {
        phone: draft.contacts.phone.trim(),
        instagram: draft.contacts.instagram.replace(/^@/, "").trim(),
        whatsapp: draft.contacts.whatsapp.trim(),
      },
      location: {
        address: draft.location.address.trim(),
        lat: draft.location.lat,
        lng: draft.location.lng,
      },
    }));
    onBack();
  }

  return (
    <div>
      <SubpageStickyBar onBack={onBack} onSave={save} canSave />
      <div className="max-w-2xl mx-auto pt-5 md:pt-8">
        <div className="mb-5">
          <div className="text-xs text-muted-foreground">Settings</div>
          <h2 className="text-xl font-medium text-foreground mt-1">Contacts & location</h2>
        </div>
        {/* Contacts card */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
          <div className="text-sm font-medium text-foreground">Contacts</div>
          <p className="text-xs text-muted-foreground mb-4 mt-0.5 leading-snug">
            Shown on the contacts page of your public menu.
          </p>

          <label htmlFor="con-phone" className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
          <input
            id="con-phone"
            type="tel"
            value={draft.contacts.phone}
            onChange={(e) => setDraft((d) => ({ ...d, contacts: { ...d.contacts, phone: e.target.value } }))}
            placeholder="+34 612 345 678"
            className={inputClass}
          />

          <label htmlFor="con-ig" className="block text-sm font-medium text-foreground mb-1.5 mt-3">Instagram</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">@</span>
            <input
              id="con-ig"
              type="text"
              value={draft.contacts.instagram}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  contacts: { ...d.contacts, instagram: e.target.value.replace(/^@/, "") },
                }))
              }
              placeholder="latrattoria"
              className={inputClass + " pl-7"}
            />
          </div>

          <label htmlFor="con-wa" className="block text-sm font-medium text-foreground mb-1.5 mt-3">WhatsApp</label>
          <input
            id="con-wa"
            type="tel"
            value={draft.contacts.whatsapp}
            onChange={(e) => setDraft((d) => ({ ...d, contacts: { ...d.contacts, whatsapp: e.target.value } }))}
            placeholder="+34 612 345 678"
            className={inputClass}
          />
        </div>

        {/* Location card */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 mt-3">
          <div className="text-sm font-medium text-foreground">Location</div>
          <p className="text-xs text-muted-foreground mb-4 mt-0.5 leading-snug">
            Address and map shown on your public contacts page. Search or tap the map to set the pin.
          </p>

          <div className="rounded-lg overflow-hidden border border-border">
            <MapPicker
              lat={draft.location.lat ?? undefined}
              lng={draft.location.lng ?? undefined}
              onLocationSelect={(lat, lng) =>
                setDraft((d) => ({ ...d, location: { ...d.location, lat, lng } }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Branding ──

export function BrandingSettingsPage({
  restaurant,
  setRestaurant,
  onBack,
}: {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant>>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState({
    backgroundUrl: restaurant.backgroundUrl,
    backgroundType: restaurant.backgroundType,
    accentColor: restaurant.accentColor,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const colorPickerRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  async function save() {
    try {
      await updateRestaurant({
        source: draft.backgroundUrl,
        backgroundType: draft.backgroundType,
        accentColor: draft.accentColor,
      });
    } catch {
      return;
    }
    setRestaurant((r) => ({
      ...r,
      backgroundUrl: draft.backgroundUrl,
      backgroundType: draft.backgroundType,
      accentColor: draft.accentColor,
    }));
    onBack();
  }

  async function handleBackground(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setDraft((d) => ({ ...d, backgroundUrl: url, backgroundType: isVideo ? "video" : "image" }));
    } catch {
      // silent
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeBackground() {
    setDraft((d) => ({ ...d, backgroundUrl: null, backgroundType: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function generateAiBackground() {
    try {
      const res = await fetch("/api/restaurant/generate-background", { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.url) {
        setDraft((d) => ({ ...d, backgroundUrl: data.url, backgroundType: "image" }));
      }
    } catch {
      // silent
    }
  }

  return (
    <div>
      <SubpageStickyBar onBack={onBack} onSave={save} canSave />
      <div className="max-w-2xl mx-auto pt-5 md:pt-8">
        <div className="mb-5">
          <div className="text-xs text-muted-foreground">Settings</div>
          <h2 className="text-xl font-medium text-foreground mt-1">Branding</h2>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="text-sm font-medium text-foreground">Background</div>
            <button
              type="button"
              onClick={generateAiBackground}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <SparklesIcon size={11} />
              Generate with AI
            </button>
          </div>
          <label
            htmlFor="brand-bg"
            className={
              "relative flex items-center justify-center gap-1.5 w-full h-32 border border-dashed rounded-lg cursor-pointer transition-all overflow-hidden " +
              (draft.backgroundUrl
                ? "border-primary p-0"
                : "border-input bg-secondary text-muted-foreground hover:border-primary hover:text-foreground hover:bg-card")
            }
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-input border-t-neutral-900 rounded-full animate-spin" />
            ) : draft.backgroundUrl ? (
              <>
                {draft.backgroundType === "video" ? (
                  <video src={draft.backgroundUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={draft.backgroundUrl} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    removeBackground();
                  }}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  aria-label="Remove background"
                >
                  <CloseIcon size={12} />
                </button>
                {draft.backgroundType === "video" ? (
                  <span className="absolute bottom-2 left-2 inline-flex items-center h-5 px-1.5 text-[10px] font-medium text-white bg-black/50 rounded">
                    VIDEO
                  </span>
                ) : null}
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span className="text-[13px] font-medium">Upload image or video</span>
              </>
            )}
            <input
              id="brand-bg"
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleBackground}
            />
          </label>
          <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
            Shown as the homepage background of your public website.
          </p>

          <Divider />

          <div className="text-sm font-medium text-foreground">Accent color</div>
          <p className="text-xs text-muted-foreground mb-3 mt-0.5 leading-snug">
            Main color for buttons and highlights.
          </p>
          <style>{`
            .accent-grid { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 0.5rem; }
            @media (min-width: 768px) { .accent-grid { grid-template-columns: repeat(20, minmax(0, 1fr)); gap: 0.375rem; } }
          `}</style>
          <div className="accent-grid">
            {ACCENT_COLORS.map((c) => {
              const isSelected = draft.accentColor.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, accentColor: c }))}
                  className={
                    "w-full aspect-square rounded-full transition-all " +
                    (isSelected ? "ring-2 ring-offset-2 ring-primary" : "hover:scale-110")
                  }
                  style={{ backgroundColor: c }}
                  aria-label={"Color " + c}
                />
              );
            })}
            <button
              type="button"
              onClick={() => colorPickerRef.current?.click()}
              className={
                "w-full aspect-square rounded-full transition-all " +
                (!ACCENT_COLORS.some((c) => c.toLowerCase() === draft.accentColor.toLowerCase())
                  ? "ring-2 ring-offset-2 ring-primary"
                  : "hover:scale-110")
              }
              style={{
                background:
                  "conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
              }}
              aria-label="Custom color"
            />
            <input
              ref={colorPickerRef}
              type="color"
              value={draft.accentColor}
              onChange={(e) => setDraft((d) => ({ ...d, accentColor: e.target.value }))}
              className="absolute opacity-0 pointer-events-none w-0 h-0"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── General ──

export function GeneralSettingsPage({
  restaurant,
  setRestaurant,
  onBack,
}: {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant>>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState({
    slug: restaurant.slug || slugify(restaurant.name),
    currency: restaurant.currency,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const validSlug = /^[a-z0-9-]{2,40}$/.test(draft.slug);
  const canSave = validSlug;

  async function save() {
    if (!canSave) return;
    try {
      await updateRestaurant({ slug: draft.slug, currency: draft.currency });
    } catch {
      return;
    }
    setRestaurant((r) => ({
      ...r,
      slug: draft.slug,
      currency: draft.currency,
      menuUrl: "iq-rest.com/m/" + draft.slug,
    }));
    onBack();
  }

  function copyUrl() {
    const fullUrl = "https://iq-rest.com/m/" + draft.slug;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(fullUrl)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        })
        .catch(() => {});
    }
  }

  return (
    <div>
      <SubpageStickyBar onBack={onBack} onSave={save} canSave={canSave} />
      <div className="max-w-2xl mx-auto pt-5 md:pt-8">
        <div className="mb-5">
          <div className="text-xs text-muted-foreground">Settings</div>
          <h2 className="text-xl font-medium text-foreground mt-1">General</h2>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
          <label htmlFor="gen-slug" className="block text-sm font-medium text-foreground mb-1.5">Menu link</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              iq-rest.com/m/
            </span>
            <input
              id="gen-slug"
              type="text"
              value={draft.slug}
              onChange={(e) => setDraft((d) => ({ ...d, slug: slugify(e.target.value) }))}
              placeholder="your-slug"
              className={inputClass + " pr-10"}
              style={{ paddingLeft: "112px" }}
            />
            <button
              type="button"
              onClick={copyUrl}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Copy URL"
              title="Copy URL"
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
            Your unique URL where customers can view your menu.
          </p>
          {!validSlug && draft.slug.length > 0 ? (
            <p className="text-xs text-red-600 mt-1">Use 2–40 lowercase letters, digits, or hyphens.</p>
          ) : null}

          <Divider />

          <label htmlFor="gen-currency" className="block text-sm font-medium text-foreground mb-1.5">Currency</label>
          <select
            id="gen-currency"
            value={draft.currency}
            onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
            className={inputClass}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1.5 leading-snug">Used for prices in your menu.</p>
        </div>
      </div>
    </div>
  );
}

// ── Order settings ──

export function OrderSettingsPage({
  restaurant,
  setRestaurant,
  onBack,
}: {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant>>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(restaurant.orderSettings);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const hasMode = draft.modes.internal || draft.modes.whatsapp;
  const canSave = !draft.acceptOrders || hasMode;

  async function save() {
    if (!canSave) return;
    const orderMode =
      draft.modes.internal && draft.modes.whatsapp
        ? "both"
        : draft.modes.whatsapp
          ? "whatsapp"
          : "internal";
    try {
      await updateRestaurant({
        ordersEnabled: draft.acceptOrders,
        orderMode,
        orderNameEnabled: draft.requiredFields.name,
        orderPhoneEnabled: draft.requiredFields.phone,
        orderAddressEnabled: draft.requiredFields.address,
      });
    } catch {
      return;
    }
    setRestaurant((r) => ({ ...r, orderSettings: draft }));
    onBack();
  }

  const disabled = !draft.acceptOrders;

  return (
    <div>
      <SubpageStickyBar onBack={onBack} onSave={save} canSave={canSave} />
      <div className="max-w-2xl mx-auto pt-5 md:pt-8">
        <div className="mb-5">
          <div className="text-xs text-muted-foreground">Settings</div>
          <h2 className="text-xl font-medium text-foreground mt-1">Orders</h2>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
          <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
            <div>
              <div className="text-sm font-medium text-foreground">Accept orders</div>
              <div className="text-xs text-muted-foreground leading-snug mt-0.5">
                When off, guests can browse the menu but can&apos;t place orders.
              </div>
            </div>
            <ToggleSwitch
              checked={draft.acceptOrders}
              onChange={() => setDraft((d) => ({ ...d, acceptOrders: !d.acceptOrders }))}
            />
          </label>

          <Divider />

          <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
            <div className="text-sm font-medium text-foreground">Order mode</div>
            <p className="text-xs text-muted-foreground mb-4 mt-0.5">
              Internal orders are saved in the dashboard. WhatsApp orders are sent directly to your WhatsApp. You can enable both.
            </p>
            <div className="space-y-2.5">
              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <div className="text-sm text-foreground">Internal</div>
                <ToggleSwitch
                  checked={draft.modes.internal}
                  onChange={() =>
                    setDraft((d) => ({ ...d, modes: { ...d.modes, internal: !d.modes.internal } }))
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <div className="text-sm text-foreground">WhatsApp</div>
                <ToggleSwitch
                  checked={draft.modes.whatsapp}
                  onChange={() =>
                    setDraft((d) => ({ ...d, modes: { ...d.modes, whatsapp: !d.modes.whatsapp } }))
                  }
                />
              </label>
            </div>
            {!hasMode ? <p className="text-xs text-red-600 mt-2">Enable at least one mode.</p> : null}
          </div>

          <Divider />

          <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
            <div className="text-sm font-medium text-foreground">Required fields</div>
            <p className="text-xs text-muted-foreground mb-4 mt-0.5">
              Enabled fields will be required for the customer to fill in when placing an order.
            </p>
            <div className="space-y-2.5">
              {(["name", "phone", "address"] as const).map((key) => (
                <label key={key} className="flex items-center justify-between gap-3 cursor-pointer select-none">
                  <div className="text-sm text-foreground">
                    {key === "name" ? "Name" : key === "phone" ? "Phone" : "Address"}
                  </div>
                  <ToggleSwitch
                    checked={draft.requiredFields[key]}
                    onChange={() =>
                      setDraft((d) => ({
                        ...d,
                        requiredFields: { ...d.requiredFields, [key]: !d.requiredFields[key] },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Booking settings ──

export function BookingSettingsPage({
  restaurant,
  setRestaurant,
  onBack,
}: {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant>>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(restaurant.bookingSettings);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const validHours = draft.workingHours.from < draft.workingHours.to;
  const canSave = !draft.enabled || validHours;

  async function save() {
    if (!canSave) return;
    try {
      await updateRestaurant({
        reservationsEnabled: draft.enabled,
        reservationMode: draft.approval,
        reservationSlotMinutes: draft.duration,
        workingHoursStart: draft.workingHours.from,
        workingHoursEnd: draft.workingHours.to,
      });
    } catch {
      return;
    }
    setRestaurant((r) => ({ ...r, bookingSettings: draft }));
    onBack();
  }

  const disabled = !draft.enabled;

  return (
    <div>
      <SubpageStickyBar onBack={onBack} onSave={save} canSave={canSave} />
      <div className="max-w-2xl mx-auto pt-5 md:pt-8">
        <div className="mb-5">
          <div className="text-xs text-muted-foreground">Settings</div>
          <h2 className="text-xl font-medium text-foreground mt-1">Bookings</h2>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
          <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
            <div>
              <div className="text-sm font-medium text-foreground">Enable bookings</div>
              <div className="text-xs text-muted-foreground leading-snug mt-0.5">
                When off, guests can browse the menu but can&apos;t reserve a table.
              </div>
            </div>
            <ToggleSwitch
              checked={draft.enabled}
              onChange={() => setDraft((d) => ({ ...d, enabled: !d.enabled }))}
            />
          </label>

          <Divider />

          <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
            <div className="text-sm font-medium text-foreground">Confirmation mode</div>
            <p className="text-xs text-muted-foreground mb-4 mt-0.5">
              {draft.approval === "auto"
                ? "Reservations are confirmed automatically."
                : "You will need to manually confirm each reservation."}
            </p>
            <div className="space-y-2.5">
              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <div className="text-sm text-foreground">Automatic</div>
                <ToggleSwitch
                  checked={draft.approval === "auto"}
                  onChange={() => setDraft((d) => ({ ...d, approval: "auto" }))}
                />
              </label>
              <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                <div className="text-sm text-foreground">Manual</div>
                <ToggleSwitch
                  checked={draft.approval === "manual"}
                  onChange={() => setDraft((d) => ({ ...d, approval: "manual" }))}
                />
              </label>
            </div>
          </div>

          <Divider />

          <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">Reservation duration</div>
                <div className="text-xs text-muted-foreground leading-snug mt-0.5">
                  How long a table is held per booking.
                </div>
              </div>
              <select
                value={draft.duration}
                onChange={(e) => setDraft((d) => ({ ...d, duration: parseInt(e.target.value, 10) }))}
                className={inputClass + " w-auto"}
              >
                {DURATION_OPTIONS.map((min) => (
                  <option key={min} value={min}>
                    {min} min
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Divider />

          <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-medium text-foreground">Working hours</div>
                <div className="text-xs text-muted-foreground leading-snug mt-0.5">
                  Reservations can be made within these hours.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={draft.workingHours.from}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, workingHours: { ...d.workingHours, from: e.target.value } }))
                  }
                  className={inputClass + " w-auto tabular-nums"}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground">—</span>
                <select
                  value={draft.workingHours.to}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, workingHours: { ...d.workingHours, to: e.target.value } }))
                  }
                  className={inputClass + " w-auto tabular-nums"}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {!validHours ? (
              <p className="text-xs text-red-600 mt-2">&quot;From&quot; must be earlier than &quot;to&quot;.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Languages ──

export function LanguagesSettingsPage({
  restaurant,
  setRestaurant,
  onBack,
}: {
  restaurant: Restaurant;
  setRestaurant: React.Dispatch<React.SetStateAction<Restaurant>>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState({
    languages: restaurant.languages,
    defaultLang: restaurant.defaultLang,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const canSave = draft.languages.length > 0 && draft.languages.includes(draft.defaultLang) && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateRestaurantLanguages(draft.languages, draft.defaultLang);
      setRestaurant((r) => ({ ...r, languages: draft.languages, defaultLang: draft.defaultLang }));
      // Navigate back. The route wrapper triggers router.refresh on back navigation,
      // so the layout (and any sibling routes) pick up the new default-language swap.
      onBack();
    } catch {
      setSaving(false);
    }
  }

  function toggleLang(code: string) {
    setDraft((d) => {
      const isOn = d.languages.includes(code);
      const next = isOn ? d.languages.filter((c) => c !== code) : [...d.languages, code];
      let nextDefault = d.defaultLang;
      if (isOn && code === d.defaultLang) nextDefault = next[0] || "";
      if (!isOn && next.length === 1) nextDefault = code;
      return { languages: next, defaultLang: nextDefault };
    });
  }

  return (
    <div>
      <SubpageStickyBar onBack={onBack} onSave={save} canSave={canSave}>
        {saving ? (
          <span className="w-3 h-3 border-2 border-input border-t-neutral-900 rounded-full animate-spin" />
        ) : null}
      </SubpageStickyBar>
      <div className="max-w-2xl mx-auto pt-5 md:pt-8">
        <div className="mb-5">
          <div className="text-xs text-muted-foreground">Settings</div>
          <h2 className="text-xl font-medium text-foreground mt-1">Languages</h2>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-0.5">
            <div className="text-sm font-medium text-foreground">Available languages</div>
            {draft.languages.length > 0 ? (
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                {draft.languages.length} selected
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Pick the languages you want for your menu. Tap to add or remove.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_LANGUAGES.map((l) => {
              const isSelected = draft.languages.includes(l.code);
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => toggleLang(l.code)}
                  className={
                    "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors " +
                    (isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground border border-border hover:border-input")
                  }
                >
                  <span className="text-sm leading-none">{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              );
            })}
          </div>
          {draft.languages.length === 0 ? (
            <p className="text-xs text-red-600 mt-2">Pick at least one language.</p>
          ) : null}

          <Divider />

          <label htmlFor="lang-default" className="block text-sm font-medium text-foreground mb-1.5">Default language</label>
          <select
            id="lang-default"
            value={draft.defaultLang}
            onChange={(e) => setDraft((d) => ({ ...d, defaultLang: e.target.value }))}
            disabled={draft.languages.length === 0}
            className={inputClass + " disabled:bg-secondary disabled:text-muted-foreground"}
          >
            {draft.languages.map((code) => {
              const l = AVAILABLE_LANGUAGES.find((x) => x.code === code);
              if (!l) return null;
              return (
                <option key={code} value={code}>
                  {l.flag} {l.label}
                </option>
              );
            })}
          </select>
          <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
            The language you write your menu in first. Other languages are translations of this one.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Billing ──

interface SubStatus {
  plan: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  billingCycle: string | null;
}

export function BillingSettingsPage({ onBack }: { onBack: () => void }) {
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [pendingPlan, setPendingPlan] = useState<{ plan: "BASIC" | "PRO"; cycle: "MONTHLY" | "YEARLY" } | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    fetchSubscriptionStatus().then((s) => setSub(s));
  }, []);

  const isActive = sub?.status === "ACTIVE" && sub.plan !== "FREE";

  async function startCheckout(plan: "BASIC" | "PRO", cycle: "MONTHLY" | "YEARLY") {
    setPendingPlan({ plan, cycle });
    try {
      const url = await createCheckoutSession(plan, cycle);
      if (url) window.location.href = url;
    } finally {
      setPendingPlan(null);
    }
  }

  async function manage() {
    const url = await openBillingPortal();
    if (url) window.location.href = url;
  }

  return (
    <div>
      <SubpageStickyBar onBack={onBack} hideSave />
      <div className="max-w-2xl mx-auto pt-5 md:pt-8">
        <div className="mb-5">
          <div className="text-xs text-muted-foreground">Settings</div>
          <h2 className="text-xl font-medium text-foreground mt-1">Billing</h2>
        </div>

        {isActive && sub ? (
          <div className="bg-card border border-border rounded-2xl p-5 md:p-6 mb-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Active</div>
                <div className="text-base font-medium text-foreground mt-0.5">
                  {sub.plan} · {sub.billingCycle?.toLowerCase() || "—"}
                </div>
                {sub.currentPeriodEnd ? (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Renews on{" "}
                    {new Date(sub.currentPeriodEnd).toLocaleDateString([], {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                ) : null}
              </div>
              <button type="button" onClick={manage} className={secondaryBtn}>
                Manage
              </button>
            </div>
          </div>
        ) : null}

        <div className="text-sm font-medium text-foreground mb-3">
          {isActive ? "Switch plan" : "Choose your plan"}
        </div>

        <style>{`
          .billing-plans { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
          @media (min-width: 600px) { .billing-plans { grid-template-columns: 1fr 1fr; } }
        `}</style>
        <div className="billing-plans">
          {[
            { plan: "BASIC" as const, cycle: "YEARLY" as const, label: "Yearly", priceMonthly: "6.90", periodLabel: "billed yearly", badge: "Save 30%", highlight: true },
            { plan: "BASIC" as const, cycle: "MONTHLY" as const, label: "Monthly", priceMonthly: "9.90", periodLabel: "billed monthly", badge: null, highlight: false },
          ].map((p) => {
            const isCurrent = sub?.plan === p.plan && sub?.billingCycle === p.cycle && isActive;
            return (
              <div
                key={p.plan + p.cycle}
                className={
                  "relative bg-card border rounded-2xl p-5 flex flex-col " +
                  (isCurrent ? "border-emerald-300" : p.highlight ? "border-primary" : "border-border")
                }
              >
                {p.badge && !isCurrent ? (
                  <span className="absolute -top-2 left-5 inline-flex items-center h-5 px-2 text-[10px] font-medium text-primary-foreground bg-primary rounded-full">
                    {p.badge}
                  </span>
                ) : null}
                {isCurrent ? (
                  <span className="absolute -top-2 left-5 inline-flex items-center h-5 px-2 text-[10px] font-medium text-white bg-emerald-600 rounded-full">
                    Current
                  </span>
                ) : null}

                <div className="text-sm font-medium text-foreground">{p.label}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-medium text-foreground tabular-nums">€{p.priceMonthly}</span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.periodLabel}</div>

                <button
                  type="button"
                  onClick={() => startCheckout(p.plan, p.cycle)}
                  disabled={isCurrent || pendingPlan !== null}
                  className={
                    "mt-4 h-10 text-sm font-medium rounded-lg transition-colors " +
                    (isCurrent
                      ? "bg-secondary text-muted-foreground cursor-not-allowed"
                      : p.highlight
                        ? "text-primary-foreground bg-primary hover:bg-primary/90"
                        : "text-foreground bg-card border border-input hover:border-primary")
                  }
                >
                  {isCurrent ? "Current plan" : isActive ? "Switch" : "Subscribe"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-4 leading-snug">
          Cancel anytime via the customer portal. Yearly plans renew once per year.
        </p>
      </div>
    </div>
  );
}

// ── Support ──

export function SupportPage({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<ApiSupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSupportMessages().then((msgs) => {
      if (!cancelled) setMessages(msgs);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      fetchSupportMessages().then((msgs) => {
        setMessages((prev) => {
          const lastNew = msgs[msgs.length - 1];
          const lastPrev = prev[prev.length - 1];
          if (lastNew && lastPrev && lastNew.id === lastPrev.id && msgs.length === prev.length) {
            return prev;
          }
          return msgs;
        });
      });
    }, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.id !== lastIdRef.current) {
      lastIdRef.current = lastMsg.id;
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      const real = await sendSupportMessage(text);
      setMessages((m) => [...m, real]);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div>
      <SubpageStickyBar onBack={onBack} hideSave />
      <div className="max-w-2xl mx-auto pt-5 md:pt-8">
        <div className="mb-5">
          <div className="text-xs text-muted-foreground">Settings</div>
          <h2 className="text-xl font-medium text-foreground mt-1">Support</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Chat with our team. We usually reply within a few hours.
          </p>
        </div>

        <div
          className="bg-card border border-border rounded-2xl flex flex-col"
          style={{ height: "min(70vh, 600px)" }}
        >
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                No messages yet. Say hi!
              </div>
            ) : (
              messages.map((m) => <SupportBubble key={m.id} message={m} />)
            )}
          </div>

          <div className="border-t border-border p-3 flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Type a message..."
              rows={1}
              className={inputClass + " h-auto py-2.5 resize-none flex-1 min-w-0"}
              style={{ maxHeight: "120px" }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || sending}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:bg-muted disabled:cursor-not-allowed"
              aria-label="Send"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <SendIcon size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SupportBubble({ message }: { message: ApiSupportMessage }) {
  const isUser = !message.isAdmin;
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const cls = isUser
    ? "bg-primary text-primary-foreground rounded-tr-sm"
    : "bg-secondary text-foreground rounded-tl-sm";

  return (
    <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
      <div className="max-w-[75%]">
        <div
          className={
            "px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words " + cls
          }
        >
          {message.message}
        </div>
        <div className={"text-[10px] text-muted-foreground mt-1 px-1 " + (isUser ? "text-right" : "text-left")}>
          {time}
        </div>
      </div>
    </div>
  );
}
