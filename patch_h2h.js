const fs = require('fs');
const filepath = './src/components/profile/PlayerStatisticsSection.tsx';
const content = fs.readFileSync(filepath, 'utf8');
const lines = content.split('\n');

// We want to replace lines 619 to 888 (0-indexed 619 to 888) with our new HeadToHead Modal code
// Wait, view_file showed lines 620 to 889 (1-indexed). So 0-indexed: 619 to 888.

const newH2H = `        {/* Head-to-Head Section */}
        <div className="space-y-8">
          {/* Search Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1 w-full max-w-xl">
              <PlayerSearch
                onPlayerSelected={(player) => {
                  setSelectedOpponent(player)
                  void fetchHeadToHead(player._id)
                }}
                placeholder={t.headToHeadSearchPlaceholder || "Ellenfél keresése..."}
                excludePlayerIds={[playerStats.player._id]}
                showAddGuest={false}
                isForTournament
              />
              {!topOpponentsLoading && mostPlayedTop5.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-label text-muted-foreground mr-2 font-bold uppercase tracking-widest text-[10px]">Legutóbbiak:</span>
                  {mostPlayedTop5.map((entry) => (
                    <button
                      key={\`quick-\${entry.opponent._id}\`}
                      className="px-3 py-1 bg-card text-[10px] font-bold uppercase tracking-widest rounded-full border border-border/50 hover:bg-muted/50 transition-colors text-primary"
                      onClick={() => {
                        setSelectedOpponent(entry.opponent)
                        void fetchHeadToHead(entry.opponent._id)
                      }}
                    >
                      {entry.opponent.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {headToHead && (
              <button onClick={handleClearHeadToHead} className="flex items-center gap-2 px-6 py-3 bg-destructive/10 text-destructive rounded-lg font-bold hover:bg-destructive/20 transition-all active:scale-95 group">
                <IconSword size={18} className="group-hover:rotate-12 transition-transform" />
                <span>{t.headToHeadClear || "Törlés"}</span>
              </button>
            )}
          </div>

          {headToHeadLoading ? (
             <div className="flex flex-col items-center justify-center p-12 bg-card rounded-2xl border border-border/50 shadow-sm">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t.headToHeadLoading || "Betöltés..."}</p>
             </div>
          ) : headToHeadError ? (
             <div className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm">
                <p className="text-sm font-medium text-destructive">{headToHeadError}</p>
                <Button variant="outline" size="sm" onClick={() => selectedOpponent?._id && void fetchHeadToHead(selectedOpponent._id)}>
                  {t.retry || "Újra"}
                </Button>
             </div>
          ) : !headToHead ? (
             <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden line-clamp-2">
                <div className="p-6 border-b border-border/50 bg-muted/20">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <IconUsers size={16} /> Összes ellenfél (győzelmi ráta szerint)
                    </p>
                </div>
                {topOpponentsLoading ? (
                  <div className="p-8 text-center"><p className="text-xs text-muted-foreground">{t.headToHeadLoading || "Betöltés..."}</p></div>
                ) : topOpponentsByWinRate.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground/50 border-dashed border border-muted/20 m-6 rounded-xl"><p className="text-xs">{t.headToHeadNoTopOpponents || "Nincsenek elérhető ellenfelek"}</p></div>
                ) : (
                  <div className="max-h-[360px] overflow-y-auto pr-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-3 custom-scrollbar">
                    {topOpponentsByWinRate.map((entry) => (
                      <button
                        key={entry.opponent._id}
                        className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border/50 bg-background p-4 text-left hover:border-primary/50 hover:bg-muted/30 transition-all group shadow-sm"
                        onClick={() => {
                          setSelectedOpponent(entry.opponent)
                          void fetchHeadToHead(entry.opponent._id)
                        }}
                      >
                        <div className="min-w-0 pr-4">
                          <p className="truncate text-sm font-headline font-bold mb-1 group-hover:text-primary transition-colors">{entry.opponent.name}</p>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex gap-2">
                            <span>{entry.matchesPlayed} {t.headToHeadMatches?.toLowerCase() || "meccs"}</span> • 
                            <span className="text-emerald-500/80">{entry.wins}W</span> • 
                            <span className="text-primary">{entry.winRate?.toFixed(1)}% WR</span>
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted/50 group-hover:bg-primary/20 transition-colors">
                           <IconSword size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
             </div>
          ) : (
            <div className="space-y-8">
              {/* Head-to-Head Hero Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
                
                {/* Player 1 Card */}
                <div className="lg:col-span-4 bg-card rounded-2xl p-8 flex flex-col items-center text-center relative overflow-hidden shadow-lg border border-border/50">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                  <div className="w-28 h-28 rounded-full overflow-hidden mb-5 ring-4 ring-muted flex items-center justify-center bg-background border border-border/50 shadow-inner">
                    <SmartAvatar playerId={playerStats.player._id} name={playerStats.player.name} className="w-full h-full text-4xl" />
                  </div>
                  <h2 className="font-headline text-2xl sm:text-3xl font-bold mb-1 line-clamp-1">{playerStats.player.name}</h2>
                  <p className="text-primary font-medium tracking-widest text-[10px] uppercase font-bold mb-5 flex items-center gap-1">
                     <IconTrophy size={12} /> {playerStats.player.stats?.mmr || 800} MMR
                  </p>
                  <div className="w-full h-px bg-border/50 mb-5"></div>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="text-left bg-muted/20 p-3 rounded-lg border border-border/30">
                      <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Avg</span>
                      <span className="text-lg font-headline font-black text-foreground">{headToHead.summary.playerAAverage ? headToHead.summary.playerAAverage.toFixed(1) : "—"}</span>
                    </div>
                    <div className="text-right bg-muted/20 p-3 rounded-lg border border-border/30">
                      <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">180s</span>
                      <span className="text-lg font-headline font-black text-primary">{headToHead.summary.playerAOneEighties || 0}</span>
                    </div>
                  </div>
                </div>

                {/* VS Gauge Center */}
                <div className="lg:col-span-4 flex flex-col justify-center items-center gap-6 py-8 lg:py-0">
                  <div className="relative w-44 h-44 flex items-center justify-center group">
                    <svg className="absolute w-full h-full -rotate-90 transform drop-shadow-xl" viewBox="0 0 100 100">
                      <circle className="text-muted/30" cx="50" cy="50" fill="none" r="45" stroke="currentColor" strokeWidth="6"></circle>
                      <circle 
                        className="text-primary transition-all duration-1000 ease-out drop-shadow-sm" 
                        cx="50" cy="50" fill="none" r="45" 
                        stroke="currentColor" 
                        strokeDasharray="282.7" 
                        strokeDashoffset={282.7 - (282.7 * ((headToHead.summary.playerAWins / (headToHead.summary.matchesPlayed || 1))))} 
                        strokeLinecap="round" strokeWidth="8">
                      </circle>
                    </svg>
                    <div className="text-center z-10 transition-transform group-hover:scale-110">
                      <span className="block text-4xl sm:text-5xl font-headline font-black text-primary drop-shadow-sm">
                        {((headToHead.summary.playerAWins / (headToHead.summary.matchesPlayed || 1)) * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Win Rate</span>
                    </div>
                    {/* VS Text */}
                    <div className="absolute -top-6 font-headline italic font-black text-5xl sm:text-6xl text-muted/20 select-none">VS</div>
                  </div>
                  <div className="flex gap-4 w-full">
                    <div className="flex-1 bg-card/60 backdrop-blur-md p-4 rounded-xl text-center border-l-4 border-primary shadow-sm">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Győzelem</span>
                      <span className="text-3xl font-headline font-black text-primary">{headToHead.summary.playerAWins}</span>
                    </div>
                    <div className="flex-1 bg-card/60 backdrop-blur-md p-4 rounded-xl text-center border-r-4 border-destructive/50 shadow-sm">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Vereség</span>
                      <span className="text-3xl font-headline font-black text-muted-foreground">{headToHead.summary.playerBWins}</span>
                    </div>
                  </div>
                </div>

                {/* Player 2 Card */}
                <div className="lg:col-span-4 bg-card rounded-2xl p-8 flex flex-col items-center text-center relative overflow-hidden shadow-lg border border-border/50">
                  <div className="absolute top-0 right-0 w-1 h-full bg-muted-foreground/30"></div>
                  <div className="w-28 h-28 rounded-full overflow-hidden mb-5 ring-4 ring-muted flex items-center justify-center bg-background border border-border/50 shadow-inner">
                    <SmartAvatar playerId={headToHead.playerB._id} name={headToHead.playerB.name} className="w-full h-full text-4xl" />
                  </div>
                  <h2 className="font-headline text-2xl sm:text-3xl font-bold mb-1 line-clamp-1">{headToHead.playerB.name}</h2>
                  <p className="text-muted-foreground font-medium tracking-widest text-[10px] uppercase font-bold mb-5 flex items-center gap-1">
                     Ellenfél {h2hLeader === "B" && <IconTrophy size={11} className="text-amber-500" />}
                  </p>
                  <div className="w-full h-px bg-border/50 mb-5"></div>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="text-left bg-muted/20 p-3 rounded-lg border border-border/30">
                      <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Avg</span>
                      <span className="text-lg font-headline font-black text-foreground">{headToHead.summary.playerBAverage ? headToHead.summary.playerBAverage.toFixed(1) : "—"}</span>
                    </div>
                    <div className="text-right bg-muted/20 p-3 rounded-lg border border-border/30">
                      <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">180s</span>
                      <span className="text-lg font-headline font-black text-foreground">{headToHead.summary.playerBOneEighties || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Comparison Grids */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* All-time összehasonlítás Table */}
                <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50 flex flex-col">
                  <div className="px-6 py-5 flex items-center justify-between border-b border-border/50 bg-muted/10">
                    <h3 className="font-headline font-bold text-lg">All-time összehasonlítás</h3>
                    <span className="material-symbols-outlined text-primary">timeline</span>
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold bg-muted/5 border-b border-border/30">
                          <th className="text-left py-4 px-6">{t.headToHeadStatsMetric || "Kategória"}</th>
                          <th className="text-right py-4 px-4 line-clamp-1">{headToHead.playerA.name}</th>
                          <th className="text-right py-4 px-6 line-clamp-1">{headToHead.playerB.name}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadAverage || "Összesített Átlag"}</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-primary">{headToHead.allTimeComparison.playerA.avg ? headToHead.allTimeComparison.playerA.avg.toFixed(1) : "—"}</td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">{headToHead.allTimeComparison.playerB.avg ? headToHead.allTimeComparison.playerB.avg.toFixed(1) : "—"}</td>
                        </tr>
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">First 9 Average</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-foreground">{typeof headToHead.allTimeComparison.playerA.firstNineAvg === "number" ? headToHead.allTimeComparison.playerA.firstNineAvg.toFixed(1) : "—"}</td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">{typeof headToHead.allTimeComparison.playerB.firstNineAvg === "number" ? headToHead.allTimeComparison.playerB.firstNineAvg.toFixed(1) : "—"}</td>
                        </tr>
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">Winrate</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-primary">{headToHead.allTimeComparison.playerA.winRate.toFixed(1)}%</td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">{headToHead.allTimeComparison.playerB.winRate.toFixed(1)}%</td>
                        </tr>
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadOneEighties || "180-as dobások"}</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-foreground">{headToHead.allTimeComparison.playerA.oneEightiesCount || 0}</td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">{headToHead.allTimeComparison.playerB.oneEightiesCount || 0}</td>
                        </tr>
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadHighestCheckout || "Legmagasabb Koszálló"}</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-foreground">{headToHead.allTimeComparison.playerA.highestCheckout || "—"}</td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">{headToHead.allTimeComparison.playerB.highestCheckout || "—"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Match History equivalence Grid */}
                <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50 flex flex-col">
                  <div className="px-6 py-5 flex items-center justify-between border-b border-border/50 bg-muted/10">
                    <h3 className="font-headline font-bold text-lg">{t.headToHeadMatches || "Közös Meccsek"} ({headToHead.summary.matchesPlayed})</h3>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    </div>
                  </div>
                  <div className="p-0 overflow-hidden flex-1 flex flex-col">
                    {headToHead.matches.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center p-8 text-center text-sm font-bold uppercase tracking-widest text-muted-foreground/50">
                        {t.headToHeadNoMatches || "Nincsenek közös meccsek"}
                      </div>
                    ) : (
                      <div className="max-h-[385px] overflow-y-auto w-full custom-scrollbar">
                        {headToHead.matches.map((match) => {
                          const isWin = match.playerA.legsWon > match.playerB.legsWon;
                          const isDraw = match.playerA.legsWon === match.playerB.legsWon;
                          return (
                            <div key={match._id} className="group relative bg-card border-b border-border/30 hover:bg-muted/30 transition-all p-1">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-primary/0 to-transparent group-hover:via-primary/50 transition-colors"></div>
                              <div className="flex flex-col sm:flex-row justify-between gap-4 p-4">
                                <div className="flex-1 min-w-0 flex items-center gap-4">
                                  <div className={\`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-headline font-black text-lg shadow-inner \${isWin ? 'bg-primary/20 text-primary' : isDraw ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive/60'}\`}>
                                    {isWin ? 'W' : isDraw ? 'D' : 'L'}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold capitalize">{match.tournament.name}</p>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{new Date(match.date).toLocaleDateString("hu-HU")}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6 sm:justify-end shrink-0 pl-14 sm:pl-0">
                                  <div className="text-right flex items-center gap-3 bg-muted/20 px-3 py-1.5 rounded-lg border border-border/30">
                                    <span className={\`font-headline text-2xl font-black \${isWin ? 'text-primary' : 'text-foreground'}\`}>{match.playerA.legsWon}</span>
                                    <span className="text-[10px] text-muted-foreground opacity-50 font-black">—</span>
                                    <span className={\`font-headline text-2xl font-black \${!isWin && !isDraw ? 'text-foreground' : 'text-muted-foreground/60'}\`}>{match.playerB.legsWon}</span>
                                  </div>
                                  <div className="flex flex-col gap-1 items-end">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => onViewLegs({ _id: match._id })}>
                                      <IconChartBar size={16} />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>`;

// Replace Top Averages
const newTopAvg = `        {/* Top Averages Section - Modern Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pt-4">
          
          {/* Left Column: Elite Tournaments equivalent */}
          <div className="xl:col-span-5 space-y-6">
            <div className="flex justify-between items-end mb-2">
              <h2 className="font-headline text-2xl font-bold flex items-center gap-3">
                 <IconMedal className="text-primary" size={28} />
                 Top Torna Átlagok
              </h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10 h-7" onClick={() => setTopTournamentLimit((prev) => Math.min(prev + 5, tournamentAveragesAll.length || 5))}>Mentés+</Button>
                {topTournamentLimit > 3 && <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-7" onClick={() => setTopTournamentLimit(3)}>Reset</Button>}
              </div>
            </div>

            <div className="space-y-4">
              {topThreeAverages.length === 0 ? (
                <div className="bg-card p-6 rounded-2xl border border-border/50 text-center border-dashed">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nincs elég adat</p>
                </div>
              ) : (
                topThreeAverages.map((entry: any, index: number) => (
                  <div key={entry.id} className="bg-card rounded-2xl p-5 sm:p-6 border-l-4 border-l-primary border border-border/50 hover:bg-muted/10 transition-colors group shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                      <IconTrendingUp size={80} />
                    </div>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-headline font-black text-primary shrink-0 relative z-10">
                        #{index + 1}
                      </div>
                      <div className="min-w-0 flex-1 relative z-10">
                        <h4 className="font-headline font-bold text-base sm:text-lg leading-tight truncate">{entry.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                           <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                             {entry.date ? new Date(entry.date).toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                           </span>
                           {entry.finalPosition ? (
                              <Badge variant="outline" className="text-[9px] h-4 py-0 px-1.5 font-bold uppercase tracking-widest border-primary/30 text-primary bg-primary/5">P#{entry.finalPosition}</Badge>
                           ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 relative z-10">
                       <div className="bg-muted/30 rounded-lg p-2.5 sm:p-3 border border-border/50">
                         <span className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Átlag</span>
                         <span className="font-headline font-black text-lg text-foreground">{entry.avg.toFixed(1)}</span>
                       </div>
                       <div className="bg-muted/30 rounded-lg p-2.5 sm:p-3 border border-border/50">
                         <span className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Meccsek</span>
                         <span className="font-headline font-black text-[13px] sm:text-sm md:text-md text-foreground">{entry.matchesWon}W - {entry.matchesLost}L</span>
                       </div>
                       <div className="bg-muted/30 rounded-lg p-2.5 sm:p-3 border border-border/50 text-right">
                         <span className="block text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">180s/CHK</span>
                         <span className="font-headline font-black text-sm sm:text-md text-foreground">{entry.oneEightiesCount} / {entry.highestCheckout || "—"}</span>
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Top Match Averages Table equivalent */}
          <div className="xl:col-span-7 space-y-6">
            <div className="bg-card rounded-2xl overflow-hidden shadow-lg border border-border/50 h-full flex flex-col">
              <div className="p-6 sm:p-8 bg-muted/10 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="font-headline text-xl sm:text-2xl font-bold flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                  Top Meccs Átlagok
                </h2>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="text-[10px] font-bold uppercase tracking-widest h-8 bg-muted hover:bg-muted/80 text-foreground" onClick={() => setTopMatchLimit((prev) => Math.min(prev + 5, matchAveragesAll.length || 5))}>Mentés+</Button>
                  {topMatchLimit > 3 && <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-8" onClick={() => setTopMatchLimit(3)}>Reset</Button>}
                </div>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-muted/5 border-b border-border/50">
                      <th className="px-6 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ellenfél / Eredmény</th>
                      <th className="px-5 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right border-l border-border/30">Átlag</th>
                      <th className="px-5 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">F9 Átlag</th>
                      <th className="px-5 py-4 font-label text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Dátum</th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {topThreeMatchAverages.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-dashed border-border/50 rounded-xl px-6 py-4">Nincs adat</span>
                        </td>
                      </tr>
                    ) : (
                      topThreeMatchAverages.map((match: any, index: number) => (
                        <tr key={\`top-match-\${match._id}\`} className="hover:bg-muted/10 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-headline font-bold text-xs shrink-0 text-muted-foreground border border-border">
                                #{index + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="font-headline font-bold text-sm sm:text-base capitalize flex items-center gap-1.5">
                                  {match.opponent}
                                  {match.winner === "user" && <IconTrophy size={13} className="text-amber-500 shrink-0" />}
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                                  {match.userScore ?? match.player1Score} - {match.opponentScore ?? match.player2Score} Eredmény
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-5 text-right border-l border-border/30">
                            <span className="font-headline text-lg sm:text-xl font-black text-primary">{Number(match.average).toFixed(1)}</span>
                          </td>
                          <td className="px-5 py-5 text-center">
                            <span className="font-headline text-base font-bold text-foreground">
                              {typeof match.firstNineAvg === "number" ? Number(match.firstNineAvg).toFixed(1) : "—"}
                            </span>
                          </td>
                          <td className="px-5 py-5 text-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/30 px-2 py-1.5 rounded-md border border-border/50 whitespace-nowrap">
                              {new Date(match.date).toLocaleDateString("hu-HU", { month: 'short', day: '2-digit' })}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100 mix-blend-plus-lighter" onClick={() => onViewLegs(match)}>
                                <IconChartBar size={16} />
                                <span className="sr-only">Részletek</span>
                             </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>`;

// First part: lines 619 to 888 (inclusive)
// Wait, view_file showed lines 620 to 889 (1-indexed). Let's find exactly the boundaries.
let h2hStartIndex = lines.findIndex(line => line.includes('<Card className="bg-card border-muted/20 shadow-sm">') && lines[lines.indexOf(line)+1].includes('<div className="flex items-center justify-between gap-2">'));
if (h2hStartIndex === -1) {
    // backup index
    h2hStartIndex = 619;
}

let h2hEndIndex = h2hStartIndex;
let cardLevel = 0;
let foundCard = false;
for (let i = h2hStartIndex; i < lines.length; i++) {
    if (lines[i].includes('<Card ') || lines[i].includes('<Card>')) { cardLevel++; foundCard = true; }
    if (lines[i].includes('</Card>')) cardLevel--;
    if (foundCard && cardLevel === 0) {
        h2hEndIndex = i;
        break;
    }
}

console.log("H2H boundaries:", h2hStartIndex, h2hEndIndex);

// Second part: lines 890 to 1047 (inclusive)
let topAvgStartIndex = lines.findIndex((line, idx) => idx > h2hEndIndex && line.includes('<Card className="bg-card border-muted/20 shadow-sm">') && lines[idx+1].includes('<CardHeader className="pb-4">') && lines[idx+2].includes('<div className="flex flex-wrap items-center justify-between gap-2">'));
if (topAvgStartIndex === -1) {
    topAvgStartIndex = h2hEndIndex + 1; // fallback
}

let topAvgMatchEndIndex = topAvgStartIndex;
// There are TWO cards for Top Avg: Top torna átlagok and Top meccs átlagok. We want to replace BOTH.
let topAvgCardLevel = 0;
let topAvgCardCount = 0;
for (let i = topAvgStartIndex; i < lines.length; i++) {
    if (lines[i].includes('<Card ') || lines[i].includes('<Card>')) { topAvgCardLevel++; topAvgCardCount++; }
    if (lines[i].includes('</Card>')) { 
        topAvgCardLevel--; 
        if (topAvgCardLevel === 0 && topAvgCardCount >= 2) {
             topAvgMatchEndIndex = i;
             break;
        }
    }
}
console.log("TopAvg boundaries:", topAvgStartIndex, topAvgMatchEndIndex);

if (h2hStartIndex >= 0 && topAvgStartIndex >= 0 && topAvgMatchEndIndex < lines.length) {
    // Splicing backwards so indices don't shift
    lines.splice(topAvgStartIndex, topAvgMatchEndIndex - topAvgStartIndex + 1, newTopAvg);
    lines.splice(h2hStartIndex, h2hEndIndex - h2hStartIndex + 1, newH2H);
    
    fs.writeFileSync(filepath, lines.join('\n'), 'utf8');
    console.log("Successfully patched both sections.");
} else {
    console.error("Could not find right boundaries.");
}
