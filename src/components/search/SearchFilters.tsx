"use client"

import * as React from "react"
import { IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Label } from "@/components/ui/Label"
import { Input } from "@/components/ui/Input"
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
            
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm">Státusz</Label>
              <select
                id="status"
                className="w-full rounded-md bg-background px-3 py-2 text-sm shadow-sm shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                value={filters.status || ''}
                onChange={(e) => onFiltersChange({ ...filters, status: e.target.value || undefined })}
              >
                <option value="">Összes</option>
                <option value="pending">Várakozás alatt</option>
                <option value="group-stage">Csoportkör</option>
                <option value="knockout">Egyenes kiesés</option>
                <option value="finished">Befejezett</option>
              </select>
            </div>

            {/* Format */}
            <div className="space-y-2">
              <Label htmlFor="format" className="text-sm">Formátum</Label>
              <select
                id="format"
                className="w-full rounded-md bg-background px-3 py-2 text-sm shadow-sm shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                value={filters.format || ''}
                onChange={(e) => onFiltersChange({ ...filters, format: e.target.value || undefined })}
              >
                <option value="">Összes</option>
                <option value="knockout">Egyenes kiesés</option>
                <option value="group-knockout">Csoportkör + Kiesés</option>
              </select>
            </div>

            {/* Tournament Type */}
            <div className="space-y-2">
              <Label htmlFor="tournamentType" className="text-sm">Verseny típusa</Label>
              <select
                id="tournamentType"
                className="w-full rounded-md bg-background px-3 py-2 text-sm shadow-sm shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                value={filters.tournamentType || ''}
                onChange={(e) => onFiltersChange({ ...filters, tournamentType: (e.target.value as 'amateur' | 'open') || undefined })}
              >
                <option value="">Összes</option>
                <option value="amateur">Amatőr</option>
                <option value="open">Nyílt</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-sm">Kezdő dátum</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-sm">Záró dátum</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value || undefined })}
                />
              </div>
            </div>

            {/* Player Count Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="minPlayers" className="text-sm">Min. játékosok</Label>
                <Input
                  id="minPlayers"
                  type="number"
                  min={0}
                  placeholder="Min"
                  value={filters.minPlayers ?? ''}
                  onChange={(e) => onFiltersChange({ ...filters, minPlayers: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPlayers" className="text-sm">Max. játékosok</Label>
                <Input
                  id="maxPlayers"
                  type="number"
                  min={0}
                  placeholder="Max"
                  value={filters.maxPlayers ?? ''}
                  onChange={(e) => onFiltersChange({ ...filters, maxPlayers: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
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
            
            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm">Helyszín</Label>
              <Input
                id="location"
                type="text"
                placeholder="Pl. Budapest, Debrecen..."
                value={filters.location || ''}
                onChange={(e) => onFiltersChange({ ...filters, location: e.target.value || undefined })}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SearchFiltersPanel

