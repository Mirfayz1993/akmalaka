import { uz } from "./uz";
import { ru } from "./ru";
import { create } from "zustand";

export type Locale = "uz" | "ru";
export type Translations = typeof uz;

const translations: Record<Locale, Translations> = { uz, ru };

interface I18nStore {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

export const useI18n = create<I18nStore>((set) => ({
  locale: "uz",
  t: translations.uz,
  setLocale: (locale) =>
    set({ locale, t: translations[locale] }),
}));
