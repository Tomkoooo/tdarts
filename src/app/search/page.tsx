"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useDebounce } from "use-debounce"
import { SearchTabs } from "@/components/search/SearchTabs"
import { FilterBar } from "@/components/search/FilterBar"
import { TournamentList } from "@/components/search/TournamentList"
import { PlayerLeaderboard } from "@/components/search/PlayerLeaderboard"
import { ClubList } from "@/components/search/ClubList"
import { LeagueList } from "@/components/search/LeagueList"
import { FloatingSearchMenu } from "@/components/search/FloatingSearchMenu"
import { Input } from "@/components/ui/Input"
import { IconSearch, IconLoader2 } from "@tabler/icons-react"
import type { SearchFilters } from "@/database/services/search.service"
import { Button } from "@/components/ui/Button"

// Define interfaces locally to avoid server-code import issues if any
interface TabCounts {
    tournaments: number;
    players: number;
    clubs: number;
    leagues: number;
}

export default function SearchPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    // --- State ---
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "tournaments")
    const [query, setQuery] = useState(searchParams.get("q") || "")
    const [debouncedQuery] = useDebounce(query, 500)
    const [isScrolled, setIsScrolled] = useState(false)
    
    // Sync query to URL
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (debouncedQuery) {
            params.set('q', debouncedQuery)
        } else {
            params.delete('q')
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }, [debouncedQuery, pathname, router]) // searchParams in dep array causes loops if not careful? 
    // Actually, we should probably rely on the updateUrl callback but it takes an object.
    // Let's use the standard router.replace for this isolated sync.
    
    // Scroll detection for floating menu
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 200)
        }
        
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])
    
    // Filters State (derived from URL on mount/update)
    const [filters, setFilters] = useState<SearchFilters>({
        status: searchParams.get("status") || undefined,
        type: (searchParams.get("type") as any) || undefined, // generic type vs tournamentType
        tournamentType: (searchParams.get("tournamentType") as any) || undefined,
        city: searchParams.get("city") || undefined,
        isVerified: searchParams.get("verified") === "true" || undefined,
        year: Number(searchParams.get("year")) || undefined,
        page: Number(searchParams.get("page")) || 1,
        limit: 10
    })

    // Data State
    const [results, setResults] = useState<any[]>([])
    const [counts, setCounts] = useState<TabCounts>({ tournaments: 0, players: 0, clubs: 0, leagues: 0 })
    const [metadata, setMetadata] = useState<{ cities: {city: string, count: number}[] }>({ cities: [] })
    const [isLoading, setIsLoading] = useState(false)
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 })

    // --- Sync URL with State ---
    const updateUrl = useCallback((newParams: any) => {
        const params = new URLSearchParams(searchParams.toString())
        
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "") {
                params.delete(key)
            } else {
                params.set(key, String(value))
            }
        })
        
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }, [searchParams, router, pathname])

    // --- Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                // Construct payload
                const payload = {
                    query: debouncedQuery,
                    tab: activeTab,
                    filters: {
                        ...filters,
                        page: filters.page
                    }
                }

                const res = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })

                if (!res.ok) throw new Error('Search failed')

                const data = await res.json()
                
                if (filters.page && filters.page > 1) {
                     setResults(prev => [...prev, ...data.results])
                } else {
                     setResults(data.results)
                }

                setCounts(data.counts || { tournaments: 0, players: 0, clubs: 0, leagues: 0 })
                if (data.metadata) setMetadata(data.metadata)
                if (data.pagination) setPagination(data.pagination)

                // Smart Tab Logic: 
                // If we have a query, and the current tab has 0 results, 
                // but EXACTLY ONE other tab has results, switch to it.
                if (debouncedQuery && data.counts) {
                    const currentCount = data.counts[activeTab as keyof TabCounts] || 0;
                    const resultEntries = Object.entries(data.counts) as [string, number][];
                    const tabsWithResults = resultEntries.filter(([, v]) => v > 0);

                    // If current tab is empty and there is exactly one other tab with results
                    if (currentCount === 0 && tabsWithResults.length === 1) {
                         const targetTab = tabsWithResults[0][0];
                         if (targetTab !== activeTab) {
                             setActiveTab(targetTab);
                             // Update URL without full reload
                             const params = new URLSearchParams(searchParams.toString());
                             params.set('tab', targetTab);
                             router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                         }
                    }
                }

            } catch (error) {
                console.error("Search error:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [debouncedQuery, activeTab, filters]) // Removed searchParams, pathname, router to prevent duplicate fetches

    const handleTabChange = (tab: string) => {
        setActiveTab(tab)
        setResults([]) // Clear results when switching tabs
        setPagination(prev => ({ ...prev, page: 1 })) // Reset pagination
        
        // Reset filters if no query is present 
        if (!query) {
             setFilters(prev => ({
                 ...prev,
                 status: undefined,
                 type: undefined,
                 tournamentType: undefined,
                 isVerified: undefined,
                 page: 1
             }))
             // Clear URL params for filters
             const params = new URLSearchParams(searchParams.toString());
             params.set('tab', tab);
             params.delete('status');
             params.delete('type');
             params.delete('tournamentType');
             params.delete('verified');
             params.delete('page'); // Also clear page param
             
             router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        } else {
             setFilters(prev => ({ ...prev, page: 1 }))
             updateUrl({ tab, page: 1 })
        }
    }

    const handleFilterChange = (key: string, value: any) => {
        setResults([]) // Clear results when filters change
        setFilters(prev => ({ ...prev, [key]: value, page: 1 })) 
        const urlKey = key === 'isVerified' ? 'verified' : key
        updateUrl({ [urlKey]: value, page: 1 })
    }

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value)
        setResults([]) // Clear results when search query changes
        setFilters(prev => ({ ...prev, page: 1 })) // Reset to first page
    }

    const loadMore = () => {
         const newPage = pagination.page + 1
         setFilters(prev => ({ ...prev, page: newPage }))
         updateUrl({ page: newPage })
    }


    // --- Render ---
    return (
        <div className="min-h-screen bg-background">
            {/* Floating Search Menu */}
            <FloatingSearchMenu
                isVisible={isScrolled}
                query={query}
                onQueryChange={handleSearch}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                counts={counts}
                isLoading={isLoading}
            />

            {/* Header / Search Bar Area */}
            <div className=" z-40 backdrop-blur-md border-b border-border">
                <div className="container mx-auto px-4 py-4 space-y-4">
                    <div className="relative max-w-2xl mx-auto">
                        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input 
                            value={query}
                            onChange={handleSearch}
                            placeholder="Keress versenyeket, játékosokat, klubokat..." 
                            className="pl-12 h-12 text-lg rounded-2xl border-border bg-background shadow-sm focus:ring-2 ring-primary/20 transition-all"
                        />
                         {isLoading && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <IconLoader2 className="w-5 h-5 animate-spin text-primary" />
                            </div>
                        )}
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <SearchTabs 
                            activeTab={activeTab} 
                            onTabChange={handleTabChange} 
                            counts={counts}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 max-w-7xl">
                
                {/* Filters */}
                <FilterBar 
                    activeTab={activeTab} 
                    filters={filters} 
                    onFilterChange={handleFilterChange}
                    cities={metadata.cities || []}
                    hasActiveQuery={!!debouncedQuery}
                />

                {/* Results View */}
                <div className="min-h-[400px]">
                    {/* Dynamic Header */}
                    {activeTab === 'tournaments' && (
                         <div className="mb-6">
                              <h2 className="text-2xl font-bold text-primary-foreground inline-block">
                                   {debouncedQuery ? 'Keresési Találatok' : (filters.status === 'all' ? 'Összes Torna' : 'Közelgő Tornák')}
                              </h2>
                              {debouncedQuery && results.length === 0 && (
                                   <p className="text-muted-foreground mt-1">Nincs találat a keresési feltételeknek megfelelően.</p>
                              )}
                         </div>
                    )}

                    {activeTab === 'tournaments' && <TournamentList tournaments={results} />}
                    {activeTab === 'players' && <PlayerLeaderboard players={results} />}
                    {activeTab === 'clubs' && <ClubList clubs={results} />}
                    {activeTab === 'leagues' && <LeagueList leagues={results} />}

                    {/* Load More Trigger / Button */}
                    {results.length > 0 && results.length < pagination.total && (
                        <div className="flex justify-center mt-12">
                             <Button 
                                variant="outline" 
                                size="lg" 
                                onClick={loadMore}
                                disabled={isLoading}
                                className="min-w-[200px]"
                             >
                                {isLoading ? (
                                    <>
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="h-64 bg-card rounded-lg animate-pulse" />
                                        ))}                      Betöltés...
                                    </>
                                ) : (
                                    'További találatok betöltése'
                                )}
                             </Button>
                        </div>
                    )}
                </div>

            </main>
        </div>
    )
}
