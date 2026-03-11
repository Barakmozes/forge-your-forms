import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

type Language = "en" | "he";
type Direction = "ltr" | "rtl";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: Direction;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  dir: "ltr",
  isRTL: false,
});

const RTL_LANGUAGES: Language[] = ["he"];

function getDirection(lang: Language): Direction {
  return RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<Language>(
    () => (i18n.language?.startsWith("he") ? "he" : "en") as Language
  );

  const dir = getDirection(language);
  const isRTL = dir === "rtl";

  const setLanguage = useCallback(
    (lang: Language) => {
      setLanguageState(lang);
      i18n.changeLanguage(lang);
      document.documentElement.setAttribute("dir", getDirection(lang));
      document.documentElement.setAttribute("lang", lang);
      localStorage.setItem("formforge-lang", lang);
    },
    [i18n]
  );

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", language);
  }, [dir, language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, dir, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
