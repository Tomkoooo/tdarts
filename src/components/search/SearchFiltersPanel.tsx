"use client"

import React from "react"
import { useTranslations } from "next-intl"
import { IconX, IconSliders } from "@tabler/icons-react"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SearchFiltersProps {
  filters: any
  onFilterChange: (key: string, value: any) => void
  onClearFilters: () => void
  activeFilterCount: number
}

export function SearchFiltersPanel({
  filters,
  onFilterChange,
  onClearFilters,
  activeFilterCount
}: SearchFiltersProps) {
  const t = useTranslations("Search")

  return (
    <GlassmorphismCard className="p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <IconSliders className="w-5 h-5" />
          <h3 className="text-lg font-semibold">{t("filters.filterLabel")}</h3>
          {activeFilterCount > 0 && (
            <Badge className="ml-2">{activeFilterCount} active</Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <IconX className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Filter */}
        <Select value={filters.timeLabel || "all"} onValueChange={(value) => onFilterChange("timeLabel", value)}>
          <SelectTrigger>
            <SelectValue placeholder={t("filters.timeLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">{t("filters.upcoming")}</SelectItem>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
            <SelectItem value="past">Past</SelectItem>
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={filters.typeLabel || "all"} onValueChange={(value) => onFilterChange("typeLabel", value)}>
          <SelectTrigger>
            <SelectValue placeholder={t("filters.typeLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.typeAll")}</SelectItem>
            <SelectItem value="amateur">{t("filters.typeAmateur")}</SelectItem>
            <SelectItem value="open">{t("filters.typeOpen")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Country Filter */}
        <Select value={filters.countryLabel || "hu"} onValueChange={(value) => onFilterChange("countryLabel", value)}>
          <SelectTrigger>
            <SelectValue placeholder={t("filters.countryLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hu">Hungary</SelectItem>
            <SelectItem value="de">Germany</SelectItem>
            <SelectItem value="at">Austria</SelectItem>
            <SelectItem value="sk">Slovakia</SelectItem>
            <SelectItem value="ro">Romania</SelectItem>
          </SelectContent>
        </Select>

        {/* Season Filter */}
        <Select value={filters.seasonLabel || "current"} onValueChange={(value) => onFilterChange("seasonLabel", value)}>
          <SelectTrigger>
            <SelectValue placeholder={t("filters.seasonLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">{t("filters.currentSeason")}</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
            <SelectItem value="2022">2022</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-primary/10">
          {Object.entries(filters).map(([key, value]) => {
            if (value && value !== "all" && value !== "current") {
              return (
                <Badge
                  key={key}
                  variant="outline"
                  className="pl-3 pr-1 py-2 cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => onFilterChange(key, null)}
                >
                  {String(value)}
                  <IconX className="w-3 h-3 ml-2" />
                </Badge>
              )
            }
            return null
          })}
        </div>
      )}
    </GlassmorphismCard>
  )
}
