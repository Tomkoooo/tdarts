import React from 'react';
import { Button } from '@/components/ui/Button';
import { List, Calendar } from 'lucide-react';

interface TournamentViewControlsProps {
  tournamentView: 'list' | 'calendar';
  setTournamentView: (view: 'list' | 'calendar') => void;
  listViewMode: 'all' | 'navigation';
  setListViewMode: (mode: 'all' | 'navigation') => void;
  setCurrentDateIndex: (index: number) => void;
}

export default function TournamentViewControls({
  tournamentView,
  setTournamentView,
  listViewMode,
  setListViewMode,
  setCurrentDateIndex,
}: TournamentViewControlsProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xl font-bold">Tornák</h3>
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1">
          <Button
            variant={tournamentView === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTournamentView('list')}
            className="gap-2"
          >
            <List className="w-4 h-4" />
            Lista
          </Button>
          <Button
            variant={tournamentView === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTournamentView('calendar')}
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            Naptár
          </Button>
        </div>
        {tournamentView === 'list' && (
          <div className="flex gap-1 border-l pl-2 items-center">
            <Button
              variant={listViewMode === 'all' ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => {
                setListViewMode('all');
                setCurrentDateIndex(0);
              }}
            >
              Összes
            </Button>
            <Button
              variant={listViewMode === 'navigation' ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => {
                setListViewMode('navigation');
                setCurrentDateIndex(0);
              }}
            >
              Navigálás
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
