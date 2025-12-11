import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/card"
import { IconTrophy, IconUser, IconChartBar } from "@tabler/icons-react"
import PlayerStatsModal from "@/components/player/PlayerStatsModal"

interface PlayerLeaderboardProps {
    players: any[];
}

export function PlayerLeaderboard({ players }: PlayerLeaderboardProps) {
    const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null)

    if (!players || players.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4">
                    <IconUser className="w-8 h-8 text-base-content/50" />
                </div>
                <h3 className="text-lg font-bold">Nincsenek találatok</h3>
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            {players.map((player) => (
                <Card key={player._id} className="overflow-hidden transition-all hover:shadow-md border-base-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex-shrink-0 font-mono text-2xl font-bold text-base-content/20 w-8 text-center">
                            {player.globalRank || '#'}
                        </div>
                        
                        <Avatar className="h-12 w-12 border-2 border-base-100 shadow-sm">
                            <AvatarImage src={player.image} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {player.name ? player.name.substring(0, 2).toUpperCase() : '??'}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg truncate">{player.name}</h3>
                                {player.stats?.mmr >= 1000 && (
                                     <IconTrophy className="w-4 h-4 text-warning fill-warning" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{player.userRef ? 'Regisztrált játékos' : 'Vendég játékos'}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                             <div className="hidden sm:block text-right">
                                <div className="text-2xl font-black text-primary leading-none mb-1">
                                    {player.stats?.mmr ?? 0}
                                </div>
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    MMR Pont
                                </div>
                            </div>

                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 w-9 p-0 rounded-full"
                                onClick={() => setSelectedPlayer(player)}
                            >
                                <IconChartBar className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}

            {selectedPlayer && (
                <PlayerStatsModal 
                    player={selectedPlayer} 
                    onClose={() => setSelectedPlayer(null)} 
                />
            )}
        </div>
    )
}
