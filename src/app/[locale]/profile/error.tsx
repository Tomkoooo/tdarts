"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { IconRefresh, IconArrowLeft } from "@tabler/icons-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProfileError({ error, reset }: ErrorProps) {
  const t = useTranslations("Common");

  useEffect(() => {
    console.error("Profile error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-xl font-semibold">{t("hiba_történt")}</h1>
        <p className="text-muted-foreground text-sm">{t("sajnos_valami_hiba")}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} className="gap-2">
            <IconRefresh className="w-4 h-4" />
            {t("újrapróbálkozás")}
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/profile">
              <IconArrowLeft className="w-4 h-4" />
              {t("back")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
