"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  ShareIcon,
  SparklesIcon,
} from "./icons";
import { inputClass, labelClass, primaryBtn, secondaryBtn } from "./tokens";
import { getMl, setMl, translateText } from "./i18n";
import type { Ml } from "./types";

// Modal — Escape closes, body scroll lock while open.

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const widthCls =
    size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4 bg-neutral-900/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        className={
          "relative w-full " +
          widthCls +
          " bg-white border border-neutral-200 rounded-2xl max-h-[92vh] flex flex-col"
        }
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-neutral-200">
          <h3 className="text-base font-medium text-neutral-900 truncate">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 -mr-2 flex items-center justify-center rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            aria-label="Close"
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ConfirmDialog — destructive by default. singleButton turns it into a one-button alert.

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  confirmStyle,
  singleButton,
}: {
  open: boolean;
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmStyle?: "danger" | "primary";
  singleButton?: boolean;
}) {
  const label = confirmLabel || (singleButton ? "OK" : "Delete");
  const isDanger = !singleButton && (!confirmStyle || confirmStyle === "danger");
  const confirmCls = isDanger
    ? "h-10 px-4 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
    : "h-10 px-4 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors";

  return (
    <Modal open={open} onClose={onCancel} title={title || "Confirm"} size="sm">
      <p className="text-sm text-neutral-600 leading-snug mb-5">{message}</p>
      <div className="flex gap-2.5 justify-end">
        {!singleButton ? (
          <button type="button" onClick={onCancel} className={secondaryBtn}>
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          onClick={singleButton ? onCancel : onConfirm}
          className={confirmCls}
        >
          {label}
        </button>
      </div>
    </Modal>
  );
}

// ToggleSwitch.

export function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={
        "shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors " +
        (checked ? "bg-neutral-900" : "bg-neutral-300")
      }
    >
      <span
        className={
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform " +
          (checked ? "translate-x-6" : "translate-x-1")
        }
      />
    </button>
  );
}

// LanguageSwitcher — pill tabs, only the languages enabled on the restaurant.

interface MiniLang {
  code: string;
  short: string;
  label: string;
}

export function LanguageSwitcher({
  lang,
  onChange,
  languages,
}: {
  lang: string;
  onChange: (code: string) => void;
  languages: MiniLang[];
}) {
  if (languages.length <= 1) return null;
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 bg-neutral-100 rounded-lg">
      {languages.map((l) => {
        const isActive = lang === l.code;
        const cls = isActive
          ? "bg-white text-neutral-900 shadow-sm"
          : "text-neutral-500 hover:text-neutral-900";
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => onChange(l.code)}
            className={"h-7 px-2.5 text-[11px] font-medium rounded-md transition-colors " + cls}
            title={l.label}
          >
            {l.short}
          </button>
        );
      })}
    </div>
  );
}

// AiTranslateButton — invoked from within TranslatedInput when not on default lang.

function AiTranslateButton({
  value,
  lang,
  defaultLang,
  languages,
  onChange,
  disabled,
  inline,
}: {
  value: Ml;
  lang: string;
  defaultLang: string;
  languages: string[];
  onChange: (next: Ml) => void;
  disabled?: boolean;
  inline?: boolean;
}) {
  const [translating, setTranslating] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  if (lang === defaultLang) return null;

  const current = getMl(value, lang);
  const sourceText = (() => {
    const def = getMl(value, defaultLang);
    if (def) return { text: def, fromLang: defaultLang };
    for (const code of languages) {
      const v = getMl(value, code);
      if (v && code !== lang) return { text: v, fromLang: code };
    }
    return null;
  })();

  const canTranslate = !!sourceText && !translating && !disabled;

  async function doTranslate() {
    if (!canTranslate || !sourceText) return;
    setTranslating(true);
    try {
      const translated = await translateText(sourceText.text, sourceText.fromLang, lang);
      onChange(setMl(value, lang, translated));
    } catch {
      // Silent fail; the user can retry.
    } finally {
      setTranslating(false);
    }
  }

  function handleClick() {
    if (current.trim().length > 0) {
      setConfirmReplace(true);
    } else {
      doTranslate();
    }
  }

  const inlineCls =
    "flex items-center justify-center w-9 h-10 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors disabled:text-neutral-300 disabled:hover:bg-transparent disabled:cursor-not-allowed shrink-0";
  const linkCls =
    "inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors disabled:text-neutral-300 disabled:cursor-not-allowed";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={!canTranslate}
        className={inline ? inlineCls : linkCls}
        aria-label="Translate with AI"
        title={inline && translating ? "Translating..." : (inline ? "Translate with AI" : undefined)}
      >
        {translating ? (
          <div className="w-3 h-3 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
        ) : (
          <SparklesIcon size={inline ? 14 : 11} />
        )}
        {!inline ? (translating ? "Translating..." : "Translate") : null}
      </button>

      <ConfirmDialog
        open={confirmReplace}
        title="Replace existing translation?"
        message="This will overwrite what you've already typed in this field."
        confirmLabel="Replace"
        confirmStyle="primary"
        onConfirm={() => {
          setConfirmReplace(false);
          doTranslate();
        }}
        onCancel={() => setConfirmReplace(false)}
      />
    </>
  );
}

// TranslatedInput — text/textarea bound to a multilingual field.

export function TranslatedInput({
  id,
  label,
  value,
  lang,
  defaultLang,
  languages,
  onChange,
  placeholder,
  type = "text",
  multiline,
  hint,
  translatable = true,
}: {
  id: string;
  label?: string;
  value: Ml;
  lang: string;
  defaultLang: string;
  languages: string[];
  onChange: (next: Ml) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  hint?: string;
  translatable?: boolean;
}) {
  const current = getMl(value, lang);
  const fallback = lang !== defaultLang ? getMl(value, defaultLang) : "";
  const showFallback = lang !== defaultLang && !current && fallback;

  const showTranslate = translatable && lang !== defaultLang;

  const inputProps = {
    id,
    value: current,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(setMl(value, lang, e.target.value)),
    placeholder: showFallback ? "Will use: " + fallback : (placeholder || ""),
    className: inputClass,
  };

  return (
    <div>
      {(label || showTranslate) ? (
        <div className="flex items-center justify-between gap-2 mb-1.5">
          {label ? (
            <label htmlFor={id} className="block text-sm font-medium text-neutral-900">
              {label}
            </label>
          ) : (
            <span />
          )}
          {showTranslate ? (
            <AiTranslateButton
              value={value}
              lang={lang}
              defaultLang={defaultLang}
              languages={languages}
              onChange={onChange}
            />
          ) : null}
        </div>
      ) : null}
      {multiline ? (
        <textarea {...inputProps} rows={3} className={inputClass + " h-auto py-2 resize-none"} />
      ) : (
        <input
          {...inputProps}
          type={type}
          inputMode={type === "decimal" ? "decimal" : undefined}
        />
      )}
      {hint ? <p className="text-[11px] text-neutral-400 mt-1">{hint}</p> : null}
    </div>
  );
}

// PageHeader.

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-medium text-neutral-900">{title}</h2>
        {subtitle ? (
          <p className="text-[13px] text-neutral-500 leading-snug mt-1">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

// EmptyState.

export function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-8 md:p-12 flex flex-col items-center text-center">
      <h3 className="text-base font-medium text-neutral-900">{title}</h3>
      {subtitle ? (
        <p className="text-sm text-neutral-500 leading-snug mt-1.5 max-w-sm">{subtitle}</p>
      ) : null}
      {action ? <div className="mt-5 w-full max-w-xs">{action}</div> : null}
    </div>
  );
}

// Section card for edit pages.

export function Section({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"bg-white border border-neutral-200 rounded-xl p-4 md:p-5 " + className}>
      {title || description ? (
        <div className="mb-4">
          {title ? <h3 className="text-sm font-medium text-neutral-900">{title}</h3> : null}
          {description ? (
            <p className="text-xs text-neutral-500 leading-snug mt-0.5">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

// Sticky bar used on edit/sub pages.

export function SubpageStickyBar({
  onBack,
  onSave,
  canSave,
  hideSave,
  children,
}: {
  onBack: () => void;
  onSave?: () => void;
  canSave?: boolean;
  hideSave?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className="sticky z-10 -mx-4 md:-mx-6 -mt-5 md:-mt-8 px-4 md:px-6 py-2 bg-white/90 backdrop-blur-md border-b border-neutral-200"
      style={{ top: "var(--topbar-h, 0px)" }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 h-8 -ml-1 pl-1 pr-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          {children}
          {!hideSave ? (
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="h-8 px-3 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
            >
              Save
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// EditPageHeader — bigger heading + sticky save bar (used for dish/option pages).

export function EditPageHeader({
  onBack,
  title,
  breadcrumb,
  lang,
  onLangChange,
  languages,
  onSave,
  canSave,
  saving,
}: {
  onBack: () => void;
  title: string;
  breadcrumb?: string;
  lang?: string;
  onLangChange?: (code: string) => void;
  languages?: MiniLang[];
  onSave?: () => void;
  canSave?: boolean;
  saving?: boolean;
}) {
  return (
    <>
      <div
        className="sticky z-10 -mx-4 md:-mx-6 -mt-5 md:-mt-8 px-4 md:px-6 py-2 bg-white/90 backdrop-blur-md border-b border-neutral-200"
        style={{ top: "var(--topbar-h, 0px)" }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 h-8 -ml-1 pl-1 pr-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>
          <div className="flex items-center gap-2">
            {onLangChange && languages && lang ? (
              <LanguageSwitcher lang={lang} onChange={onLangChange} languages={languages} />
            ) : null}
            {onSave ? (
              <button
                type="button"
                onClick={onSave}
                disabled={!canSave}
                className="h-8 px-3 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {saving ? (
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : null}
                {saving ? "Saving..." : "Save"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-5 md:pt-8 pb-5">
        {breadcrumb ? <div className="text-xs text-neutral-500 truncate">{breadcrumb}</div> : null}
        <h2 className="text-xl font-medium text-neutral-900 truncate mt-1">{title}</h2>
      </div>
    </>
  );
}

// PreviewButton + ShareButton (used on Menu page sticky bar).

export function PreviewButton({ url }: { url: string }) {
  const fullUrl = url.startsWith("http") ? url : "https://" + url;
  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 hover:text-neutral-900 rounded-full transition-colors"
    >
      <EyeIcon size={12} />
      Preview
    </a>
  );
}

export function ShareButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 hover:text-neutral-900 rounded-full transition-colors"
    >
      <ShareIcon size={12} />
      Share
    </button>
  );
}

// ShareModal — QR + link + actions.

export function ShareModal({
  open,
  onClose,
  url,
  restaurantName,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  restaurantName: string;
}) {
  const [copied, setCopied] = useState(false);
  const fullUrl = url && url.startsWith("http") ? url : "https://" + (url || "");
  const qrSize = 480;
  const qrSrc =
    "https://api.qrserver.com/v1/create-qr-code/?size=" +
    qrSize +
    "x" +
    qrSize +
    "&margin=8&data=" +
    encodeURIComponent(fullUrl);

  function copyLink() {
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

  function downloadQr() {
    const a = document.createElement("a");
    a.href = qrSrc;
    a.download = "menu-qr.png";
    a.target = "_blank";
    a.rel = "noreferrer noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function openInNewTab() {
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Modal open={open} onClose={onClose} title={"Share " + (restaurantName || "your menu")}>
      <div className="flex justify-center">
        <div className="p-3 bg-white border border-neutral-200 rounded-xl">
          <img src={qrSrc} alt="QR code" width="192" height="192" className="block w-48 h-48" />
        </div>
      </div>
      <p className="text-xs text-neutral-500 text-center mt-3">
        Print and place on tables, or share online.
      </p>
      <div className="mt-5">
        <label className={labelClass}>Menu link</label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={fullUrl}
            onFocus={(e) => e.target.select()}
            className={inputClass + " font-mono text-xs"}
          />
          <button
            type="button"
            onClick={copyLink}
            className={
              "shrink-0 h-10 px-3 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 " +
              (copied
                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                : "text-neutral-900 bg-white border border-neutral-300 hover:border-neutral-900")
            }
          >
            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          type="button"
          onClick={downloadQr}
          className="h-10 px-3 text-sm font-medium text-neutral-900 bg-white border border-neutral-300 hover:border-neutral-900 rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <DownloadIcon size={14} />
          Download QR
        </button>
        <button
          type="button"
          onClick={openInNewTab}
          className="h-10 px-3 text-sm font-medium text-neutral-900 bg-white border border-neutral-300 hover:border-neutral-900 rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <ExternalLinkIcon size={14} />
          Open menu
        </button>
      </div>
    </Modal>
  );
}

// TableQrModal — per-table QR.

export function TableQrModal({
  open,
  onClose,
  tableNumber,
  tableLabel,
  menuUrl,
}: {
  open: boolean;
  onClose: () => void;
  tableNumber: number | null;
  tableLabel: string;
  menuUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  if (tableNumber === null) return null;
  const baseUrl = menuUrl && menuUrl.startsWith("http") ? menuUrl : "https://" + (menuUrl || "");
  const fullUrl = baseUrl + "?table=" + tableNumber;
  const qrSrc =
    "https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=8&data=" +
    encodeURIComponent(fullUrl);

  function copyLink() {
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

  function downloadQr() {
    const a = document.createElement("a");
    a.href = qrSrc;
    a.download = "table-" + tableNumber + "-qr.png";
    a.target = "_blank";
    a.rel = "noreferrer noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function openInNewTab() {
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Modal open={open} onClose={onClose} title={"Table " + tableNumber + (tableLabel ? " · " + tableLabel : "")}>
      <div className="flex justify-center">
        <div className="p-3 bg-white border border-neutral-200 rounded-xl">
          <img src={qrSrc} alt={"QR for table " + tableNumber} width="192" height="192" className="block w-48 h-48" />
        </div>
      </div>
      <p className="text-xs text-neutral-500 text-center mt-3">
        Print and place on this table. Scanning opens the menu with this table preselected.
      </p>
      <div className="mt-5">
        <label className={labelClass}>Table link</label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={fullUrl}
            onFocus={(e) => e.target.select()}
            className={inputClass + " font-mono text-xs"}
          />
          <button
            type="button"
            onClick={copyLink}
            className={
              "shrink-0 h-10 px-3 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 " +
              (copied
                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                : "text-neutral-900 bg-white border border-neutral-300 hover:border-neutral-900")
            }
          >
            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={downloadQr}
          className={secondaryBtn + " flex-1 inline-flex items-center justify-center gap-1.5"}
        >
          <DownloadIcon size={14} />
          Download
        </button>
        <button
          type="button"
          onClick={openInNewTab}
          className={primaryBtn + " flex-1 inline-flex items-center justify-center gap-1.5"}
        >
          <ExternalLinkIcon size={14} />
          Open
        </button>
      </div>
    </Modal>
  );
}

// File upload helper — POST to /api/upload, returns the public URL.

export async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url as string;
}

// PhotoPicker — reusable inline upload control with hover-overlay remove + AI generate slot.

export function PhotoPicker({
  url,
  onChange,
  onAiClick,
  inputId,
  height = "h-10",
  width = "min-w-[150px]",
  fileInputRef,
}: {
  url: string | null;
  onChange: (url: string | null) => void;
  onAiClick?: () => void;
  inputId: string;
  height?: string;
  width?: string;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [uploading, setUploading] = useState(false);
  const localRef = useRef<HTMLInputElement | null>(null);
  const ref = fileInputRef ?? localRef;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadedUrl = await uploadFile(file);
      onChange(uploadedUrl);
    } catch {
      // Silent; the upload error surfaces via missing photo.
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = "";
    }
  }

  function remove() {
    onChange(null);
    if (ref.current) ref.current.value = "";
  }

  return (
    <>
      {onAiClick ? (
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className="block text-sm font-medium text-neutral-900">Photo</label>
          <button
            type="button"
            onClick={onAiClick}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <SparklesIcon size={11} />
            Generate
          </button>
        </div>
      ) : null}
      <label
        htmlFor={inputId}
        className={
          "relative flex items-center justify-center gap-1.5 " + width + " " + height +
          " px-3 border border-dashed rounded-lg cursor-pointer transition-all overflow-hidden " +
          (url
            ? "border-neutral-900 p-0"
            : "border-neutral-300 bg-neutral-50 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 hover:bg-white")
        }
      >
        {uploading ? (
          <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
        ) : url ? (
          <>
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Remove photo"
            >
              <CloseIcon size={11} />
            </button>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <span className="text-[13px] font-medium">Add photo</span>
          </>
        )}
        <input
          id={inputId}
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </label>
    </>
  );
}
