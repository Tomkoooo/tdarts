import { Metadata } from "next"
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Auto" });
    return {
        title: t("hogyan_mukodik_247b"),
        description: "tDarts rendszer használatával kapcsolatos információk és kisokos",
        openGraph: {
            title: t("hogyan_mukodik_247b"),
            description: "tDarts rendszer használatával kapcsolatos információk és kisokos",
            url: "https://tdarts.hu/how-it-works",
            siteName: "tDarts",
            locale: "hu_HU",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: t("hogyan_mukodik_247b"),
            description: "tDarts rendszer használatával kapcsolatos információk és kisokos",
        },
    }
}

export default async function HowItWorksLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}