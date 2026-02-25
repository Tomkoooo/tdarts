import { useTranslations } from "next-intl";

export default function Loading() {
    const t = useTranslations("Auto");
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {/* Loading Spinner */}
        <div className="mb-8">
          <div className="w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto"></div>
        </div>
        
        {/* Loading Text */}
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t("betöltés")}</h2>
        <p className="text-muted-foreground">
          {t("kérjük_várj_az")}</p>
        
        {/* Progress Bar */}
        <div className="mt-8 w-64 mx-auto">
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}