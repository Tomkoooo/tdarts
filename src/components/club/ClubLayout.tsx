"use client"

import * as React from "react"
import { useRouter } from "@/i18n/routing"
import { usePathname, useSearchParams } from "next/navigation"
import { IconHome, IconTrophy, IconUsers, IconSettings, IconMedal } from "@tabler/icons-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton"
import { useTranslations } from "next-intl"
import { stripLocalePrefix } from "@/lib/seo"

interface ClubLayoutProps {
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  clubName: string
  summary: React.ReactNode
  players: React.ReactNode
  tournaments: React.ReactNode
  leagues: React.ReactNode
  settings?: React.ReactNode
  defaultPage?: 'summary' | 'players' | 'tournaments' | 'leagues' | 'settings' | 'website'
  landingPage?: {
    primaryColor?: string
    secondaryColor?: string
    logo?: string
    coverImage?: string
    backgroundColor?: string
    foregroundColor?: string
    cardColor?: string
    cardForegroundColor?: string
    aboutText?: string
    template?: string
    gallery?: string[]
    showMembers?: boolean
    showTournaments?: boolean
  }
}

export default function ClubLayout({
  userRole,
  clubName,
  summary,
  players,
  tournaments,
  leagues,
  settings,
  defaultPage = 'summary',
  landingPage,
}: ClubLayoutProps) {
  const t = useTranslations('Club.layout')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = React.useState<string>(defaultPage)

  // Sync activeTab with URL param
  React.useEffect(() => {
    const pageParam = searchParams.get('page')
    if (pageParam && ['summary', 'players', 'tournaments', 'leagues', 'settings'].includes(pageParam)) {
      setActiveTab(pageParam)
    }
  }, [searchParams])

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const normalizedPath = stripLocalePrefix(pathname || window.location.pathname || "/")
    router.push(`${normalizedPath}?page=${tab}`, { scroll: false })
  }

  const tabs = [
    { key: 'summary', label: t('summary'), icon: IconHome },
    { key: 'players', label: t('players'), icon: IconUsers },
    { key: 'tournaments', label: t('tournaments'), icon: IconTrophy },
    { key: 'leagues', label: t('leagues'), icon: IconMedal },
  ]

  if (userRole === 'admin' || userRole === 'moderator') {
    tabs.push({ key: 'settings', label: t('settings'), icon: IconSettings })
  }

  // Helper to convert hex to HSL object
  const hexToHSL = (hex: string) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt("0x" + hex[1] + hex[1]);
      g = parseInt("0x" + hex[2] + hex[2]);
      b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
      r = parseInt("0x" + hex[1] + hex[2]);
      g = parseInt("0x" + hex[3] + hex[4]);
      b = parseInt("0x" + hex[5] + hex[6]);
    }
    r /= 255;
    g /= 255;
    b /= 255;
    const cmin = Math.min(r, g, b),
          cmax = Math.max(r, g, b),
          delta = cmax - cmin;
    let h = 0, s = 0, l = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return { h, s, l };
  }

  // Generate CSS variables from landingPage settings
  const getCustomThemeStyles = () => {
    console.log("landingPage", landingPage);
    if (!landingPage) return '';

    let styles = '';
    
    // Primary Color Theme Derivation
    if (landingPage.primaryColor) {
        const primary = hexToHSL(landingPage.primaryColor);
        // Calculate foreground contrast
        const primaryFg = primary.l > 45 ? '0 0% 0%' : '0 0% 100%';

        styles += `
            --color-primary: ${landingPage.primaryColor} !important;
            --primary: ${primary.h} ${primary.s}% ${primary.l}% !important;
            --primary-foreground: ${primaryFg} !important;
            --ring: ${primary.h} ${primary.s}% ${primary.l}% !important;
            --color-ring: ${landingPage.primaryColor} !important;

            /* Derive theme backgrounds from Primary Hue to create a cohesive look */
            /* Using standard saturation/lightness rations from the dark theme */
            --background: ${primary.h} 50% 6% !important;
            --color-background: hsl(${primary.h}, 50%, 6%) !important;

            --card: ${primary.h} 30% 18% !important;
            --color-card: hsl(${primary.h}, 30%, 18%) !important;
            
            --popover: ${primary.h} 30% 18% !important;
            --color-popover: hsl(${primary.h}, 30%, 18%) !important;

            --muted: ${primary.h} 20% 30% !important;
            --color-muted: hsl(${primary.h}, 20%, 30%) !important;

            --border: ${primary.h} 30% 20% !important;
            --color-border: hsl(${primary.h}, 30%, 20%) !important;
            
            --input: ${primary.h} 30% 20% !important;
            --color-input: hsl(${primary.h}, 30%, 20%) !important;
        `;
    }

    // Secondary Color (Explicit override)
    if (landingPage.secondaryColor) {
        const secondary = hexToHSL(landingPage.secondaryColor);
        const secondaryFg = secondary.l > 45 ? '0 0% 0%' : '0 0% 100%';
        
        styles += `
            --color-secondary: ${landingPage.secondaryColor} !important;
            --secondary: ${secondary.h} ${secondary.s}% ${secondary.l}% !important;
            --secondary-foreground: ${secondaryFg} !important;
        `;
    }

    // Advanced Overrides
    if (landingPage.backgroundColor) {
        const bg = hexToHSL(landingPage.backgroundColor);
        styles += `
            --background: ${bg.h} ${bg.s}% ${bg.l}% !important;
            --color-background: ${landingPage.backgroundColor} !important;
        `;
    }

    if (landingPage.foregroundColor) {
        const fg = hexToHSL(landingPage.foregroundColor);
        styles += `
            --foreground: ${fg.h} ${fg.s}% ${fg.l}% !important;
            --color-foreground: ${landingPage.foregroundColor} !important;
        `;
    }

    if (landingPage.cardColor) {
        const card = hexToHSL(landingPage.cardColor);
        styles += `
            --card: ${card.h} ${card.s}% ${card.l}% !important;
            --color-card: ${landingPage.cardColor} !important;
            --popover: ${card.h} ${card.s}% ${card.l}% !important;
            --color-popover: ${landingPage.cardColor} !important;
        `;
    }

    if (landingPage.cardForegroundColor) {
        const cardFg = hexToHSL(landingPage.cardForegroundColor);
        styles += `
            --card-foreground: ${cardFg.h} ${cardFg.s}% ${cardFg.l}% !important;
            --color-card-foreground: ${landingPage.cardForegroundColor} !important;
            --popover-foreground: ${cardFg.h} ${cardFg.s}% ${cardFg.l}% !important;
            --color-popover-foreground: ${landingPage.cardForegroundColor} !important;
        `;
    }

    return styles;
  };

  return (
    <div className="min-h-screen bg-background club-layout-container">
      {landingPage && (
        <style jsx global>{`
          .club-layout-container {
            ${getCustomThemeStyles()}
          }
          /* Apply overriding styles to specific elements if CSS variables aren't enough */
          .club-hero-bg {
            background-color: ${landingPage?.primaryColor || 'var(--color-primary)'};
          }
        `}</style>
      )}
      
      <div className={`relative flex h-48 flex-col justify-end overflow-hidden pb-8 md:pb-0  md:h-64${
          landingPage?.coverImage ? '' : 'backdrop-blur-md bg-white/10'
      }`}>
        {landingPage?.coverImage ? (
             <>
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <ImageWithSkeleton 
                        src={landingPage.coverImage} 
                        alt={t("cover_12vl")} 
                        className="h-full w-full object-cover"
                        containerClassName="w-full h-full"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                </div>
             </>
        ) : (
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/10 to-primary/5" />
        )}

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-6 md:pb-10">
          <div className="flex items-center gap-4">
            <div className="flex w-48 items-center justify-center rounded-full bg-primary/20 backdrop-blur overflow-hidden border-2 border-white/20">
              {landingPage?.logo ? (
                  <ImageWithSkeleton src={landingPage.logo} alt={t("club_logo_x3a0")} className="h-full w-full object-cover" containerClassName="h-full w-full" />
              ) : (
                  <svg className="h-6 w-6 text-primary md:h-8 md:w-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground drop-shadow-md md:text-5xl" style={landingPage?.coverImage ? { color: 'white' } : {}}>{clubName}</h1>
              <p className="mt-2 text-sm text-muted-foreground" style={landingPage?.coverImage ? { color: 'rgba(255,255,255,0.8)' } : {}}>{t('subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-10 w-full max-w-6xl px-4 pb-12 md:-mt-14 mb-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="fixed bottom-0 left-0 z-50 w-full translate-y-0 rounded-t-2xl bg-card/95 p-2 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.3)] backdrop-blur md:sticky md:top-10 md:mb-6 md:w-full md:translate-y-[40px] md:rounded-2xl md:shadow-lg md:shadow-black/30">
            <TabsList className="flex w-full gap-0.5 overflow-x-auto rounded-2xl bg-transparent p-1 sm:flex-wrap sm:justify-between [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="flex min-w-[60px] items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/30 hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:min-w-[80px] sm:px-2.5 sm:text-sm"
                >
                  <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="rounded-2xl  p-6 shadow-xl shadow-black/35 md:p-8 min-h-[400px]">
            <TabsContent value="summary" className="mt-0">
              {summary}
            </TabsContent>
            <TabsContent value="players" className="mt-0">
              {players}
            </TabsContent>
            <TabsContent value="tournaments" className="mt-0">
              {tournaments}
            </TabsContent>
            <TabsContent value="leagues" className="mt-0">
              {leagues}
            </TabsContent>
            {(userRole === 'admin' || userRole === 'moderator') && (
              <>
                <TabsContent value="settings" className="mt-0">
                  {settings}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  )
}

