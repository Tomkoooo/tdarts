import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CityChips } from "./CityChips"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/Card"
import { BadgeCheck } from "lucide-react"
import { IconTrash } from "@tabler/icons-react"

interface FilterBarProps {
    activeTab: string;
    filters: any;
    onFilterChange: (key: string, value: any) => void;
    cities: { city: string; count: number }[];
    hasActiveQuery?: boolean;
    onClearQuery?: () => void;
}

export function FilterBar({ activeTab, filters, onFilterChange, cities, hasActiveQuery, onClearQuery }: FilterBarProps) {
    if (activeTab === 'players') return null; // No filters for players

    return (
        <div className="flex flex-col gap-4 mb-6">
            
            {/* City Filters - Horizontal Scrolling Chips */}
            {(activeTab === 'tournaments' || activeTab === 'clubs') && cities.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                         <Label className="text-sm font-medium text-muted-foreground">Népszerű városok</Label>
                    </div>
                    <CityChips 
                        cities={cities} 
                        selectedCity={filters.city} 
                        onSelectCity={(city) => onFilterChange('city', city)} 
                    />
                </div>
            )}

            {/* Stacked Filter Controls */}
            <Card className="p-4 bg-base-100 border-base-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-wrap gap-8 items-center">
                        
                        {/* Status Filter (Tournaments Only) */}
                        {activeTab === 'tournaments' && (
                            <div className="flex flex-col gap-2">
                                <Label className="text-sm font-semibold">Időpont</Label>
                                <RadioGroup 
                                    value={filters.status === 'all' ? 'all' : 'upcoming'} 
                                    onValueChange={(val) => onFilterChange('status', val)}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="upcoming" id="upcoming" />
                                        <Label htmlFor="upcoming" className="cursor-pointer">Közelgő</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="all" id="all" />
                                        <Label htmlFor="all" className="cursor-pointer">Összes</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        )}

                        {/* Type Filter (Tournaments Only) */}
                        {activeTab === 'tournaments' && (
                            <>
                                <Separator orientation="vertical" className="hidden md:block h-10" />
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold">Típus</Label>
                                    <RadioGroup 
                                        value={filters.tournamentType || 'all'} 
                                        onValueChange={(val) => onFilterChange('tournamentType', val === 'all' ? undefined : val)}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="all" id="type-all" />
                                            <Label htmlFor="type-all" className="cursor-pointer">Mind</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="amateur" id="amateur" />
                                            <Label htmlFor="amateur" className="cursor-pointer">Amatőr</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="open" id="open" />
                                            <Label htmlFor="open" className="cursor-pointer">Nyílt</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </>
                        )}

                        {/* Verified Toggle (All except Players) */}
                        <Separator orientation="vertical" className="hidden md:block h-10" />
                        <div className="flex flex-col gap-2">
                             <Label className="text-sm font-semibold flex items-center gap-1.5">
                                Hitelesítés
                             </Label>
                            <div className="flex items-center space-x-3 h-6">
                                <Checkbox 
                                    id="verified" 
                                    checked={!!filters.isVerified}
                                    onCheckedChange={(checked: boolean) => onFilterChange('isVerified', checked ? true : undefined)}
                                />
                                <Label htmlFor="verified" className="cursor-pointer font-normal flex items-center gap-1.5 text-muted-foreground">
                                    {filters.isVerified ? (
                                        <span className="text-blue-600 font-medium flex items-center gap-1">
                                            <BadgeCheck className="w-4 h-4" /> Hitelesített megjelenítése
                                        </span>
                                    ) : (
                                        "Csak hitelesített"
                                    )}
                                </Label>
                            </div>
                        </div>

                    </div>

                    {/* Clear Filters Button (Show if any filter is active OR query exists) */}
                    {(filters.status === 'all' || filters.tournamentType || filters.isVerified || filters.city || hasActiveQuery) && (
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                                onFilterChange('multiple', {
                                    status: 'upcoming',
                                    tournamentType: undefined,
                                    isVerified: undefined,
                                    city: undefined,
                                    page: 1
                                });
                                if (onClearQuery) onClearQuery();
                            }}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            title="Szűrők törlése"
                        >
                            <IconTrash className="w-5 h-5" />
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    )
}
