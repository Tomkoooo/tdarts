"use client"

import * as React from "react"
import { IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Label } from "@/components/ui/Label"
import { Separator } from "@/components/ui/separator"

interface SearchFilters {
  type: 'tournaments' | 'players' | 'clubs' | 'all'
  status?: string
  format?: string
  dateFrom?: string
  dateTo?: string
  minPlayers?: number
  maxPlayers?: number
  location?: string
  tournamentType?: 'amateur' | 'open'
}

interface SearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  onClear: () => void
}

export function SearchFiltersPanel({
  filters,
  onFiltersChange,
  onClear,
}: SearchFiltersProps) {
  const handleTypeChange = (type: SearchFilters['type']) => {
    onFiltersChange({ ...filters, type })
  }

  return (
    <Card className="bg-card/85 shadow-md shadow-black/20 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Szűrők</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-destructive hover:text-destructive"
          >
            <IconX className="w-4 h-4 mr-2" />
            Törlés
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Content Type Filter */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Tartalom típusa</Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'all', label: 'Minden' },
              { value: 'tournaments', label: 'Versenyek' },
              { value: 'players', label: 'Játékosok' },
              { value: 'clubs', label: 'Klubok' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleTypeChange(option.value as SearchFilters['type'])}
                className={`
                  px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all
                  ${filters.type === option.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Tournament Specific Filters */}
        {filters.type === 'tournaments' && (
          <div className="space-y-4">
            <Label className="text-base font-semibold">Verseny beállítások</Label>
            <div className="text-sm text-muted-foreground">
              További szűrők hamarosan érkeznek...
            </div>
          </div>
        )}

        {/* Player Specific Filters */}
        {filters.type === 'players' && (
          <div className="space-y-4">
            <Label className="text-base font-semibold">Játékos beállítások</Label>
            <div className="text-sm text-muted-foreground">
              További szűrők hamarosan érkeznek...
            </div>
          </div>
        )}

        {/* Club Specific Filters */}
        {filters.type === 'clubs' && (
          <div className="space-y-4">
            <Label className="text-base font-semibold">Klub beállítások</Label>
            <div className="text-sm text-muted-foreground">
              További szűrők hamarosan érkeznek...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SearchFiltersPanel

