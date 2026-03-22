"use client"

import { useState, useEffect, useCallback, useRef, type CSSProperties, type ChangeEvent } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useDebounce } from "use-debounce"
import { SearchTabs } from "@/components/search/SearchTabs"
import { FilterBar } from "@/components/search/FilterBar"
import { TournamentList } from "@/components/search/TournamentList"
import { PlayerLeaderboard } from "@/components/search/PlayerLeaderboard"
import { ClubList } from "@/components/search/ClubList"
import { LeagueList } from "@/components/search/LeagueList"
import { Input } from "@/components/ui/Input"
import { IconSearch, IconLoader2, IconFilter } from "@tabler/icons-react"
import type { SearchFilters } from "@/database/services/search.service"
import { Button } from "@/components/ui/Button"
import { Link } from "@/i18n/routing"
import { IconArrowLeft } from "@tabler/icons-react"
import MapExplorer from "@/components/map/MapExplorer"
import { useTranslations } from "next-intl"
import { getUserTimeZone } from "@/lib/date-time"
import { searchAction } from "@/features/search/actions/search.action"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

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
    const tFloat = useTranslations('Search.floating_filters')
    const userTimeZone = getUserTimeZone()

    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "global")
    const [query, setQuery] = useState(searchParams.get("q") || "")
    const [debouncedQuery] = useDebounce(query, 500)
    const [headerHeight, setHeaderHeight] = useState(112)
    const headerRef = useRef<HTMLDivElement | null>(null)
    const filterSectionRef = useRef<HTMLDivElement | null>(null)
    const [showFiltersFab, setShowFiltersFab] = useState(false)
    
    const parseFiltersFromUrl = useCallback((): SearchFilters => ({
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
        startDatePreset: searchParams.get("startDatePreset") || undefined,
        dateFromKey: searchParams.get("dateFrom") || undefined,
        dateToKey: searchParams.get("dateTo") || undefined,
        page: Number(searchParams.get("page")) || 1,
    }), [searchParams])

    useEffect(() => {
        const urlTab = searchParams.get("tab") || "global"
        const urlQuery = searchParams.get("q") || ""
        setActiveTab(prev => (prev === urlTab ? prev : urlTab))
        setQuery(prev => (prev === urlQuery ? prev : urlQuery))
        const nextFromUrl = parseFiltersFromUrl()
        setFilters(prev => {
            const next = { ...prev, ...nextFromUrl }
            return JSON.stringify(prev) === JSON.stringify(next) ? prev : next
        })
    }, [searchParams, parseFiltersFromUrl])

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (debouncedQuery) {
            params.set('q', debouncedQuery)
        } else {
            params.delete('q')
        }
        const nextUrl = `${pathname}?${params.toString()}`
        const currentUrl = `${pathname}?${searchParams.toString()}`
        if (nextUrl !== currentUrl) {
            router.replace(nextUrl, { scroll: false })
        }
    }, [debouncedQuery, pathname, router, searchParams])
    
    useEffect(() => {
        if (!headerRef.current) return
        const element = headerRef.current
        const updateHeight = () => setHeaderHeight(Math.ceil(element.getBoundingClientRect().height) + 8)
        updateHeight()
        const observer = new ResizeObserver(updateHeight)
        observer.observe(element)
        return () => observer.disconnect()
    }, [])
    
    const [filters, setFilters] = useState<SearchFilters>({
        ...parseFiltersFromUrl(),
        limit: 10
    })

    const [results, setResults] = useState<any[]>([])
    const [groupedResults, setGroupedResults] = useState<GroupedResults>({ tournaments: [], players: [], clubs: [], leagues: [] })
    const [counts, setCounts] = useState<TabCounts>({ global: 0, tournaments: 0, players: 0, clubs: 0, leagues: 0, map: 0 })
    const [metadata, setMetadata] = useState<{ cities: {city: string, count: number}[] }>({ cities: [] })
    const [isLoading, setIsLoading] = useState(false)
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10 })
    const latestRequestIdRef = useRef(0)
    const lastFetchKeyRef = useRef<string>("")

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
            const requestTab = activeTab
            const requestPage = Number(filters.page || 1)
            const requestKey = JSON.stringify({
                requestTab,
                debouncedQuery,
                filters,
                userTimeZone,
            })
            if (requestKey === lastFetchKeyRef.current) return
            lastFetchKeyRef.current = requestKey
            const requestId = ++latestRequestIdRef.current
            setIsLoading(true)
            try {
                if (requestTab === 'map') {
                    // Map tab has its own canonical data source inside MapExplorer.
                    if (requestId === latestRequestIdRef.current) {
                        setResults([])
                        setPagination({ total: 0, page: 1, limit: 100 })
                    }
                    return
                }

                const data = await searchAction({
                    query: debouncedQuery,
                    tab: requestTab,
                    filters: { ...filters, page: filters.page, timeZone: userTimeZone },
                    includeCounts: requestPage === 1,
                    includeMetadata: requestPage === 1,
                })
                if (requestId !== latestRequestIdRef.current) return
                
                if (requestPage > 1 && requestTab === activeTab) {
                    setResults(prev => [...prev, ...data.results])
                } else {
                    setResults(data.results)
                }

                if (data.counts) {
                    setCounts((prev) => ({
                        ...prev,
                        ...data.counts,
                    }))
                }
                setGroupedResults(data.groupedResults || { tournaments: [], players: [], clubs: [], leagues: [] })
                if (data.pagination) setPagination(data.pagination)
                if (requestPage === 1 && data.metadata) {
                    setMetadata(data.metadata)
                }

            } catch (error) {
                console.error("Search error:", error)
                if (requestId === latestRequestIdRef.current) {
                    // Prevent stale cross-tab UI when the active request fails.
                    if (requestTab === 'global') {
                        setGroupedResults({ tournaments: [], players: [], clubs: [], leagues: [] })
                    } else {
                        setResults([])
                    }
                    setPagination(prev => ({ ...prev, total: 0, page: 1 }))
                }
            } finally {
                if (requestId === latestRequestIdRef.current) {
                    setIsLoading(false)
                }
            }
        }

        fetchData()
    }, [debouncedQuery, activeTab, filters, userTimeZone])

    useEffect(() => {
        if (typeof document === "undefined") return
        document.documentElement.style.setProperty("--search-sticky-offset", `${headerHeight}px`)
    }, [headerHeight])

    useEffect(() => {
        if (activeTab === "map") {
            setShowFiltersFab(false)
            return
        }
        const updateFab = () => {
            const el = filterSectionRef.current
            if (!el) {
                setShowFiltersFab(false)
                return
            }
            const bottom = el.getBoundingClientRect().bottom
            setShowFiltersFab(bottom < headerHeight + 24)
        }
        updateFab()
        window.addEventListener("scroll", updateFab, { passive: true })
        window.addEventListener("resize", updateFab)
        const tId = window.setTimeout(updateFab, 350)
        return () => {
            window.removeEventListener("scroll", updateFab)
            window.removeEventListener("resize", updateFab)
            window.clearTimeout(tId)
        }
    }, [
        activeTab,
        headerHeight,
        isLoading,
        debouncedQuery,
        groupedResults.tournaments.length,
        groupedResults.players.length,
        metadata.cities.length,
        results.length,
    ])

    const handleTabChange = (tab: string) => {
        setActiveTab(tab)
        setResults([])
        setGroupedResults({ tournaments: [], players: [], clubs: [], leagues: [] })
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
            params.delete('startDatePreset');
            params.delete('dateFrom');
            params.delete('dateTo');
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        } else {
            setFilters(prev => ({ ...prev, page: 1 }))
            updateUrl({ tab, page: 1 })
        }
    }

    const handleFilterChange = (key: string, value: any) => {
        setResults([])
        if (key === 'multiple' && value && typeof value === 'object') {
            const next = { ...value, page: 1 } as Record<string, unknown>
            setFilters(prev => ({ ...prev, ...next }))
            const urlParams: Record<string, string | number | undefined> = { ...next }
            if ('dateFromKey' in value) {
                urlParams.dateFrom = value.dateFromKey as string | undefined
                delete (urlParams as any).dateFromKey
            }
            if ('dateToKey' in value) {
                urlParams.dateTo = value.dateToKey as string | undefined
                delete (urlParams as any).dateToKey
            }
            updateUrl(urlParams)
            return
        }
        setFilters(prev => ({ ...prev, [key]: value, page: 1 })) 
        const urlKey = key === 'isVerified' ? 'verified' : key
        updateUrl({ [urlKey]: value, page: 1 })
    }

    const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
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
        <div
            className="min-h-screen bg-background"
            style={{ ["--search-sticky-offset" as string]: `${headerHeight}px` } as CSSProperties}
        >
            <div ref={headerRef} className="z-40 sticky top-0 border-b border-border/70 bg-card/75 backdrop-blur-xl">
                <div className="container mx-auto px-4 py-4 space-y-4">
                    <div className="flex gap-3 w-full justify-center">
                        <div className="relative w-full max-w-3xl items-center flex">
                            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                            <Input
                                value={query}
                                onChange={handleSearch}
                                placeholder={t('placeholder')}
                                className="px-12 h-12 text-lg rounded-2xl border-border bg-background/95 shadow-sm focus:ring-2 ring-primary/20 transition-all"
                            />
                            {isLoading && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <IconLoader2 className="w-5 h-5 animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-center items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer bg-card/80 px-4 py-2 rounded-full border border-border shadow-sm hover:bg-muted/50 transition-colors">
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

                    <div className="max-w-4xl mx-auto overflow-x-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                    sectionRef={filterSectionRef}
                />

                <div className="min-h-[400px]">
                    {isLoading && (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-6">
                            <Skeleton className="h-40 rounded-xl" />
                            <Skeleton className="h-40 rounded-xl" />
                            <Skeleton className="h-40 rounded-xl" />
                        </div>
                    )}
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

                    {activeTab === 'tournaments' && <TournamentList tournaments={results} stickyOffset={headerHeight} />}
                    {activeTab === 'global' && (
                        <div className="space-y-10">
                            <section className="space-y-4">
                                <h3 className="text-xl font-bold">{t('tabs.tournaments')}</h3>
                                <TournamentList tournaments={groupedResults.tournaments} stickyOffset={headerHeight} />
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

            {showFiltersFab && activeTab !== "map" ? (
                <Button
                    type="button"
                    variant="default"
                    size="lg"
                    className={cn(
                        "fixed z-[45] h-12 gap-0 rounded-full px-4 shadow-lg ring-2 ring-background/80",
                        "md:bottom-6 md:right-6",
                        "max-md:right-4 max-md:bottom-[max(6.85rem,calc(env(safe-area-inset-bottom)+6rem))]"
                    )}
                    aria-label={tFloat("scroll_to_filters")}
                    onClick={() =>
                        filterSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                >
                    <IconFilter className="mr-2 h-5 w-5 shrink-0" aria-hidden />
                    <span className="text-sm font-semibold">{tFloat("short_label")}</span>
                </Button>
            ) : null}
        </div>
    )
}
