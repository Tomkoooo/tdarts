import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, X, Filter } from 'lucide-react';

interface SearchHeaderProps {
  query: string;
  setQuery: (query: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  activeFiltersCount: number;
  showSuggestions: boolean;
  suggestions: string[];
  handleSearch: (searchQuery: string) => void;
  handleInputClick: () => void;
  filters: {
    type: 'tournaments' | 'players' | 'clubs' | 'all';
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    type: 'tournaments' | 'players' | 'clubs' | 'all';
  }>>;
}

export default function SearchHeader({
  query,
  setQuery,
  showFilters,
  setShowFilters,
  activeFiltersCount,
  showSuggestions,
  suggestions,
  handleSearch,
  handleInputClick,
  filters,
  setFilters,
}: SearchHeaderProps) {
  return (
    <div className="max-w-4xl mx-auto mb-8">
      {/* Search Input */}
      <div className="relative search-container">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <div className="relative">
              <Input
                type="text"
                placeholder="Keress tornára, játékosra, klubra..."
                className="h-12 pl-12 pr-12"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  // setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onClick={handleInputClick}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground w-5 h-5"
                  onClick={() => setQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="lg"
            onClick={() => setShowFilters(!showFilters)}
            className="relative px-4"
          >
            <Filter className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {activeFiltersCount}
              </div>
            )}
          </Button>
        </div>

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-lg shadow-lg z-50 mt-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSearch(s)}
                className="w-full text-left px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab Navigation - only show when there's a query */}
      {query && (
        <div className="flex justify-center mt-4">
          <div className="tabs tabs-boxed">
            <button
              className={`tab ${filters.type === 'all' ? 'tab-active' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))}
            >
              Minden
            </button>
            <button
              className={`tab ${filters.type === 'tournaments' ? 'tab-active' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, type: 'tournaments' }))}
            >
              Tornák
            </button>
            <button
              className={`tab ${filters.type === 'players' ? 'tab-active' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, type: 'players' }))}
            >
              Játékosok
            </button>
            <button
              className={`tab ${filters.type === 'clubs' ? 'tab-active' : ''}`}
              onClick={() => setFilters(prev => ({ ...prev, type: 'clubs' }))}
            >
              Klubok
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
