import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/Badge"

interface SearchTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    counts: {
        tournaments: number;
        players: number;
        clubs: number;
        leagues: number;
    };
}

export function SearchTabs({ activeTab, onTabChange, counts }: SearchTabsProps) {
    return (
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-base-200/50 backdrop-blur-sm rounded-xl">
                <TabsTrigger 
                    value="tournaments" 
                    className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                >
                    <span className="font-medium">Versenyek</span>
                    <Badge variant="secondary" className="bg-base-100/20 text-current border-0">
                        {counts.tournaments}
                    </Badge>
                </TabsTrigger>
                
                <TabsTrigger 
                    value="players" 
                    className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground transition-all duration-300"
                >
                     <span className="font-medium">Játékosok</span>
                     <Badge variant="secondary" className="bg-base-100/20 text-current border-0">
                        {counts.players}
                    </Badge>
                </TabsTrigger>
                
                <TabsTrigger 
                    value="clubs" 
                    className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground transition-all duration-300"
                >
                     <span className="font-medium">Klubok</span>
                     <Badge variant="secondary" className="bg-base-100/20 text-current border-0">
                        {counts.clubs}
                    </Badge>
                </TabsTrigger>
                
                <TabsTrigger 
                    value="leagues" 
                    className="flex flex-col sm:flex-row items-center gap-2 py-3 data-[state=active]:bg-info/20 data-[state=active]:text-info-foreground transition-all duration-300"
                >
                     <span className="font-medium">Ligák</span>
                     <Badge variant="secondary" className="bg-base-100/20 text-current border-0">
                        {counts.leagues}
                    </Badge>
                </TabsTrigger>
            </TabsList>
        </Tabs>
    )
}
