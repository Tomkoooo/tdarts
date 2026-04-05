"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/Button";
import { IconLanguage } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useUserContext } from "@/hooks/useUser";
import { updateProfileAction } from "@/features/profile/actions";

const languages = [
  { code: "hu", name: "Magyar", flag: "🇭🇺" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "de", name: "Deutsch", flag: "🇩🇪", comingSoon: true },
  { code: "nl", name: "Dutch", flag: "🇳🇱", comingSoon: true },
  { code: "el", name: "Greek", flag: "🇬🇷", comingSoon: true },
  { code: "ro", name: "Română", flag: "🇷🇴", comingSoon: true },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user } = useUserContext();

  const handleLanguageChange = async (lang: typeof languages[0]) => {
    if (lang.comingSoon) return;
    router.replace({ pathname, query: params as any }, { locale: lang.code });
    if (user && (lang.code === 'hu' || lang.code === 'en' || lang.code === 'de')) {
      try {
        await updateProfileAction({ locale: lang.code as 'hu' | 'en' | 'de' });
      } catch {
        // Locale preference save failure is non-critical
      }
    }
  };

  const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-2 h-9 hover:bg-muted/50 transition-colors">
          <IconLanguage className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium hidden sm:inline">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-1">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            disabled={lang.comingSoon}
            className={`flex items-center justify-between gap-3 cursor-pointer rounded-sm px-2 py-1.5 ${
              locale === lang.code ? "bg-accent text-accent-foreground font-semibold" : ""
            } ${lang.comingSoon ? "opacity-50 cursor-not-allowed" : "hover:bg-accent hover:text-accent-foreground"}`}
            onClick={() => handleLanguageChange(lang)}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg leading-none">{lang.flag}</span>
              <span className="text-sm">{lang.name}</span>
            </div>
            {lang.comingSoon && (
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground uppercase font-bold tracking-tight">
                Soon
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
