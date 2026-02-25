import { useTranslations } from "next-intl";

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconHome, IconRefresh, IconAlertTriangle } from '@tabler/icons-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
    const t = useTranslations("Auto");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Log the error to an error reporting service
    console.error('Global error caught:', error);
  }, [error, isClient]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconAlertTriangle size={48} className="text-destructive" />
          </div>
          <div className="w-32 h-1 bg-gradient-to-r from-destructive to-accent mx-auto rounded-full"></div>
        </div>

        {/* Main Content */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            {t("hiba_történt")}</h1>
          <p className="text-xl text-muted-foreground mb-6">
            {t("sajnos_valami_hiba")}</p>
          <p className="text-muted-foreground mb-4">
            {t("próbáld_meg_újratölteni")}</p>
          
          {/* Error Details (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-card/60 rounded-lg text-left border border-destructive/20">
              <h3 className="text-sm font-semibold text-foreground mb-2">{t("hiba_részletei_fejlesztői")}</h3>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t("error_id")}{error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button
            onClick={reset}
            className="flex items-center space-x-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-semibold shadow-lg shadow-primary/30"
          >
            <IconRefresh size={20} />
            <span>{t("újrapróbálkozás")}</span>
          </button>
          
          <Link 
            href="/"
            className="flex items-center space-x-2 px-8 py-4 bg-card text-foreground rounded-lg hover:bg-accent transition-all duration-200 font-semibold border border-primary/20"
          >
            <IconHome size={20} />
            <span>{t("főoldal")}</span>
          </Link>
        </div>

        {/* Additional Help */}
        <div className="p-6 bg-card/60 rounded-2xl border border-primary/10">
          <h3 className="text-lg font-semibold text-foreground mb-3">
            {t("mit_tehetsz")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">{t("azonnali_megoldások")}</h4>
              <ul className="space-y-1">
                <li>{t("kattints_az_ldquo")}</li>
                <li>{t("frissítsd_az_oldalt")}</li>
                <li>{t("töröld_a_böngésző")}</li>
              </ul>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">{t("alternatív_megoldások")}</h4>
              <ul className="space-y-1">
                <li>{t("lépj_vissza_a")}</li>
                <li>{t("próbáld_másik_böngészőben")}</li>
                <li>{t("ellenőrizd_az_internetkapcsolatot")}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-8 text-xs text-muted-foreground">
          <p>
            {t("ha_a_probléma")}</p>
          {error.digest && (
            <p className="mt-1">
              {t("hibajelentés_azonosító")}{error.digest}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
