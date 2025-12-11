"use client"

import * as React from "react"
import { IconShieldCheck, IconRosette, IconMapPin, IconFilter, IconCalendar, IconListCheck } from "@tabler/icons-react"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

interface QuickFiltersProps {
  filters: any
  onFilterChange: (key: string, value: any) => void
  showAllTournaments?: boolean
  onToggleShowAll?: (show: boolean) => void
}

export function QuickFilters({ filters, onFilterChange, showAllTournaments, onToggleShowAll }: QuickFiltersProps) {
  const [popularCities, setPopularCities] = React.useState<{city: string, count: number}[]>([])
  const [isLoadingCities, setIsLoadingCities] = React.useState(true)

  React.useEffect(() => {
    const fetchCities = async () => {
      try {
        const queryParams = new URLSearchParams()
        if (showAllTournaments) {
          queryParams.set('showFinished', 'true')
        }
        const response = await fetch(`/api/search/metadata?${queryParams.toString()}`)
        const data = await response.json()
        if (data.success) {
          setPopularCities(data.cities)
        }
      } catch (error) {
        console.error('Failed to fetch popular cities:', error)
      } finally {
        setIsLoadingCities(false)
      }
    }

    fetchCities()
  }, [showAllTournaments])

  const toggleFilter = (key: string, value: boolean) => {
    onFilterChange(key, filters[key as keyof typeof filters] ? undefined : value)
  }

  const toggleType = (type: 'amateur' | 'open') => {
    if (filters.tournamentType === type) {
      onFilterChange('tournamentType', undefined)
    } else {
      onFilterChange('tournamentType', type)
    }
  }

  const selectCity = (city: string) => {
    if (filters.city === city) {
      onFilterChange('city', undefined)
    } else {
      onFilterChange('multiple', { city, showFinished: false })
    }
  }

  return (
    <div className="space-y-4">
      {/* Pending/All Toggle - Only show if handler provided */}
      {onToggleShowAll && (
        <div className="flex gap-2 pb-2 border-b border-border/40">
          <button
            onClick={() => onToggleShowAll(false)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm font-medium",
              !showAllTournaments
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background border-border hover:border-primary/50 text-muted-foreground"
            )}
          >
            <IconCalendar className="w-4 h-4" />
            Közelgő
          </button>
          <button
            onClick={() => onToggleShowAll(true)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm font-medium",
              showAllTournaments
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background border-border hover:border-primary/50 text-muted-foreground"
            )}
          >
            <IconListCheck className="w-4 h-4" />
            Összes
          </button>
        </div>
      )}
      
      {/* Primary Toggles */}
      <div className="flex flex-wrap gap-2">
        {/* OAC Toggle */}
        <button
          onClick={() => toggleFilter('isOac', true)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm font-medium",
            filters.isOac
              ? "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-sm"
              : "bg-background border-border hover:border-primary/50 text-muted-foreground"
          )}
        >
          <IconRosette className="w-4 h-4" />
          OAC / Hitelesített Verseny
        </button>

        {/* Separator */}
        <div className="w-px h-6 bg-border mx-1 self-center" />

        {/* Amateur Toggle */}
        <button
          onClick={() => toggleType('amateur')}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm font-medium",
            filters.tournamentType === 'amateur'
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-background border-border hover:border-primary/50 text-muted-foreground"
          )}
        >
          Amatőr
        </button>

        {/* Open Toggle */}
        <button
          onClick={() => toggleType('open')}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm font-medium",
            filters.tournamentType === 'open'
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-background border-border hover:border-primary/50 text-muted-foreground"
          )}
        >
          Open
        </button>
      </div>

      {/* Popular Cities */}
      {!isLoadingCities && popularCities.length > 0 && (
        <div className="flex items-center gap-2 py-2 overflow-x-auto no-scrollbar mask-gradient-right">
          <div className="flex items-center text-xs font-semibold text-muted-foreground whitespace-nowrap mr-1">
            <IconMapPin className="w-3 h-3 mr-1" />
            Népszerű városok:
          </div>
          {popularCities.map((cityData) => (
            <button
              key={cityData.city}
              onClick={() => selectCity(cityData.city)}
              className={cn(
                "whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                filters.city === cityData.city
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
              )}
            >
              {cityData.city} <span className="opacity-50 ml-0.5">({cityData.count})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
