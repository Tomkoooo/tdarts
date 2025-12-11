"use client"

import * as React from "react"
import { IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/Button"
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
  city?: string
  tournamentType?: 'amateur' | 'open'
  isVerified?: boolean
  isOac?: boolean
}

interface SearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  onClear: () => void
  context: 'tournaments' | 'players' | 'clubs' | 'leagues'
}

export function SearchFiltersPanel({
  filters,
  onFiltersChange,
  onClear,
  context
}: SearchFiltersProps) {
  
  // Implicitly handle type based on context if not set correctly (though logic typically handles this upstream)
  // We use this component assuming the parent has already selected the context/tab.

  return (
    <div className="space-y-4 min-w-[300px]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold leading-none">Részletes Szűrők</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-auto p-0 text-destructive hover:text-destructive hover:bg-transparent"
        >
          Törlés
        </Button>
      </div>
      <Separator />

      {/* Tournament Specific Filters */}
      {context === 'tournaments' && (
        <div className="space-y-4">
          
          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="status" className="text-xs">Státusz</Label>
            <select
              id="status"
              className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
          <div className="space-y-1.5">
            <Label htmlFor="format" className="text-xs">Formátum</Label>
            <select
              id="format"
              className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={filters.format || ''}
              onChange={(e) => onFiltersChange({ ...filters, format: e.target.value || undefined })}
            >
              <option value="">Összes</option>
              <option value="knockout">Egyenes kiesés</option>
              <option value="group-knockout">Csoportkör + Kiesés</option>
            </select>
          </div>

          {/* Tournament Type (Amateur / Open) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Verseny típusa</Label>
            <div className="flex gap-2">
               <button
                  onClick={() => onFiltersChange({ ...filters, tournamentType: filters.tournamentType === 'amateur' ? undefined : 'amateur' })}
                  className={`
                     flex-1 px-2 py-1.5 text-xs font-medium rounded-md border transition-all
                     ${filters.tournamentType === 'amateur' 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-background hover:bg-muted border-input'
                     }
                  `}
               >
                  Amatőr
               </button>
               <button
                  onClick={() => onFiltersChange({ ...filters, tournamentType: filters.tournamentType === 'open' ? undefined : 'open' })}
                  className={`
                     flex-1 px-2 py-1.5 text-xs font-medium rounded-md border transition-all
                     ${filters.tournamentType === 'open' 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-background hover:bg-muted border-input'
                     }
                  `}
               >
                  Nyílt
               </button>
            </div>
          </div>
          
          <Separator />
          
          {/* OAC Filter */}
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-2">
               <input 
                  type="checkbox" 
                  id="popover_isOac"
                  checked={filters.isOac || false}
                  onChange={(e) => onFiltersChange({ ...filters, isOac: e.target.checked || undefined })}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary"
               />
               <Label htmlFor="popover_isOac" className="text-xs font-normal cursor-pointer">OAC / Hitelesített Verseny</Label>
             </div>
          </div>

          <Separator />
          
           {/* Date Range */}
           <div className="space-y-2">
             <Label className="text-xs">Dátum intervallum</Label>
             <div className="grid grid-cols-2 gap-2">
               <Input
                 id="dateFrom"
                 type="date"
                 className="h-8 text-xs"
                 value={filters.dateFrom || ''}
                 onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value || undefined })}
               />
               <Input
                 id="dateTo"
                 type="date"
                 className="h-8 text-xs"
                 value={filters.dateTo || ''}
                 onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value || undefined })}
               />
             </div>
           </div>

          {/* Player Count Range */}
          <div className="space-y-2">
             <Label className="text-xs">Játékosok száma</Label>
             <div className="grid grid-cols-2 gap-2">
               <Input
                 id="minPlayers"
                 type="number"
                 min={0}
                 placeholder="Min"
                 className="h-8 text-xs"
                 value={filters.minPlayers ?? ''}
                 onChange={(e) => onFiltersChange({ ...filters, minPlayers: e.target.value ? parseInt(e.target.value) : undefined })}
               />
               <Input
                 id="maxPlayers"
                 type="number"
                 min={0}
                 placeholder="Max"
                 className="h-8 text-xs"
                 value={filters.maxPlayers ?? ''}
                 onChange={(e) => onFiltersChange({ ...filters, maxPlayers: e.target.value ? parseInt(e.target.value) : undefined })}
               />
             </div>
          </div>
        </div>
      )}

      {/* Player Specific Filters */}
      {context === 'players' && (
        <div className="space-y-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">Jelenleg nincsenek részletes szűrők a játékosokhoz.</p>
        </div>
      )}

      {/* Club Specific Filters */}
      {context === 'clubs' && (
        <div className="space-y-4">
           {/* Location */}
           <div className="space-y-1.5">
             <Label htmlFor="location" className="text-xs">Helyszín</Label>
             <Input
               id="location"
               type="text"
               className="h-8 text-xs"
               placeholder="Pl. Budapest, Debrecen..."
               value={filters.location || ''}
               onChange={(e) => onFiltersChange({ ...filters, location: e.target.value || undefined })}
             />
           </div>

           <Separator />

           {/* Verified / OAC */}
           <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input 
                   type="checkbox" 
                   id="popover_club_isVerified"
                   checked={filters.isVerified || false}
                   onChange={(e) => onFiltersChange({ ...filters, isVerified: e.target.checked || undefined })}
                   className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="popover_club_isVerified" className="text-xs font-normal cursor-pointer">Hitelesített Klub</Label>
              </div>
           </div>
        </div>
      )}
      
      {/* League Specific Filters */}
      {context === 'leagues' && (
        <div className="space-y-4">
           {/* Verified */}
            <div className="flex items-center gap-2">
               <input 
                  type="checkbox" 
                  id="popover_league_isVerified"
                  checked={filters.isVerified || false}
                  onChange={(e) => onFiltersChange({ ...filters, isVerified: e.target.checked || undefined })}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary"
               />
               <Label htmlFor="popover_league_isVerified" className="text-xs font-normal cursor-pointer">Csak OAC Ligák</Label>
             </div>
        </div>
      )}
    </div>
  )
}

export default SearchFiltersPanel

