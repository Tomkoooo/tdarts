import TournamentCard from "@/components/tournament/TournamentCard"
import { IconCalendar } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

interface TournamentListProps {
    tournaments: any[];
}

export function TournamentList({ tournaments }: TournamentListProps) {
    const tResults = useTranslations('Search.tournament_results')
    
    if (!tournaments || tournaments.length === 0) {
        return (
            <div className="text-center py-16 bg-base-100 rounded-xl border border-base-200 shadow-sm">
                <div className="w-20 h-20 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-6">
                    <IconCalendar className="w-10 h-10 text-base-content/50" />
                </div>
                <h3 className="text-xl font-bold mb-2">{tResults('no_tournaments')}</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                    {tResults('no_tournaments_filters_desc')}
                </p>
            </div>
        )
    }

    // Group tournaments by date
    const groupedTournaments = tournaments.reduce((groups: any, item: any) => {
        // Handle nested tournament object from search result or direct object
        const tournament = item.tournament || item;
        
        // Safety check: if tournament or settings are missing, skip
        if (!tournament || !tournament.tournamentSettings || !tournament.tournamentSettings.startDate) {
            return groups;
        }

        const date = new Date(tournament.tournamentSettings.startDate);
        const dateKey = date.toDateString();
        
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(tournament);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedTournaments).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    const formatDateHeader = (date: Date) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const targetDate = new Date(date)
        targetDate.setHours(0, 0, 0, 0)
    
        if (targetDate.getTime() === today.getTime()) {
          return tResults('today')
        } else if (targetDate.getTime() === tomorrow.getTime()) {
          return tResults('tomorrow')
        } else {
          return targetDate.toLocaleDateString('hu-HU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        }
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {sortedDates.map(dateKey => {
                const date = new Date(dateKey)
                const dayTournaments = groupedTournaments[dateKey]
                
                return (
                    <section key={dateKey} className="space-y-5">
                        <div className="flex items-center gap-4 sticky top-[60px] md:top-[70px] z-10 py-2 bg-base-100/95 backdrop-blur-sm border-b border-base-200">
                            <h3 className="text-lg md:text-xl font-bold text-primary-foreground capitalize flex items-center gap-2">
                                <IconCalendar className="w-5 h-5 opacity-70" />
                                {formatDateHeader(date)}
                            </h3>
                            <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-base-200 text-base-content/70">
                                {dayTournaments.length}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {dayTournaments.map((tournament: any) => (
                                <TournamentCard 
                                    key={tournament._id} 
                                    tournament={tournament} 
                                />
                            ))}
                        </div>
                    </section>
                )
            })}
        </div>
    )
}
