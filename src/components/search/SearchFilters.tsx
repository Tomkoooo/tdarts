
"use client"

import * as React from "react"

import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Input } from "@/components/ui/Input"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"

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
  const t = useTranslations('Search.filters_panel')
  
  return (
    <div className="space-y-4 min-w-[300px]">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold leading-none">{t('title')}</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-auto p-0 text-destructive hover:text-destructive hover:bg-transparent"
        >
          {t('clear')}
        </Button>
      </div>
      <Separator />

      {/* Tournament Specific Filters */}
      {context === 'tournaments' && (
        <div className="space-y-4">
          
          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="status" className="text-xs">{t('status_label')}</Label>
            <select
              id="status"
              className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={filters.status || ''}
              onChange={(e) => onFiltersChange({ ...filters, status: e.target.value || undefined })}
            >
              <option value="">{t('status_all')}</option>
              <option value="pending">{t('status_pending')}</option>
              <option value="group-stage">{t('status_group')}</option>
              <option value="knockout">{t('status_knockout')}</option>
              <option value="finished">{t('status_finished')}</option>
            </select>
          </div>

          {/* Format */}
          <div className="space-y-1.5">
            <Label htmlFor="format" className="text-xs">{t('format_label')}</Label>
            <select
              id="format"
              className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={filters.format || ''}
              onChange={(e) => onFiltersChange({ ...filters, format: e.target.value || undefined })}
            >
              <option value="">{t('format_all')}</option>
              <option value="knockout">{t('format_knockout')}</option>
              <option value="group-knockout">{t('format_group_knockout')}</option>
            </select>
          </div>

          {/* Tournament Type (Amateur / Open) */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('type_label')}</Label>
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
                  {t('type_amateur')}
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
                  {t('type_open')}
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
               <Label htmlFor="popover_isOac" className="text-xs font-normal cursor-pointer">{t('oac_label')}</Label>
             </div>
          </div>

          <Separator />
          
           {/* Date Range */}
           <div className="space-y-2">
             <Label className="text-xs">{t('date_range_label')}</Label>
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
             <Label className="text-xs">{t('player_count_label')}</Label>
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
          <p className="text-xs text-muted-foreground">{t('no_player_filters')}</p>
        </div>
      )}

      {/* Club Specific Filters */}
      {context === 'clubs' && (
        <div className="space-y-4">
           {/* Location */}
           <div className="space-y-1.5">
             <Label htmlFor="location" className="text-xs">{t('location_label')}</Label>
             <Input
               id="location"
               type="text"
               className="h-8 text-xs"
               placeholder={t('location_placeholder')}
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
                <Label htmlFor="popover_club_isVerified" className="text-xs font-normal cursor-pointer">{t('verified_club')}</Label>
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
               <Label htmlFor="popover_league_isVerified" className="text-xs font-normal cursor-pointer">{t('oac_leagues_only')}</Label>
             </div>
        </div>
      )}
    </div>
  )
}

export default SearchFiltersPanel
