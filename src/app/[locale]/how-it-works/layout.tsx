import { Metadata } from "next"
export function generateMetadata(): Metadata {
    return {
        title: "Hogyan működik?",
        description: "tDarts rendszer használatával kapcsolatos információk és kisokos",
        openGraph: {
            title: "Hogyan működik?",
            description: "tDarts rendszer használatával kapcsolatos információk és kisokos",
            url: "https://tdarts.hu/how-it-works",
            siteName: "tDarts",
            locale: "hu_HU",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: "Hogyan működik?",
            description: "tDarts rendszer használatával kapcsolatos információk és kisokos",
        },
    }
}

export default async function HowItWorksLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}