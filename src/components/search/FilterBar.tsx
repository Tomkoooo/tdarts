import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CityChips } from "./CityChips"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/Card"
import { BadgeCheck } from "lucide-react"
import { IconTrash } from "@tabler/icons-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslations } from "next-intl"

interface FilterBarProps {
    activeTab: string;
    filters: any;
    onFilterChange: (key: string, value: any) => void;
    cities: { city: string; count: number }[];
    hasActiveQuery?: boolean;
    onClearQuery?: () => void;
}

export function FilterBar({ activeTab, filters, onFilterChange, cities, hasActiveQuery, onClearQuery }: FilterBarProps) {
    const t = useTranslations('Search.filter_bar')

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 2023 }, (_, i) => currentYear - i);

    return (
        <div className="flex flex-col gap-4 mb-6">
            
            {/* City Filters - Horizontal Scrolling Chips */}
            {(activeTab === 'tournaments' || activeTab === 'clubs') && cities.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                         <Label className="text-sm font-medium text-muted-foreground">{t('popular_cities')}</Label>
                    </div>
                    <CityChips 
                        cities={cities} 
                        selectedCity={filters.city} 
                        onSelectCity={(city) => onFilterChange('city', city)} 
                    />
                </div>
            )}

            {/* Stacked Filter Controls */}
            {(activeTab === 'tournaments' || activeTab === 'players') && (
            <Card className="p-4 bg-base-100 border-base-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-wrap gap-8 items-center">
                        
                        {/* Status Filter (Tournaments Only) */}
                        {activeTab === 'tournaments' && (
                            <div className="flex flex-col gap-2">
                                <Label className="text-sm font-semibold">{t('time_label')}</Label>
                                <RadioGroup 
                                    value={filters.status === 'all' ? 'all' : 'upcoming'} 
                                    onValueChange={(val) => onFilterChange('status', val)}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="upcoming" id="upcoming" />
                                        <Label htmlFor="upcoming" className="cursor-pointer">{t('upcoming')}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="all" id="all" />
                                        <Label htmlFor="all" className="cursor-pointer">{t('all')}</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        )}

                        {/* Player Year Filter */}
                        {activeTab === 'players' && (
                            <div className="flex flex-col gap-2">
                                <Label className="text-sm font-semibold">{t('season_label')}</Label>
                                <Select 
                                    value={filters.year ? String(filters.year) : String(currentYear)} 
                                    onValueChange={(val) => onFilterChange('year', val === String(currentYear) ? undefined : Number(val))}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder={t('select_year')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={String(currentYear)}>{t('current_season')}</SelectItem>
                                        {years.slice(1).map(year => (
                                            <SelectItem key={year} value={String(year)}>{t('year_season', { year })}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Type Filter (Tournaments Only) */}
                        {activeTab === 'tournaments' && (
                            <>
                                <Separator orientation="vertical" className="hidden md:block h-10" />
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold">{t('type_label')}</Label>
                                    <RadioGroup 
                                        value={filters.tournamentType || 'all'} 
                                        onValueChange={(val) => onFilterChange('tournamentType', val === 'all' ? undefined : val)}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="all" id="type-all" />
                                            <Label htmlFor="type-all" className="cursor-pointer">{t('type_all')}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="amateur" id="amateur" />
                                            <Label htmlFor="amateur" className="cursor-pointer">{t('type_amateur')}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="open" id="open" />
                                            <Label htmlFor="open" className="cursor-pointer">{t('type_open')}</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </>
                        )}

                        {/* Verified Toggle (Tournaments Only) */}
                        {activeTab === 'tournaments' && (
                        <>
                        <Separator orientation="vertical" className="hidden md:block h-10" />
                        <div className="flex flex-col gap-2">
                             <Label className="text-sm font-semibold flex items-center gap-1.5">
                                {t('verification_label')}
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
                                            <BadgeCheck className="w-4 h-4" /> {t('verified_showing')}
                                        </span>
                                    ) : (
                                        t('verified_only')
                                    )}
                                </Label>
                            </div>
                        </div>
                        </>
                        )}

                    </div>

                    {/* Clear Filters Button */}
                    {(filters.status === 'all' || filters.tournamentType || filters.isVerified || filters.city || filters.year || hasActiveQuery) && (
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                                onFilterChange('multiple', {
                                    status: 'upcoming',
                                    tournamentType: undefined,
                                    isVerified: undefined,
                                    city: undefined,
                                    year: undefined,
                                    page: 1
                                });
                                if (onClearQuery) onClearQuery();
                            }}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            title={t('clear_filters_title')}
                        >
                            <IconTrash className="w-5 h-5" />
                        </Button>
                    )}
                </div>
            </Card>
            )}
        </div>
    )
}
