import { useTranslations } from "next-intl";
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconAlertCircle, IconArrowLeft, IconSearch } from '@tabler/icons-react';

export default function LiveNotFound() {
    const t = useTranslations("Auto");
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <IconAlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{t("élő_közvetítés_nem")}</CardTitle>
          <CardDescription>
            {t("a_keresett_élő")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold text-sm mb-2">{t("lehetséges_okok")}</h3>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>{t("a_torna_nem_82")}</li>
              <li>{t("a_torna_törölve")}</li>
              <li>{t("nincs_jogosultságod_az")}</li>
              <li>{t("hibás_url")}</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button asChild className="flex-1 gap-2">
              <Link href="/tournaments">
                <IconArrowLeft className="w-4 h-4" />
                {t("vissza")}</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 gap-2">
              <Link href="/search">
                <IconSearch className="w-4 h-4" />
                {t("keresés")}</Link>
            </Button>
          </div>

          <div className="pt-2">
            <p className="text-xs text-muted-foreground text-center">
              {t("ha_úgy_gondolod")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}