import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { X, Filter } from 'lucide-react';

interface SearchFiltersProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  filters: {
    type: 'tournaments' | 'players' | 'clubs' | 'all';
    status?: string;
    format?: string;
    dateFrom?: string;
    dateTo?: string;
    minPlayers?: number;
    maxPlayers?: number;
    location?: string;
    tournamentType?: 'amateur' | 'open';
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    type: 'tournaments' | 'players' | 'clubs' | 'all';
    status?: string;
    format?: string;
    dateFrom?: string;
    dateTo?: string;
    minPlayers?: number;
    maxPlayers?: number;
    location?: string;
    tournamentType?: 'amateur' | 'open';
  }>>;
}

export default function SearchFilters({
  showFilters,
  setShowFilters,
  filters,
  setFilters,
}: SearchFiltersProps) {
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.status) count++;
    if (filters.format) count++;
    if (filters.location) count++;
    if (filters.minPlayers !== undefined) count++;
    if (filters.maxPlayers !== undefined) count++;
    if (filters.tournamentType) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const clearFilters = () => {
    setFilters({
      type: 'all',
      status: undefined,
      format: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      minPlayers: undefined,
      maxPlayers: undefined,
      location: undefined,
      tournamentType: undefined
    });
  };

  if (!showFilters) return null;

  return (
    <Card className="max-w-4xl mx-auto mb-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Szűrők</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-destructive hover:text-destructive"
        >
          Szűrők törlése
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Content Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tartalom típusa:</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'Minden' },
              { value: 'tournaments', label: 'Versenyek' },
              { value: 'players', label: 'Játékosok' },
              { value: 'clubs', label: 'Klubok' },
            ].map((option) => (
              <label key={option.value} className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="contentType"
                  className="radio radio-primary"
                  checked={filters.type === option.value}
                  onChange={() => setFilters(prev => ({ ...prev, type: option.value as any }))}
                />
                <span className="label-text ml-2">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Tournament-specific filters */}
        {filters.type === 'tournaments' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <label className="text-sm font-medium">Státusz:</label>
              <select
                className="select select-bordered select-sm w-full"
                value={filters.status || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
              >
                <option value="">Minden státusz</option>
                <option value="pending">Várakozó</option>
                <option value="group-stage">Csoportkör</option>
                <option value="knockout">Kieséses</option>
                <option value="finished">Befejezett</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Formátum:</label>
              <select
                className="select select-bordered select-sm w-full"
                value={filters.format || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, format: e.target.value || undefined }))}
              >
                <option value="">Minden formátum</option>
                <option value="single-elimination">Egyenes kiesés</option>
                <option value="double-elimination">Dupla kiesés</option>
                <option value="round-robin">Körmérkőzés</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Típus:</label>
              <select
                className="select select-bordered select-sm w-full"
                value={filters.tournamentType || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, tournamentType: e.target.value as any || undefined }))}
              >
                <option value="">Minden típus</option>
                <option value="amateur">Amatőr</option>
                <option value="open">Open</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Helyszín:</label>
              <input
                type="text"
                className="input input-bordered input-sm w-full"
                placeholder="Pl.: Budapest"
                value={filters.location || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value || undefined }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Min. játékosok:</label>
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                placeholder="0"
                min="0"
                value={filters.minPlayers || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  minPlayers: e.target.value ? parseInt(e.target.value) : undefined
                }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max. játékosok:</label>
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                placeholder="100"
                min="0"
                value={filters.maxPlayers || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  maxPlayers: e.target.value ? parseInt(e.target.value) : undefined
                }))}
              />
            </div>
          </div>
        )}

        {/* Active filters display */}
        {activeFiltersCount > 0 && (
          <div className="pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              {filters.type !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Típus: {filters.type === 'tournaments' ? 'Versenyek' :
                          filters.type === 'players' ? 'Játékosok' :
                          filters.type === 'clubs' ? 'Klubok' : 'Minden'}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-3 w-3 p-0 hover:bg-transparent"
                    onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.status && (
                <Badge variant="secondary" className="gap-1">
                  Státusz: {filters.status}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-3 w-3 p-0 hover:bg-transparent"
                    onClick={() => setFilters(prev => ({ ...prev, status: undefined }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.format && (
                <Badge variant="secondary" className="gap-1">
                  Formátum: {filters.format}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-3 w-3 p-0 hover:bg-transparent"
                    onClick={() => setFilters(prev => ({ ...prev, format: undefined }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.location && (
                <Badge variant="secondary" className="gap-1">
                  Helyszín: {filters.location}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-3 w-3 p-0 hover:bg-transparent"
                    onClick={() => setFilters(prev => ({ ...prev, location: undefined }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.minPlayers !== undefined && (
                <Badge variant="secondary" className="gap-1">
                  Min játékos: {filters.minPlayers}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-3 w-3 p-0 hover:bg-transparent"
                    onClick={() => setFilters(prev => ({ ...prev, minPlayers: undefined }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.maxPlayers !== undefined && (
                <Badge variant="secondary" className="gap-1">
                  Max játékos: {filters.maxPlayers}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-3 w-3 p-0 hover:bg-transparent"
                    onClick={() => setFilters(prev => ({ ...prev, maxPlayers: undefined }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {filters.tournamentType && (
                <Badge variant="secondary" className="gap-1">
                  Típus: {filters.tournamentType === 'amateur' ? 'Amatőr' : 'Open'}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-3 w-3 p-0 hover:bg-transparent"
                    onClick={() => setFilters(prev => ({ ...prev, tournamentType: undefined }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
