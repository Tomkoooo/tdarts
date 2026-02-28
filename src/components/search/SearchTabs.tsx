import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/Badge"
import { getMapSettingsTranslations } from "@/data/translations/map-settings"

interface SearchTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    counts: {
        global: number;
        tournaments: number;
        players: number;
        clubs: number;
        leagues: number;
        map?: number;
    };
}

export function SearchTabs({ activeTab, onTabChange, counts }: SearchTabsProps) {
    const t = getMapSettingsTranslations(typeof navigator !== 'undefined' ? navigator.language : 'hu')
    return (
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="flex w-full min-w-max gap-1 h-auto p-1 bg-base-200/50 backdrop-blur-sm rounded-xl overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <TabsTrigger
                    value="global"
                    className="shrink-0 min-w-[120px] flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground transition-all duration-300"
                >
                    <span className="font-medium">Globális</span>
                    <Badge variant="secondary" className="bg-base-100/20 text-current border-0">
                        {counts.global}
                    </Badge>
                </TabsTrigger>
                <TabsTrigger 
                    value="tournaments" 
                    className="shrink-0 min-w-[120px] flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                >
                    <span className="font-medium">Versenyek</span>
                    <Badge variant="secondary" className="bg-base-100/20 text-current border-0">
                        {counts.tournaments}
                    </Badge>
                </TabsTrigger>
                
                <TabsTrigger 
                    value="players" 
                    className="shrink-0 min-w-[120px] flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground transition-all duration-300"
                >
                     <span className="font-medium">Játékosok</span>
                     <Badge variant="secondary" className="bg-base-100/20 text-current border-0">
                        {counts.players}
                    </Badge>
                </TabsTrigger>
                
                <TabsTrigger 
                    value="clubs" 
                    className="shrink-0 min-w-[120px] flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-all duration-300"
                >
                     <span className="font-medium">Klubok</span>
                     <Badge variant="secondary" className="bg-base-100/20 text-current border-0">
                        {counts.clubs}
                    </Badge>
                </TabsTrigger>
                
                <TabsTrigger 
                    value="leagues" 
                    className="shrink-0 min-w-[120px] flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-info/20 data-[state=active]:text-info-foreground transition-all duration-300"
                >
                     <span className="font-medium">Ligák</span>
                     <Badge variant="secondary" className="bg-base-100/20 text-current border-0">
                        {counts.leagues}
                    </Badge>
                </TabsTrigger>
                <TabsTrigger
                    value="map"
                    className="shrink-0 min-w-[120px] flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-warning/20 data-[state=active]:text-warning-foreground transition-all duration-300"
                >
                     <span className="font-medium">{t.mapPageTitle}</span>
                     <Badge variant="secondary" className="bg-base-100/20 text-current border-0">
                        {counts.map ?? 0}
                    </Badge>
                </TabsTrigger>
            </TabsList>
        </Tabs>
    )
}
