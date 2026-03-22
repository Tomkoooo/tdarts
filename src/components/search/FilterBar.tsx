import type { RefObject } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Input } from "@/components/ui/Input"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CityChips } from "./CityChips"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/Card"
import { BadgeCheck } from "lucide-react"
import { IconTrash } from "@tabler/icons-react"
import { getCountryOptions } from "@/lib/countries"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FilterBarProps {
    activeTab: string;
    filters: any;
    onFilterChange: (key: string, value: any) => void;
    cities: { city: string; count: number }[];
    hasActiveQuery?: boolean;
    onClearQuery?: () => void;
    /** Anchor for scroll-into-view from floating filters button */
    sectionRef?: RefObject<HTMLDivElement | null>;
}

export function FilterBar({ activeTab, filters, onFilterChange, cities, hasActiveQuery, onClearQuery, sectionRef }: FilterBarProps) {
    const t = useTranslations("Search.filters")
    const tBar = useTranslations("Search.filter_bar")

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 2023 }, (_, i) => currentYear - i); // [2025, 2024] etc.
    const countryOptions = getCountryOptions("hu");

    const showTournamentFilters = activeTab === "tournaments" || activeTab === "global";
    const showPlayerFilters = activeTab === "players" || activeTab === "global";
    const showFilterCard = showTournamentFilters || showPlayerFilters;
    const showCityChips =
        (activeTab === "tournaments" || activeTab === "clubs" || activeTab === "global") && cities.length > 0;

    return (
        <div ref={sectionRef} id="search-filters-section" className="flex scroll-mt-[calc(var(--search-sticky-offset,7rem)+0.5rem)] flex-col gap-4 mb-6">
            
            {/* City Filters - Horizontal Scrolling Chips */}
            {showCityChips && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                         <Label className="text-sm font-medium text-muted-foreground">{tBar("popular_cities")}</Label>
                    </div>
                    <CityChips 
                        cities={cities} 
                        selectedCity={filters.city} 
                        onSelectCity={(city) => onFilterChange('city', city)} 
                    />
                </div>
            )}

            {/* Stacked Filter Controls — also on Global (searchGlobal applies the same filters per type). */}
            {showFilterCard && (
            <Card className="p-4 bg-base-100 border-base-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-wrap gap-8 items-center">
                        
                        {/* Status Filter (Tournaments Only) */}
                        {showTournamentFilters && (
                            <div className="flex flex-col gap-2">
                                <Label className="text-sm font-semibold">{tBar("time_label")}</Label>
                                <RadioGroup 
                                    value={filters.status === 'all' ? 'all' : 'upcoming'} 
                                    onValueChange={(val) => {
                                        if (val === 'upcoming') {
                                            onFilterChange('multiple', {
                                                status: 'upcoming',
                                                startDatePreset: undefined,
                                                dateFromKey: undefined,
                                                dateToKey: undefined,
                                                page: 1,
                                            })
                                        } else {
                                            onFilterChange('status', val)
                                        }
                                    }}
                                    className="flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="upcoming" id="upcoming" />
                                        <Label htmlFor="upcoming" className="cursor-pointer">{tBar("upcoming")}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="all" id="all" />
                                        <Label htmlFor="all" className="cursor-pointer">{tBar("all")}</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        )}

                        {showTournamentFilters && (
                            <>
                                <Separator orientation="vertical" className="hidden md:block h-10" />
                                <div className="flex flex-col gap-2 min-w-[200px]">
                                    <Label className="text-sm font-semibold">{t("startDate_label")}</Label>
                                    <Select
                                        value={filters.startDatePreset || "any"}
                                        onValueChange={(val) => {
                                            if (val === "any") {
                                                onFilterChange("multiple", {
                                                    startDatePreset: undefined,
                                                    dateFromKey: undefined,
                                                    dateToKey: undefined,
                                                    page: 1,
                                                })
                                                return
                                            }
                                            if (val === "custom") {
                                                onFilterChange("multiple", {
                                                    status: "all",
                                                    startDatePreset: "custom",
                                                    dateFromKey: filters.dateFromKey,
                                                    dateToKey: filters.dateToKey,
                                                    page: 1,
                                                })
                                                return
                                            }
                                            onFilterChange("multiple", {
                                                status: "all",
                                                startDatePreset: val,
                                                dateFromKey: undefined,
                                                dateToKey: undefined,
                                                page: 1,
                                            })
                                        }}
                                    >
                                        <SelectTrigger className="w-[220px]">
                                            <SelectValue placeholder={t("startDate_any")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="any">{t("startDate_any")}</SelectItem>
                                            <SelectItem value="yesterday">{t("startDate_yesterday")}</SelectItem>
                                            <SelectItem value="last7">{t("startDate_last7")}</SelectItem>
                                            <SelectItem value="last30">{t("startDate_last30")}</SelectItem>
                                            <SelectItem value="custom">{t("startDate_custom")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {filters.startDatePreset === "custom" && (
                                        <div className="flex flex-wrap gap-3 items-end pt-1">
                                            <div className="flex flex-col gap-1">
                                                <Label className="text-xs text-muted-foreground">{t("startDate_from")}</Label>
                                                <Input
                                                    type="date"
                                                    className="w-[150px]"
                                                    value={filters.dateFromKey || ""}
                                                    onChange={(e) =>
                                                        onFilterChange("multiple", {
                                                            status: "all",
                                                            startDatePreset: "custom",
                                                            dateFromKey: e.target.value || undefined,
                                                            dateToKey: filters.dateToKey,
                                                            page: 1,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <Label className="text-xs text-muted-foreground">{t("startDate_to")}</Label>
                                                <Input
                                                    type="date"
                                                    className="w-[150px]"
                                                    value={filters.dateToKey || ""}
                                                    onChange={(e) =>
                                                        onFilterChange("multiple", {
                                                            status: "all",
                                                            startDatePreset: "custom",
                                                            dateFromKey: filters.dateFromKey,
                                                            dateToKey: e.target.value || undefined,
                                                            page: 1,
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Player Year Filter */}
                        {showPlayerFilters && (
                            <>
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold">{tBar("season_label")}</Label>
                                    <Select 
                                        value={filters.year ? String(filters.year) : String(currentYear)} 
                                        onValueChange={(val) => onFilterChange('year', val === String(currentYear) ? undefined : Number(val))}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder={tBar("select_year")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={String(currentYear)}>{tBar("current_season")}</SelectItem>
                                            {years.slice(1).map(year => (
                                                <SelectItem key={year} value={String(year)}>{tBar("year_season", { year })}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator orientation="vertical" className="hidden md:block h-10" />
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold">{tBar("player_mode_label")}</Label>
                                    <RadioGroup
                                        value={filters.playerMode || 'all'}
                                        onValueChange={(val) => onFilterChange('playerMode', val === 'all' ? undefined : val)}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="all" id="player-type-all" />
                                            <Label htmlFor="player-type-all" className="cursor-pointer">{tBar("player_mode_all")}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="individual" id="player-type-individual" />
                                            <Label htmlFor="player-type-individual" className="cursor-pointer">{tBar("player_mode_individual")}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="pair" id="player-type-pair" />
                                            <Label htmlFor="player-type-pair" className="cursor-pointer">{tBar("player_mode_pair")}</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </>
                        )}

                        {/* Type Filter (Tournaments Only) */}
                        {showTournamentFilters && (
                            <>
                                <Separator orientation="vertical" className="hidden md:block h-10" />
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold">{tBar("type_label")}</Label>
                                    <RadioGroup 
                                        value={filters.tournamentType || 'all'} 
                                        onValueChange={(val) => onFilterChange('tournamentType', val === 'all' ? undefined : val)}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="all" id="type-all" />
                                            <Label htmlFor="type-all" className="cursor-pointer">{tBar("type_all")}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="amateur" id="amateur" />
                                            <Label htmlFor="amateur" className="cursor-pointer">{tBar("type_amateur")}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="open" id="open" />
                                            <Label htmlFor="open" className="cursor-pointer">{tBar("type_open")}</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </>
                        )}

                        {/* Country Filter */}
                        <>
                            <Separator orientation="vertical" className="hidden md:block h-10" />
                            <div className="flex flex-col gap-2">
                                <Label className="text-sm font-semibold">Ország</Label>
                                <Select
                                    value={filters.country || 'all'}
                                    onValueChange={(val) => onFilterChange('country', val === 'all' ? undefined : val)}
                                >
                                    <SelectTrigger className="w-[210px]">
                                        <SelectValue placeholder="Minden ország" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72">
                                        <SelectItem value="all">Minden ország</SelectItem>
                                        {countryOptions.map((country) => (
                                            <SelectItem key={country.value} value={country.value}>
                                                {country.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>

                        {/* Verified Toggle (Tournaments Only) */}
                        {showTournamentFilters && (
                        <>
                        <Separator orientation="vertical" className="hidden md:block h-10" />
                        <div className="flex flex-col gap-2">
                             <Label className="text-sm font-semibold flex items-center gap-1.5">
                                {tBar("verification_label")}
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
                                            <BadgeCheck className="w-4 h-4" /> {tBar("verified_showing")}
                                        </span>
                                    ) : (
                                        tBar("verified_only")
                                    )}
                                </Label>
                            </div>
                        </div>
                        </>
                        )}

                    </div>

                    {/* Clear Filters Button */}
                    {(filters.status === 'all' || filters.tournamentType || filters.isVerified || filters.city || filters.year || filters.playerMode || filters.country || filters.startDatePreset || filters.dateFromKey || filters.dateToKey || hasActiveQuery) && (
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
                                    playerMode: undefined,
                                    country: undefined,
                                    startDatePreset: undefined,
                                    dateFromKey: undefined,
                                    dateToKey: undefined,
                                    page: 1
                                });
                                if (onClearQuery) onClearQuery();
                            }}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            title={tBar("clear_filters_title")}
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
