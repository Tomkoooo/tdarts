import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { IconLoader2 } from '@tabler/icons-react';

export default function LiveLoading() {
    const t = useTranslations("Auto");
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconLoader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <CardTitle className="text-xl">{t("élő_közvetítés_betöltése")}</CardTitle>
          <CardDescription>
            {t("kérjük_várj_amíg")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{t("tournament_adatok")}</span>
                <IconLoader2 className="h-3 w-3 animate-spin" />
              </div>
              <div className="h-1 w-full bg-muted overflow-hidden rounded-full">
                <div className="h-full bg-primary/50 w-1/3 animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{t("jogosultság_ellenőrzés")}</span>
                <IconLoader2 className="h-3 w-3 animate-spin" />
              </div>
              <div className="h-1 w-full bg-muted overflow-hidden rounded-full">
                <div className="h-full bg-primary/50 w-2/3 animate-[shimmer_2s_infinite_0.2s]"></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{t("kapcsolódás_a_szerverhez")}</span>
                <IconLoader2 className="h-3 w-3 animate-spin" />
              </div>
              <div className="h-1 w-full bg-muted overflow-hidden rounded-full">
                <div className="h-full bg-primary/50 w-1/2 animate-[shimmer_2s_infinite_0.4s]"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}