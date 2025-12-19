"use client"

import { useState } from "react"
import { IconSearch, IconX, IconFilter } from "@tabler/icons-react"
import { Input } from "@/components/ui/Input"
import { SearchTabs } from "./SearchTabs"
import { Button } from "@/components/ui/Button"

interface FloatingSearchMenuProps {
    isVisible: boolean;
    query: string;
    onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    activeTab: string;
    onTabChange: (tab: string) => void;
    counts: {
        tournaments: number;
        players: number;
        clubs: number;
        leagues: number;
    };
    isLoading?: boolean;
}

export function FloatingSearchMenu({
    isVisible,
    query,
    onQueryChange,
    activeTab,
    onTabChange,
    counts,
}: FloatingSearchMenuProps) {
    const [isOpen, setIsOpen] = useState(false)

    if (!isVisible) return null

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Floating Button */}
            <div className="fixed top-20 md:top-24 right-4 z-30 animate-in slide-in-from-top duration-300">
                {!isOpen ? (
                    <Button
                        size="lg"
                        onClick={() => setIsOpen(true)}
                        className="shadow-lg rounded-full h-12 px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        <IconSearch className="w-5 h-5" />
                        <span className="hidden sm:inline">Keresés & Szűrők</span>
                    </Button>
                ) : (
                    <div className="bg-background border border-border rounded-2xl shadow-2xl p-4 w-[calc(100vw-2rem)] sm:w-96 max-h-[70vh] overflow-y-auto animate-in slide-in-from-top duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <IconFilter className="w-5 h-5 text-primary" />
                                Keresés & Szűrők
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="h-8 w-8"
                            >
                                <IconX className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Search Input */}
                        <div className="relative mb-4">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input 
                                value={query}
                                onChange={onQueryChange}
                                placeholder="Keresés..." 
                                className="pl-10 h-10"
                            />
                        </div>

                        {/* Tabs */}
                        <div className="mb-4 [&_.grid-cols-4]:grid-cols-1">
                            <SearchTabs
                                activeTab={activeTab}
                                onTabChange={onTabChange}
                                counts={counts}
                            />
                        </div>

                        {/* Close Button */}
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setIsOpen(false)}
                        >
                            Bezárás
                        </Button>
                    </div>
                )}
            </div>
        </>
    )
}
