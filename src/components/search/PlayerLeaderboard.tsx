import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { IconTrophy, IconUser, IconChartBar, IconMedal, IconListNumbers, IconSword } from "@tabler/icons-react"
import PlayerStatsModal from "@/components/player/PlayerStatsModal"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SmartAvatar } from "@/components/ui/smart-avatar"
import CountryFlag from "@/components/ui/country-flag"

interface PlayerLeaderboardProps {
    players: any[];
    isOac?: boolean;
    rankingType?: 'oacMmr' | 'leaguePoints';
    onRankingChange?: (type: 'oacMmr' | 'leaguePoints') => void;
}

export function PlayerLeaderboard({ players, isOac, rankingType, onRankingChange }: PlayerLeaderboardProps) {
    const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null)

    // Derived active tab for internal logic if needed, but we rely on parent
    const activeRanking = rankingType || 'oacMmr';

    return (
        <div className="space-y-6">
            
            {/* OAC Ranking Toggles */}
            {isOac && onRankingChange && (
                <div className="flex justify-center">
                    <Tabs 
                        defaultValue={activeRanking} 
                        value={activeRanking} 
                        onValueChange={(v) => onRankingChange(v as any)}
                        className="w-full max-w-md"
                    >
                        <TabsList className="flex w-full min-w-max gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <TabsTrigger value="oacMmr" className="shrink-0 min-w-[150px]">
                                <IconChartBar className="w-4 h-4 mr-2" />
                                OAC MMR Rangsor
                            </TabsTrigger>
                            <TabsTrigger value="leaguePoints" className="shrink-0 min-w-[150px]">
                                <IconListNumbers className="w-4 h-4 mr-2" />
                                Liga Pontverseny
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            )}

            {(!players || players.length === 0) ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4">
                        <IconUser className="w-8 h-8 text-base-content/50" />
                    </div>
                    <h3 className="text-lg font-bold">Nincsenek találatok</h3>
                    {isOac && <p className="text-sm text-muted-foreground mt-2">Próbálj más szűrési feltételeket a hitelesített játékosok között.</p>}
                </div>
            ) : (
                <div className="grid gap-4">
                    {players.map((player) => (
                        <Card key={player._id} className={cn(
                            "overflow-hidden transition-all hover:shadow-md border-base-200",
                            isOac && "border-primary/20 bg-primary/5" // Highlight OAC cards slightly
                        )}>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="shrink-0 font-mono text-2xl font-bold text-base-content/20 w-8 text-center">
                                    {player.globalRank || '#'}
                                </div>
                                
                                <SmartAvatar 
                                    playerId={player._id} 
                                    name={player.name} 
                                    size="lg"
                                />

                                <div className="grow min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg truncate">{player.name}</h3>
                                        <CountryFlag countryCode={player.country} />
                                        {((isOac ? (player.stats?.oacMmr >= 1000) : (player.stats?.mmr >= 1000))) && (
                                            <IconTrophy className="w-4 h-4 text-warning fill-warning" />
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-1">
                                        {player.honors?.map((honor: any, i: number) => (
                                            <Badge 
                                                key={`${honor.title}-${honor.year}-${i}`} 
                                                variant="secondary" 
                                                className={cn(
                                                "min-w-0 max-w-full gap-1 overflow-hidden px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider h-auto",
                                                honor.type === 'rank' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : 
                                                honor.type === 'tournament' ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" : 
                                                "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                )}
                                            >
                                                {honor.type === 'rank' && <IconMedal className="h-3 w-3" /> }
                                                {honor.type === 'tournament' && <IconTrophy className="h-3 w-3" /> }
                                                <span className="truncate max-w-[120px] sm:max-w-[180px]">{honor.title}</span>
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        {(player.type === 'pair' || player.type === 'team') && (
                                            <Badge variant="outline" className="gap-1 text-[9px] font-black h-5 px-2 bg-indigo-500/5 text-indigo-500 border-indigo-500/20 uppercase tracking-tighter">
                                                <IconSword size={10} />
                                                {player.type === 'pair' ? 'Páros' : 'Csapat'}
                                            </Badge>
                                        )}
                                        <span>{player.userRef ? 'Regisztrált játékos' : (player.type === 'pair' || player.type === 'team' ? '' : 'Vendég játékos')}</span>
                                        {isOac && rankingType === 'leaguePoints' && player.leagues && (
                                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                                                {player.leagues.length} ligában aktív
                                            </span>
                                        )}
                                    </div>
                                    {(player.type === 'pair' || player.type === 'team') && Array.isArray(player.members) && player.members.length > 0 && (
                                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-1">
                                            {player.members
                                                .filter((member: any) => member?._id && member?.name)
                                                .map((member: any, index: number, arr: any[]) => (
                                                    <div key={member._id} className="inline-flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            className="underline-offset-2 hover:text-primary hover:underline transition-colors"
                                                            onClick={() => setSelectedPlayer({ _id: member._id, name: member.name })}
                                                        >
                                                            {member.name}
                                                        </button>
                                                        {index < arr.length - 1 && <span>+</span>}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="hidden sm:block text-right">
                                        {activeRanking === 'leaguePoints' ? (
                                            <>
                                                <div className="text-2xl font-black text-primary leading-none mb-1">
                                                    {player.leaguePoints ?? 0}
                                                </div>
                                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Liga Pont
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-2xl font-black text-primary leading-none mb-1">
                                                    {isOac ? (player.stats?.oacMmr ?? 800) : (player.stats?.mmr ?? 0)}
                                                </div>
                                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    {isOac ? 'OAC MMR' : 'MMR Pont'}
                                                </div>
                                            </>
                                        )}
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
                </div>
            )}

            {selectedPlayer && (
                <PlayerStatsModal 
                    player={selectedPlayer} 
                    onClose={() => setSelectedPlayer(null)} 
                    // Pass isOac context to modal strictly if needed, or component handles it internally?
                    // Implementation plan said: "Filter tournamentList ... to show only verified tournaments if isOac context is active"
                    // So we must pass it.
                    isOacContext={isOac} 
                />
            )}
        </div>
    )
}

export default PlayerLeaderboard;
