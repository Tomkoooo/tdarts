"use client"

import * as React from "react"
import { IconSearch, IconX, IconFilter } from "@tabler/icons-react"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"

interface SearchHeaderProps {
  query: string
  onQueryChange: (query: string) => void
  suggestions: string[]
  showSuggestions: boolean
  onSuggestionClick: (suggestion: string) => void
  onSuggestionsToggle: (show: boolean) => void
  activeFiltersCount: number
  onClearFilters?: () => void
}

export function SearchHeader({
  query,
  onQueryChange,
  suggestions,
  showSuggestions,
  onSuggestionClick,
  onSuggestionsToggle,
  activeFiltersCount,
  onClearFilters,
}: SearchHeaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className="relative search-container w-full">
      <div className="flex gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="relative">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Keress tornára, játékosra, klubra..."
              className="h-14 pl-12 pr-12 text-base"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => onSuggestionsToggle(true)}
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => onQueryChange('')}
              >
                <IconX className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/20 rounded-lg z-50 overflow-hidden">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onSuggestionClick(suggestion)
                    onSuggestionsToggle(false)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors text-sm border-b border-border/40 last:border-0"
                >
                  <IconSearch className="w-4 h-4 inline mr-2 text-muted-foreground" />
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear Filters Button - Show when filters are active */}
        {activeFiltersCount > 0 && onClearFilters && (
          <Button
            variant="outline"
            size="default"
            onClick={onClearFilters}
            className="gap-2 h-14 px-6"
          >
            <IconX className="w-4 h-4" />
            Szűrők törlése
            <Badge variant="secondary" className="ml-1">{activeFiltersCount}</Badge>
          </Button>
        )}

      </div>
    </div>
  )
}

export default SearchHeader

