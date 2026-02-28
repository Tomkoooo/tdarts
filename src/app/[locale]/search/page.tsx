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
import { Link } from "@/i18n/routing"
import { IconArrowLeft } from "@tabler/icons-react"
import MapExplorer from "@/components/map/MapExplorer"
import { useTranslations } from "next-intl"

interface TabCounts {
    global: number;
    tournaments: number;
    players: number;
    clubs: number;
    leagues: number;
    map: number;
}

interface GroupedResults {
    tournaments: any[];
    players: any[];
    clubs: any[];
    leagues: any[];
}

export default function SearchPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const t = useTranslations('Search')

    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "tournaments")
    const [query, setQuery] = useState(searchParams.get("q") || "")
    const [debouncedQuery] = useDebounce(query, 500)
    const [isScrolled, setIsScrolled] = useState(false)
    
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (debouncedQuery) {
            params.set('q', debouncedQuery)
        } else {
            params.delete('q')
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }, [debouncedQuery, pathname, router])
    
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 200)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])
    
    const [filters, setFilters] = useState<SearchFilters>({
        status: searchParams.get("status") || undefined,
        type: (searchParams.get("type") as any) || undefined,
        tournamentType: (searchParams.get("tournamentType") as any) || undefined,
        city: searchParams.get("city") || undefined,
        isVerified: searchParams.get("verified") === "true" || undefined,
        isOac: searchParams.get("isOac") === "true" || undefined,
        year: Number(searchParams.get("year")) || undefined,
        rankingType: (searchParams.get("rankingType") as "oacMmr" | "leaguePoints") || undefined,
        playerMode: (searchParams.get("playerMode") as "all" | "individual" | "pair") || undefined,
        country: searchParams.get("country") || undefined,
        page: Number(searchParams.get("page")) || 1,
        limit: 10
    })

    const [results, setResults] = useState<any[]>([])
    const [groupedResults, setGroupedResults] = useState<GroupedResults>({ tournaments: [], players: [], clubs: [], leagues: [] })
    const [counts, setCounts] = useState<TabCounts>({ global: 0, tournaments: 0, players: 0, clubs: 0, leagues: 0, map: 0 })
    const [metadata, setMetadata] = useState<{ cities: {city: string, count: number}[] }>({ cities: [] })
    const [isLoading, setIsLoading] = useState(false)
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 })

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

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            try {
                if (activeTab === 'map') {
                    const mapRes = await fetch('/api/map', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: debouncedQuery }),
                    })
                    if (!mapRes.ok) throw new Error('Map search failed')
                    const mapData = await mapRes.json()
                    setResults(mapData.items || [])
                    setCounts((prev) => ({
                        ...prev,
                        map: mapData?.counts?.total || 0,
                    }))
                    setPagination({ total: mapData?.counts?.total || 0, page: 1, limit: 100 })
                    return
                }

                const payload = {
                    query: debouncedQuery,
                    tab: activeTab,
                    filters: { ...filters, page: filters.page }
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

                setCounts((prev) => ({
                    ...prev,
                    ...(data.counts || { global: 0, tournaments: 0, players: 0, clubs: 0, leagues: 0 }),
                }))
                setGroupedResults(data.groupedResults || { tournaments: [], players: [], clubs: [], leagues: [] })
                if (data.metadata) setMetadata(data.metadata)
                if (data.pagination) setPagination(data.pagination)

                if (debouncedQuery && data.counts) {
                    const currentCount = data.counts[activeTab as keyof TabCounts] || 0;
                    const resultEntries = Object.entries(data.counts) as [string, number][];
                    const tabsWithResults = resultEntries.filter(([, v]) => v > 0);
                    if (currentCount === 0 && tabsWithResults.length === 1) {
                        const targetTab = tabsWithResults[0][0];
                        if (targetTab !== activeTab) {
                            setActiveTab(targetTab);
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
    }, [debouncedQuery, activeTab, filters])

    const handleTabChange = (tab: string) => {
        setActiveTab(tab)
        setResults([])
        setPagination(prev => ({ ...prev, page: 1 }))
        
        if (!query) {
            setFilters(prev => ({
                ...prev,
                status: undefined,
                type: undefined,
                tournamentType: undefined,
                isVerified: undefined,
                playerMode: undefined,
                country: undefined,
                page: 1
            }))
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', tab);
            params.delete('status');
            params.delete('type');
            params.delete('tournamentType');
            params.delete('verified');
            params.delete('rankingType');
            params.delete('playerMode');
            params.delete('country');
            params.delete('page');
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        } else {
            setFilters(prev => ({ ...prev, page: 1 }))
            updateUrl({ tab, page: 1 })
        }
    }

    const handleFilterChange = (key: string, value: any) => {
        setResults([])
        if (key === 'multiple' && value && typeof value === 'object') {
            setFilters(prev => ({ ...prev, ...value, page: 1 }))
            updateUrl({ ...value, page: 1 })
            return
        }
        setFilters(prev => ({ ...prev, [key]: value, page: 1 })) 
        const urlKey = key === 'isVerified' ? 'verified' : key
        updateUrl({ [urlKey]: value, page: 1 })
    }

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value)
        setResults([])
        setFilters(prev => ({ ...prev, page: 1 }))
    }

    const loadMore = () => {
        const newPage = pagination.page + 1
        setFilters(prev => ({ ...prev, page: newPage }))
        updateUrl({ page: newPage })
    }

    return (
        <div className="min-h-screen bg-background">
            <FloatingSearchMenu
                isVisible={isScrolled}
                query={query}
                onQueryChange={handleSearch}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                counts={counts}
                isLoading={isLoading}
            />

            <div className="z-40 backdrop-blur-md border-b border-border">
                <div className="container mx-auto px-4 py-4 space-y-4">
                    <div className="flex gap-3 w-full justify-center">
                        <div className="relative w-[80%] items-center flex">
                            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                            <Input
                                value={query}
                                onChange={handleSearch}
                                placeholder={t('placeholder')}
                                className="px-12 h-12 text-lg rounded-2xl border-border bg-background shadow-sm focus:ring-2 ring-primary/20 transition-all"
                            />
                            {isLoading && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <IconLoader2 className="w-5 h-5 animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-center items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer bg-card px-4 py-2 rounded-full border border-border shadow-sm hover:bg-muted/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={!!filters.isOac}
                                    onChange={(e) => handleFilterChange('isOac', e.target.checked || undefined)}
                                    className="toggle toggle-sm toggle-primary"
                                />
                                <span className="text-sm font-bold text-foreground">{t('oac_toggle')}</span>
                            </label>
                        </div>
                    </div>

                    <div className="max-w-4xl mx-auto overflow-x-scroll">
                        <SearchTabs 
                            activeTab={activeTab} 
                            onTabChange={handleTabChange} 
                            counts={counts}
                        />
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                <FilterBar 
                    activeTab={activeTab} 
                    filters={filters} 
                    onFilterChange={handleFilterChange}
                    cities={metadata.cities || []}
                    hasActiveQuery={!!debouncedQuery}
                />

                <div className="min-h-[400px]">
                    {activeTab === 'tournaments' && (
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-primary-foreground inline-block">
                                {debouncedQuery ? t('results_title') : (filters.status === 'all' ? t('all_tournaments') : t('upcoming_tournaments'))}
                            </h2>
                            {debouncedQuery && results.length === 0 && (
                                <p className="text-muted-foreground mt-1">{t('no_results')}</p>
                            )}
                        </div>
                    )}

                    {filters.isOac && (
                        <div className="fixed bottom-6 left-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <Link href="https://amatordarts.hu" target="_blank" rel="noopener noreferrer">
                                <Button variant="secondary" size="sm" className="shadow-lg border-primary/20 bg-background/80 backdrop-blur hover:bg-primary hover:text-primary-foreground transition-all gap-2 group rounded-full px-4 h-12">
                                    <IconArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                    <span className="font-bold tracking-wide">{t('back_to_portal')}</span>
                                </Button>
                            </Link>
                        </div>
                    )}

                    {activeTab === 'tournaments' && <TournamentList tournaments={results} />}
                    {activeTab === 'global' && (
                        <div className="space-y-10">
                            <section className="space-y-4">
                                <h3 className="text-xl font-bold">{t('tabs.tournaments')}</h3>
                                <TournamentList tournaments={groupedResults.tournaments} />
                            </section>
                            <section className="space-y-4">
                                <h3 className="text-xl font-bold">{t('tabs.players')}</h3>
                                <PlayerLeaderboard
                                    players={groupedResults.players}
                                    isOac={!!filters.isOac}
                                    rankingType={filters.rankingType || (filters.isOac ? 'oacMmr' : undefined)}
                                    onRankingChange={(type) => handleFilterChange('rankingType', type)}
                                />
                            </section>
                            <section className="space-y-4">
                                <h3 className="text-xl font-bold">{t('tabs.clubs')}</h3>
                                <ClubList clubs={groupedResults.clubs} />
                            </section>
                            <section className="space-y-4">
                                <h3 className="text-xl font-bold">{t('tabs.leagues')}</h3>
                                <LeagueList leagues={groupedResults.leagues} />
                            </section>
                        </div>
                    )}
                    {activeTab === 'players' && (
                        <PlayerLeaderboard 
                            players={results} 
                            isOac={!!filters.isOac} 
                            rankingType={filters.rankingType || (filters.isOac ? 'oacMmr' : undefined)}
                            onRankingChange={(type) => handleFilterChange('rankingType', type)}
                        />
                    )}
                    {activeTab === 'clubs' && <ClubList clubs={results} />}
                    {activeTab === 'leagues' && <LeagueList leagues={results} />}
                    {activeTab === 'map' && <MapExplorer initialQuery={debouncedQuery} />}

                    {activeTab !== 'map' && activeTab !== 'global' && results.length > 0 && results.length < pagination.total && (
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
                                        ))}
                                        {t('loading')}
                                    </>
                                ) : (
                                    t('load_more')
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
