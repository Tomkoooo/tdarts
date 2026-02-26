import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { IconTrophy, IconUser, IconChartBar, IconMedal, IconListNumbers, IconSword } from "@tabler/icons-react"
import PlayerStatsModal from "@/components/player/PlayerStatsModal"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SmartAvatar } from "@/components/ui/smart-avatar"
import { useTranslations } from "next-intl"

interface PlayerLeaderboardProps {
    players: any[];
    isOac?: boolean;
    rankingType?: 'oacMmr' | 'leaguePoints';
    onRankingChange?: (type: 'oacMmr' | 'leaguePoints') => void;
}

export function PlayerLeaderboard({ players, isOac, rankingType, onRankingChange }: PlayerLeaderboardProps) {
    const t = useTranslations('Search.player_leaderboard')
    const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null)

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
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="oacMmr">
                                <IconChartBar className="w-4 h-4 mr-2" />
                                {t('oac_mmr_ranking')}
                            </TabsTrigger>
                            <TabsTrigger value="leaguePoints">
                                <IconListNumbers className="w-4 h-4 mr-2" />
                                {t('league_points_ranking')}
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
                    <h3 className="text-lg font-bold">{t('no_results')}</h3>
                    {isOac && <p className="text-sm text-muted-foreground mt-2">{t('no_results_oac')}</p>}
                </div>
            ) : (
                <div className="grid gap-4">
                    {players.map((player) => (
                        <Card key={player._id} className={cn(
                            "overflow-hidden transition-all hover:shadow-md border-base-200",
                            isOac && "border-primary/20 bg-primary/5"
                        )}>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="flex-shrink-0 font-mono text-2xl font-bold text-base-content/20 w-8 text-center">
                                    {player.globalRank || '#'}
                                </div>
                                
                                <SmartAvatar 
                                    playerId={player._id} 
                                    name={player.name} 
                                    size="lg"
                                />

                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg truncate">{player.name}</h3>
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
                                                "gap-1 text-[10px] font-bold uppercase tracking-wider py-0 h-5",
                                                honor.type === 'rank' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : 
                                                honor.type === 'tournament' ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" : 
                                                "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                )}
                                            >
                                                {honor.type === 'rank' && <IconMedal className="h-3 w-3" /> }
                                                {honor.type === 'tournament' && <IconTrophy className="h-3 w-3" /> }
                                                {honor.title}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        {(player.type === 'pair' || player.type === 'team') && (
                                            <Badge variant="outline" className="gap-1 text-[9px] font-black h-5 px-2 bg-indigo-500/5 text-indigo-500 border-indigo-500/20 uppercase tracking-tighter">
                                                <IconSword size={10} />
                                                {player.type === 'pair' ? t('pair') : t('team')}
                                            </Badge>
                                        )}
                                        <span>{player.userRef ? t('registered_player') : (player.type === 'pair' || player.type === 'team' ? '' : t('guest_player'))}</span>
                                        {isOac && rankingType === 'leaguePoints' && player.leagues && (
                                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                                                {t('active_in_leagues', { count: player.leagues.length })}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="hidden sm:block text-right">
                                        {activeRanking === 'leaguePoints' ? (
                                            <>
                                                <div className="text-2xl font-black text-primary leading-none mb-1">
                                                    {player.leaguePoints ?? 0}
                                                </div>
                                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    {t('league_points_label')}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-2xl font-black text-primary leading-none mb-1">
                                                    {isOac ? (player.stats?.oacMmr ?? 800) : (player.stats?.mmr ?? 0)}
                                                </div>
                                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    {isOac ? t('mmr_oac_label') : t('mmr_label')}
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
                    isOacContext={isOac} 
                />
            )}
        </div>
    )
}

export default PlayerLeaderboard;
