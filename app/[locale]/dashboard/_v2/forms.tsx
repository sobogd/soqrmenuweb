"use client";

// Standalone form components for category / dish / option editing.
// Each one lives in its own Next.js route and uses router.push for navigation.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
} from "./icons";
import {
  ConfirmDialog,
  EditPageHeader,
  PhotoPicker,
  ToggleSwitch,
  TranslatedInput,
} from "./ui";
import { iconBtn, inputClass } from "./tokens";
import {
  ALLERGENS,
  AVAILABLE_LANGUAGES,
  emptyMl,
  getMl,
  getMlWithFallback,
  setMl,
  translateText,
} from "./i18n";
import { moveItem, newId, currencySymbolOf, parseDecimal } from "./helpers";
import { buildCategoryTranslations, buildItemTranslations } from "./mappers";
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  updateCategory,
  updateItem,
} from "./api";
import { useRestaurant } from "./restaurant-context";
import type { Category, Dish, DishOption, Ml, OptionVariant } from "./types";

// ── Category form ──

export function CategoryForm({
  category,
  onSavedRedirect,
  onBack,
  onDeletedRedirect,
}: {
  category: Category | null;
  onSavedRedirect: () => void;
  onBack: () => void;
  onDeletedRedirect: () => void;
}) {
  const restaurant = useRestaurant();
  const { defaultLang, languages } = restaurant;
  const isNew = category === null;

  const [lang, setLang] = useState<string>(defaultLang);
  const [form, setForm] = useState<{ name: Ml }>({
    name: category ? category.name : emptyMl(languages),
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Default language pinned first; the rest follow AVAILABLE_LANGUAGES ordering.
  const langMetas = (() => {
    const enabled = AVAILABLE_LANGUAGES.filter((l) => languages.includes(l.code));
    const def = enabled.find((l) => l.code === defaultLang);
    if (!def) return enabled;
    return [def, ...enabled.filter((l) => l.code !== defaultLang)];
  })();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const namePrimary = (form.name[defaultLang] || "").trim();
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);

  async function save() {
    if (saving) return;
    if (namePrimary.length === 0) {
      setAlert({
        title: "Name is required",
        message: "Enter a category name in the default language before saving.",
      });
      return;
    }
    const trimmed: Ml = {};
    languages.forEach((l) => {
      trimmed[l] = (form.name[l] || "").trim();
    });
    const translations = buildCategoryTranslations(trimmed, defaultLang);
    setSaving(true);
    try {
      if (isNew) {
        await createCategory({ name: trimmed[defaultLang], translations });
      } else if (category) {
        await updateCategory(category.id, { name: trimmed[defaultLang], translations });
      }
      onSavedRedirect();
    } catch {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!category) return;
    setDeleting(true);
    try {
      await deleteCategory(category.id);
      onDeletedRedirect();
    } catch {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  const titleText = isNew
    ? "New category"
    : (getMlWithFallback(form.name, lang, defaultLang) || "Untitled");

  return (
    <div>
      <EditPageHeader
        onBack={onBack}
        title={titleText}
        breadcrumb="Menu"
        lang={lang}
        onLangChange={setLang}
        languages={langMetas}
        onSave={save}
        canSave={!saving}
        saving={saving}
      />

      <div className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-2xl p-5 md:p-6">
        <TranslatedInput
          id="cat-name"
          label="Name"
          value={form.name}
          lang={lang}
          defaultLang={defaultLang}
          languages={languages}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="e.g. Antipasti"
        />
      </div>

      {!isNew ? (
        <div className="max-w-2xl mx-auto mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <TrashIcon size={13} />
            Delete category
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete category?"
        message={
          deleting
            ? "Deleting..."
            : "This will also delete all dishes inside it. This cannot be undone."
        }
        onConfirm={confirmDelete}
        onCancel={() => (deleting ? null : setConfirmOpen(false))}
      />

      <ConfirmDialog
        open={alert !== null}
        singleButton
        title={alert?.title}
        message={alert?.message}
        onCancel={() => setAlert(null)}
      />
    </div>
  );
}

// ── Dish form ──

interface DishFormState {
  name: Ml;
  description: Ml;
  price: string;
  photoUrl: string | null;
  visible: boolean;
  allergens: string[];
}

export function DishForm({
  dish,
  categoryId,
  categoryName,
  onSavedRedirect,
  onBack,
  onDeletedRedirect,
  optionRoutePrefix,
}: {
  dish: Dish | null;
  categoryId: string;
  categoryName: string;
  onSavedRedirect: (newId: string) => void;
  onBack: () => void;
  onDeletedRedirect: () => void;
  // Builder for option-route URLs. Receives the dish id (resolved post-save for new
  // dishes) and returns a prefix like `/dashboard/items/<id>/options`. When set, the
  // form renders option add/edit affordances and auto-saves before navigation.
  optionRoutePrefix?: (dishId: string) => string;
}) {
  const router = useRouter();
  const restaurant = useRestaurant();
  const { defaultLang, languages, currency } = restaurant;
  const currencySymbol = currencySymbolOf(currency);
  const isNew = dish === null;

  const [lang, setLang] = useState<string>(defaultLang);
  const [form, setForm] = useState<DishFormState>(() => ({
    name: dish ? dish.name : emptyMl(languages),
    description: dish && dish.description ? dish.description : emptyMl(languages),
    price: dish ? dish.price : "",
    photoUrl: dish?.photoUrl ?? null,
    visible: dish ? dish.visible : true,
    allergens: dish?.allergens ?? [],
  }));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Default language pinned first; the rest follow AVAILABLE_LANGUAGES ordering.
  const langMetas = (() => {
    const enabled = AVAILABLE_LANGUAGES.filter((l) => languages.includes(l.code));
    const def = enabled.find((l) => l.code === defaultLang);
    if (!def) return enabled;
    return [def, ...enabled.filter((l) => l.code !== defaultLang)];
  })();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const namePrimary = (form.name[defaultLang] || "").trim();
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);

  function validateForm(): { title: string; message: string } | null {
    const missing: string[] = [];
    if (namePrimary.length === 0) missing.push("name");
    const priceTrim = form.price.trim();
    if (priceTrim.length === 0 || isNaN(parseDecimal(priceTrim))) missing.push("price");
    if (missing.length === 0) return null;
    if (missing.length === 1) {
      const field = missing[0];
      return {
        title: field === "name" ? "Name is required" : "Price is required",
        message:
          field === "name"
            ? "Enter a dish name in the default language before saving."
            : "Enter a valid price (e.g. 12.50) before saving.",
      };
    }
    return {
      title: "Missing fields",
      message: "Enter a name and a valid price before saving.",
    };
  }

  function toggleAllergen(code: string) {
    setForm((f) => ({
      ...f,
      allergens: f.allergens.includes(code)
        ? f.allergens.filter((a) => a !== code)
        : [...f.allergens, code],
    }));
  }

  // Persist the current form state. Returns the saved dish id (for new dishes, the id
  // assigned by the server) on success, or null on validation/network error.
  // `redirectAfter`:
  //   "list" → call onSavedRedirect(id) and leave the spinner up while navigation runs
  //   "stay" → reset the spinner; caller handles navigation
  async function persist(redirectAfter: "list" | "stay" = "list"): Promise<string | null> {
    if (saving) return null;
    const validation = validateForm();
    if (validation) {
      setAlert(validation);
      return null;
    }
    const priceNum = parseDecimal(form.price);
    const translations = buildItemTranslations(form.name, form.description, defaultLang);
    const descPrimary = (form.description[defaultLang] || "").trim() || null;
    setSaving(true);
    try {
      let savedId: string;
      if (isNew) {
        const created = await createItem({
          name: namePrimary,
          description: descPrimary,
          price: priceNum,
          imageUrl: form.photoUrl,
          categoryId,
          isActive: form.visible,
          translations,
          allergens: form.allergens,
          options: null,
        });
        savedId = created.id;
      } else if (dish) {
        await updateItem(dish.id, {
          name: namePrimary,
          description: descPrimary,
          price: priceNum,
          imageUrl: form.photoUrl,
          categoryId,
          isActive: form.visible,
          translations,
          allergens: form.allergens,
          // Preserve existing options on edit; option CRUD lives on its own routes.
          options: dish.options,
        });
        savedId = dish.id;
      } else {
        setSaving(false);
        return null;
      }
      if (redirectAfter === "list") {
        onSavedRedirect(savedId);
        // Component unmounts; leave saving=true so the spinner stays up.
      } else {
        setSaving(false);
      }
      return savedId;
    } catch {
      setSaving(false);
      return null;
    }
  }

  async function save() {
    await persist("list");
  }

  // Save the current draft, then navigate to the option route. Validation alerts fire
  // from inside persist() if name/price are missing.
  async function handleAddOption() {
    if (!optionRoutePrefix) return;
    const id = await persist("stay");
    if (!id) return;
    router.push(`${optionRoutePrefix(id)}/new`);
  }

  async function handleEditOption(optId: string) {
    if (!optionRoutePrefix) return;
    const id = await persist("stay");
    if (!id) return;
    router.push(`${optionRoutePrefix(id)}/${optId}`);
  }

  async function confirmDelete() {
    if (!dish) return;
    setDeleting(true);
    try {
      await deleteItem(dish.id);
      onDeletedRedirect();
    } catch {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  const titleText = isNew
    ? "New dish"
    : (getMlWithFallback(form.name, lang, defaultLang) || "Untitled");
  const divider = <div className="border-t border-neutral-200 my-5" />;

  return (
    <div>
      <EditPageHeader
        onBack={onBack}
        title={titleText}
        breadcrumb={categoryName ? "Menu  /  " + categoryName : "Menu"}
        lang={lang}
        onLangChange={setLang}
        languages={langMetas}
        onSave={save}
        canSave={!saving}
        saving={saving}
      />

      <div className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-2xl p-5 md:p-6">
        <TranslatedInput
          id="dish-name"
          label="Name"
          value={form.name}
          lang={lang}
          defaultLang={defaultLang}
          languages={languages}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="e.g. Spaghetti carbonara"
        />

        <div className="mt-4">
          <TranslatedInput
            id="dish-desc"
            label="Description"
            value={form.description}
            lang={lang}
            defaultLang={defaultLang}
            languages={languages}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="Short description for guests..."
            multiline
          />
        </div>

        {divider}

        <div className="flex gap-3 items-start">
          <div className="flex-1 min-w-0">
            <label htmlFor="dish-price" className="block text-sm font-medium text-neutral-900 mb-1.5">
              Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400 pointer-events-none">
                {currencySymbol}
              </span>
              <input
                id="dish-price"
                type="text"
                inputMode="decimal"
                placeholder="12.50"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className={inputClass + " pl-6"}
              />
            </div>
          </div>

          <div className="flex-shrink-0">
            <label className="block text-sm font-medium text-neutral-900 mb-1.5">Photo</label>
            <PhotoPicker
              url={form.photoUrl}
              onChange={(url) => setForm((f) => ({ ...f, photoUrl: url }))}
              inputId="dish-photo"
            />
          </div>
        </div>

        {divider}

        <div className="flex items-baseline justify-between gap-3 mb-0.5">
          <div className="text-sm font-medium text-neutral-900">Allergens</div>
          {form.allergens.length > 0 ? (
            <span className="text-[11px] font-medium text-neutral-500 tabular-nums">
              {form.allergens.length} selected
            </span>
          ) : null}
        </div>
        <p className="text-xs text-neutral-400 mb-2.5">Tap to toggle.</p>
        <div className="flex flex-wrap gap-1.5">
          {ALLERGENS.map((a) => {
            const checked = form.allergens.includes(a.code);
            return (
              <button
                key={a.code}
                type="button"
                onClick={() => toggleAllergen(a.code)}
                className={
                  "h-7 px-2.5 text-xs font-medium rounded-full transition-colors " +
                  (checked
                    ? "bg-neutral-900 text-white hover:bg-neutral-800"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200")
                }
              >
                {a.label}
              </button>
            );
          })}
        </div>

        {divider}

        {/* Options section — add/edit navigates to dedicated routes. The form auto-saves
            the current draft before navigating so name/desc/price edits are preserved. */}
        <div>
          <div className="text-sm font-medium text-neutral-900">Options</div>
          <p className="text-xs text-neutral-500 mb-2.5 mt-0.5">
            Variants like sizes, extras, or add-ons.
          </p>

          {!optionRoutePrefix ? null : dish ? (
            <DishOptionsInline
              dish={dish}
              defaultLang={defaultLang}
              disabled={saving}
              onAddOption={handleAddOption}
              onEditOption={handleEditOption}
            />
          ) : (
            <button
              type="button"
              onClick={handleAddOption}
              disabled={saving}
              className="w-full h-10 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-dashed border-neutral-300 hover:border-neutral-900 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <PlusIcon size={14} />
              Add option
            </button>
          )}
        </div>

        {divider}

        <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
          <div>
            <div className="text-sm font-medium text-neutral-900">Visible to guests</div>
            <div className="text-xs text-neutral-500 leading-snug mt-0.5">
              Hidden dishes don&apos;t appear in the menu.
            </div>
          </div>
          <ToggleSwitch
            checked={form.visible}
            onChange={() => setForm((f) => ({ ...f, visible: !f.visible }))}
          />
        </label>
      </div>

      {!isNew ? (
        <div className="max-w-2xl mx-auto mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <TrashIcon size={13} />
            Delete dish
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete dish?"
        message={deleting ? "Deleting..." : "This dish will be removed from the menu."}
        onConfirm={confirmDelete}
        onCancel={() => (deleting ? null : setConfirmOpen(false))}
      />

      <ConfirmDialog
        open={alert !== null}
        singleButton
        title={alert?.title}
        message={alert?.message}
        onCancel={() => setAlert(null)}
      />
    </div>
  );
}

// ── Options list (rendered inline inside DishForm) ──

function DishOptionsInline({
  dish,
  defaultLang,
  disabled,
  onAddOption,
  onEditOption,
}: {
  dish: Dish;
  defaultLang: string;
  disabled: boolean;
  onAddOption: () => Promise<void>;
  onEditOption: (optionId: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  // Local override mirrors dish.options so reorder feedback is instant; the parent
  // page refreshes via router.refresh() once the server roundtrip lands.
  const [options, setOptions] = useState<DishOption[]>(dish.options);

  useEffect(() => {
    setOptions(dish.options);
  }, [dish.options]);

  async function moveOption(idx: number, dir: number) {
    if (busy || disabled) return;
    const next = moveItem(options, idx, dir);
    setOptions(next);
    setBusy(true);
    try {
      // Persist the new options ordering on the dish. We re-send the dish payload
      // unchanged except for `options` — name/desc/etc come from the server-side
      // dish prop, which holds the last persisted draft.
      const namePrimary = (dish.name[defaultLang] || "").trim();
      const descPrimary = (dish.description[defaultLang] || "").trim() || null;
      const translations = buildItemTranslations(dish.name, dish.description, defaultLang);
      await updateItem(dish.id, {
        name: namePrimary,
        description: descPrimary,
        price: parseDecimal(dish.price),
        imageUrl: dish.photoUrl,
        categoryId: dish.categoryId,
        isActive: dish.visible,
        translations,
        allergens: dish.allergens,
        options: next,
      });
    } catch {
      setOptions(dish.options);
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    if (busy || disabled) return;
    await onAddOption();
  }

  async function handleEdit(optId: string) {
    if (busy || disabled) return;
    await onEditOption(optId);
  }

  return (
    <>
      {options.length > 0 ? (
        <div className="border border-neutral-200 rounded-lg overflow-hidden divide-y divide-neutral-100">
          {options.map((opt, idx) => (
            <OptionRow
              key={opt.id}
              option={opt}
              defaultLang={defaultLang}
              isFirst={idx === 0}
              isLast={idx === options.length - 1}
              onEdit={() => handleEdit(opt.id)}
              onMoveUp={() => moveOption(idx, -1)}
              onMoveDown={() => moveOption(idx, 1)}
            />
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleAdd}
        disabled={busy || disabled}
        className={
          "w-full h-10 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-dashed border-neutral-300 hover:border-neutral-900 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed " +
          (options.length > 0 ? "mt-2" : "")
        }
      >
        <PlusIcon size={14} />
        Add option
      </button>
    </>
  );
}

function OptionRow({
  option,
  defaultLang,
  isFirst,
  isLast,
  onEdit,
  onMoveUp,
  onMoveDown,
}: {
  option: DishOption;
  defaultLang: string;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const typeLabel = option.type === "multi" ? "Multiple choice" : "Single choice";
  const reqLabel = option.required ? "Required" : "Optional";
  const variantsCount = option.variants?.length || 0;
  return (
    <div className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 transition-colors">
      <div className="flex items-center gap-0.5 shrink-0">
        <button type="button" onClick={onMoveUp} disabled={isFirst} className={iconBtn} aria-label="Move up">
          <ArrowUpIcon size={14} />
        </button>
        <button type="button" onClick={onMoveDown} disabled={isLast} className={iconBtn} aria-label="Move down">
          <ArrowDownIcon size={14} />
        </button>
      </div>
      <button type="button" onClick={onEdit} className="flex-1 min-w-0 text-left">
        <div className="text-sm font-medium text-neutral-900 truncate">
          {getMlWithFallback(option.name, defaultLang, defaultLang) || "Untitled option"}
        </div>
        <div className="text-xs text-neutral-500 truncate mt-0.5">
          {typeLabel}  ·  {reqLabel}  ·  {variantsCount} {variantsCount === 1 ? "variant" : "variants"}
        </div>
      </button>
      <ChevronRightIcon size={14} className="text-neutral-400 shrink-0" />
    </div>
  );
}

// ── Option form ──

interface OptionFormState {
  name: Ml;
  type: "single" | "multi";
  required: boolean;
  variants: OptionVariant[];
}

export function OptionForm({
  dish,
  option,
  onSavedRedirect,
  onBack,
  onDeletedRedirect,
}: {
  dish: Dish;
  option: DishOption | null;
  onSavedRedirect: () => void;
  onBack: () => void;
  onDeletedRedirect: () => void;
}) {
  const restaurant = useRestaurant();
  const { defaultLang, languages, currency } = restaurant;
  const currencySymbol = currencySymbolOf(currency);
  const isNew = option === null;

  const [lang, setLang] = useState<string>(defaultLang);
  const [form, setForm] = useState<OptionFormState>(() => ({
    name: option ? option.name : emptyMl(languages),
    type: option ? option.type : "single",
    required: option ? !!option.required : false,
    variants:
      option && option.variants && option.variants.length > 0
        ? option.variants
        : [{ id: newId(), name: emptyMl(languages), priceDelta: "0.00" }],
  }));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [translatingAll, setTranslatingAll] = useState(false);
  // Default language pinned first; the rest follow AVAILABLE_LANGUAGES ordering.
  const langMetas = (() => {
    const enabled = AVAILABLE_LANGUAGES.filter((l) => languages.includes(l.code));
    const def = enabled.find((l) => l.code === defaultLang);
    if (!def) return enabled;
    return [def, ...enabled.filter((l) => l.code !== defaultLang)];
  })();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const namePrimary = (form.name[defaultLang] || "").trim();
  const validVariants = form.variants.filter((v) => (v.name?.[defaultLang] || "").trim().length > 0);
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);

  function validateForm(): { title: string; message: string } | null {
    if (namePrimary.length === 0 && validVariants.length === 0) {
      return {
        title: "Missing fields",
        message: "Enter an option name and at least one variant before saving.",
      };
    }
    if (namePrimary.length === 0) {
      return {
        title: "Name is required",
        message: "Enter an option name in the default language before saving.",
      };
    }
    if (validVariants.length === 0) {
      return {
        title: "Variant required",
        message: "Add at least one variant with a name in the default language before saving.",
      };
    }
    return null;
  }

  function setVariant(idx: number, patch: Partial<OptionVariant>) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    }));
  }
  function addVariant() {
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { id: newId(), name: emptyMl(languages), priceDelta: "0.00" }],
    }));
  }
  function removeVariant(idx: number) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }));
  }
  function moveVariant(idx: number, dir: number) {
    setForm((f) => ({ ...f, variants: moveItem(f.variants, idx, dir) }));
  }

  async function translateAllVariants() {
    if (lang === defaultLang || translatingAll) return;
    const targets = form.variants
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => {
        const src = getMl(v.name, defaultLang);
        const cur = getMl(v.name, lang);
        return src.trim().length > 0 && cur.trim().length === 0;
      });
    if (targets.length === 0) return;
    setTranslatingAll(true);
    try {
      const results = await Promise.all(
        targets.map(({ v }) => translateText(getMl(v.name, defaultLang), defaultLang, lang)),
      );
      setForm((f) => {
        const next = f.variants.slice();
        targets.forEach(({ i }, j) => {
          next[i] = { ...next[i], name: setMl(next[i].name, lang, results[j]) };
        });
        return { ...f, variants: next };
      });
    } catch {
      // silent
    } finally {
      setTranslatingAll(false);
    }
  }

  async function save() {
    if (saving) return;
    const validation = validateForm();
    if (validation) {
      setAlert(validation);
      return;
    }
    setSaving(true);
    // Normalise variant priceDelta: strip commas so downstream price math (parseFloat
    // on the snapshot) doesn't truncate "1,5" to 1.
    const normalisedVariants = validVariants.map((v) => ({
      ...v,
      priceDelta: String(v.priceDelta || "0").replace(",", ".").trim() || "0",
    }));
    const data: Omit<DishOption, "id"> = {
      name: form.name,
      type: form.type,
      required: form.required,
      variants: normalisedVariants,
    };
    let nextOptions: DishOption[];
    if (isNew) {
      nextOptions = [...dish.options, { id: newId(), ...data }];
    } else if (option) {
      nextOptions = dish.options.map((o) => (o.id === option.id ? { ...o, ...data } : o));
    } else {
      nextOptions = dish.options;
    }
    try {
      await persistDishOptions(dish, nextOptions, defaultLang);
      onSavedRedirect();
    } catch {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!option) return;
    setDeleting(true);
    const nextOptions = dish.options.filter((o) => o.id !== option.id);
    try {
      await persistDishOptions(dish, nextOptions, defaultLang);
      onDeletedRedirect();
    } catch {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  const translatableVariantsCount =
    lang === defaultLang
      ? 0
      : form.variants.filter((v) => {
          const src = getMl(v.name, defaultLang);
          const cur = getMl(v.name, lang);
          return src.trim().length > 0 && cur.trim().length === 0;
        }).length;

  const titleText = isNew
    ? "New option"
    : (getMlWithFallback(form.name, lang, defaultLang) || "Untitled option");
  const divider = <div className="border-t border-neutral-200 my-5" />;
  const dishName = getMlWithFallback(dish.name, defaultLang, defaultLang);

  return (
    <div>
      <EditPageHeader
        onBack={onBack}
        title={titleText}
        breadcrumb={dishName ? "Menu  /  " + dishName : "Menu"}
        lang={lang}
        onLangChange={setLang}
        languages={langMetas}
        onSave={save}
        canSave={!saving}
        saving={saving}
      />

      <div className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-2xl p-5 md:p-6">
        <TranslatedInput
          id="opt-name"
          label="Name"
          value={form.name}
          lang={lang}
          defaultLang={defaultLang}
          languages={languages}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="e.g. Size, Toppings, Crust"
        />

        {divider}

        <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
          <div>
            <div className="text-sm font-medium text-neutral-900">Allow multiple choices</div>
            <div className="text-xs text-neutral-500 leading-snug mt-0.5">
              Off — guest picks one. On — guest picks any number.
            </div>
          </div>
          <ToggleSwitch
            checked={form.type === "multi"}
            onChange={() =>
              setForm((f) => ({ ...f, type: f.type === "multi" ? "single" : "multi" }))
            }
          />
        </label>

        {divider}

        <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
          <div>
            <div className="text-sm font-medium text-neutral-900">Required</div>
            <div className="text-xs text-neutral-500 leading-snug mt-0.5">
              Guest can&apos;t add to cart without choosing.
            </div>
          </div>
          <ToggleSwitch
            checked={form.required}
            onChange={() => setForm((f) => ({ ...f, required: !f.required }))}
          />
        </label>

        {divider}

        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="text-sm font-medium text-neutral-900">Variants</div>
          {lang !== defaultLang && translatableVariantsCount > 0 ? (
            <button
              type="button"
              onClick={translateAllVariants}
              disabled={translatingAll}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors disabled:text-neutral-300 disabled:cursor-not-allowed"
            >
              {translatingAll ? "Translating..." : "Translate all"}
            </button>
          ) : null}
        </div>
        <p className="text-xs text-neutral-500 mb-2.5">
          Each variant has a name and an optional price modifier.
        </p>
        <div className="space-y-2">
          {form.variants.map((variant, idx) => (
            <VariantRow
              key={variant.id}
              variant={variant}
              lang={lang}
              defaultLang={defaultLang}
              currencySymbol={currencySymbol}
              isFirst={idx === 0}
              isLast={idx === form.variants.length - 1}
              canRemove={form.variants.length > 1}
              onChange={(patch) => setVariant(idx, patch)}
              onRemove={() => removeVariant(idx)}
              onMoveUp={() => moveVariant(idx, -1)}
              onMoveDown={() => moveVariant(idx, 1)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addVariant}
          className="w-full mt-3 h-10 text-sm font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-dashed border-neutral-300 hover:border-neutral-900 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
        >
          <PlusIcon size={14} />
          Add variant
        </button>
      </div>

      {!isNew ? (
        <div className="max-w-2xl mx-auto mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <TrashIcon size={13} />
            Delete option
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete option?"
        message={deleting ? "Deleting..." : "This option will be removed from the dish."}
        onConfirm={confirmDelete}
        onCancel={() => (deleting ? null : setConfirmOpen(false))}
      />

      <ConfirmDialog
        open={alert !== null}
        singleButton
        title={alert?.title}
        message={alert?.message}
        onCancel={() => setAlert(null)}
      />
    </div>
  );
}

function VariantRow({
  variant,
  lang,
  defaultLang,
  currencySymbol,
  isFirst,
  isLast,
  canRemove,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  variant: OptionVariant;
  lang: string;
  defaultLang: string;
  currencySymbol: string;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<OptionVariant>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <div className="flex items-center gap-0.5 shrink-0">
        <button type="button" onClick={onMoveUp} disabled={isFirst} className={iconBtn} aria-label="Move up">
          <ArrowUpIcon size={14} />
        </button>
        <button type="button" onClick={onMoveDown} disabled={isLast} className={iconBtn} aria-label="Move down">
          <ArrowDownIcon size={14} />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={getMl(variant.name, lang)}
          onChange={(e) => onChange({ name: setMl(variant.name, lang, e.target.value) })}
          placeholder={
            lang !== defaultLang && getMl(variant.name, defaultLang)
              ? "Will use: " + getMl(variant.name, defaultLang)
              : "Variant name"
          }
          className={inputClass}
        />
      </div>
      <div className="w-16 md:w-20 shrink-0 relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">
          {currencySymbol}
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={variant.priceDelta}
          onChange={(e) => onChange({ priceDelta: e.target.value })}
          placeholder="0.00"
          title="Price modifier"
          className={inputClass + " pl-5 pr-1 tabular-nums"}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className={iconBtn + " shrink-0"}
        aria-label="Remove variant"
      >
        <TrashIcon size={14} />
      </button>
    </div>
  );
}

// Persist a dish's full options list. The backend expects an Item PUT with the full
// item payload, so we re-send name/description/etc unchanged.
async function persistDishOptions(dish: Dish, nextOptions: DishOption[], defaultLang: string) {
  const namePrimary = (dish.name[defaultLang] || "").trim();
  const descPrimary = (dish.description[defaultLang] || "").trim() || null;
  const translations = buildItemTranslations(dish.name, dish.description, defaultLang);
  await updateItem(dish.id, {
    name: namePrimary,
    description: descPrimary,
    price: parseFloat(dish.price),
    imageUrl: dish.photoUrl,
    categoryId: dish.categoryId,
    isActive: dish.visible,
    translations,
    allergens: dish.allergens,
    options: nextOptions,
  });
}
