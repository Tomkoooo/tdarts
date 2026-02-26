'use client';
import { useTranslations } from "next-intl";


import Link from 'next/link';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconAlertTriangle, IconRefresh, IconArrowLeft } from '@tabler/icons-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LiveError({ error, reset }: ErrorProps) {
    const t = useTranslations("Tournament.live");
  useEffect(() => {
    console.error('Live page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconAlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">{t("hiba_történt_82")}</CardTitle>
          <CardDescription>
            {t("nem_sikerült_betölteni_85")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold text-sm mb-2">{t("lehetséges_okok")}</h3>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>{t("a_torna_nem")}</li>
              <li>{t("nincs_jogosultságod_az")}</li>
              <li>{t("hálózati_kapcsolat_problémák")}</li>
              <li>{t("szerver_hiba")}</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={reset}
              className="flex-1 gap-2"
            >
              <IconRefresh className="w-4 h-4" />
              {t("újra_próbálkozás")}</Button>
            <Button asChild variant="outline" className="flex-1 gap-2">
              <Link href="/tournaments">
                <IconArrowLeft className="w-4 h-4" />
                {t("darts")}</Link>
            </Button>
          </div>

          <div className="pt-2">
            <p className="text-xs text-muted-foreground text-center">
              {t("ha_a_probléma_40")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}