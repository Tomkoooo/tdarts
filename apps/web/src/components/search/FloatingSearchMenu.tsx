"use client"

import { useState } from "react"
import { IconFilter } from "@tabler/icons-react"
import { Input } from "@/components/ui/Input"
import { SearchTabs } from "./SearchTabs"
import { Button } from "@/components/ui/Button"
import { useTranslations } from "next-intl"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { FilterBar } from "./FilterBar"

interface FloatingSearchMenuProps {
    isVisible: boolean;
    query: string;
    onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
    isLoading?: boolean;
    filters: any;
    onFilterChange: (key: string, value: any) => void;
    cities: { city: string; count: number }[];
    hasActiveQuery?: boolean;
    onClearQuery?: () => void;
}

export function FloatingSearchMenu({
    isVisible,
    query,
    onQueryChange,
    activeTab,
    onTabChange,
    counts,
    filters,
    onFilterChange,
    cities,
    hasActiveQuery,
    onClearQuery,
}: FloatingSearchMenuProps) {
    const t = useTranslations('Search.floating_menu')
    const [isOpen, setIsOpen] = useState(false)

    if (!isVisible) return null

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 animate-in slide-in-from-bottom-2 duration-300">
                <Button
                    size="lg"
                    onClick={() => setIsOpen(true)}
                    className="h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/35 hover:bg-primary/90"
                >
                    <IconFilter className="mr-2 h-5 w-5" />
                    {t('title')}
                </Button>
            </div>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-border/60 bg-linear-to-b from-card to-background p-0 sm:max-w-none">
                <div className="p-4 md:p-6">
                    <SheetHeader className="mb-4 text-left">
                        <SheetTitle className="flex items-center gap-2">
                            <IconFilter className="h-5 w-5 text-primary" />
                            {t('title')}
                        </SheetTitle>
                        <SheetDescription>{t('search_placeholder')}</SheetDescription>
                    </SheetHeader>

                    <div className="space-y-4">
                        <Input
                            value={query}
                            onChange={onQueryChange}
                            placeholder={t('search_placeholder')}
                            className="h-11 rounded-xl border-border/60 bg-background/90"
                        />
                        <div className="overflow-x-auto pb-1">
                            <SearchTabs
                                activeTab={activeTab}
                                onTabChange={onTabChange}
                                counts={counts as any}
                            />
                        </div>
                        <FilterBar
                            activeTab={activeTab}
                            filters={filters}
                            onFilterChange={onFilterChange}
                            cities={cities}
                            hasActiveQuery={hasActiveQuery}
                            onClearQuery={onClearQuery}
                        />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
