const fs = require('fs');
const filepath = './src/components/tournament/HeadToHeadModal.tsx';
const content = fs.readFileSync(filepath, 'utf8');
const lines = content.split('\n');

const newH2HModalContent = `            <div className="space-y-8 animate-fade-in relative">
              {/* Head-to-Head Hero Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
                
                {/* Player 1 Card */}
                <div className="lg:col-span-4 bg-card rounded-2xl p-8 flex flex-col items-center text-center relative overflow-hidden shadow-lg border border-border/50">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                  <div className="w-28 h-28 rounded-full overflow-hidden mb-5 ring-4 ring-muted flex items-center justify-center bg-background border border-border/50 shadow-inner">
                    <span className="material-symbols-outlined text-6xl text-primary">person</span>
                  </div>
                  <h2 className="font-headline text-2xl sm:text-3xl font-bold mb-1 line-clamp-1">{data.playerA.name}</h2>
                  <div className="w-full h-px bg-border/50 my-5"></div>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="text-left bg-muted/20 p-3 rounded-lg border border-border/30">
                      <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Avg</span>
                      <span className="text-lg font-headline font-black text-foreground">{data.summary.playerAAverage ? data.summary.playerAAverage.toFixed(1) : "—"}</span>
                    </div>
                    <div className="text-right bg-muted/20 p-3 rounded-lg border border-border/30">
                      <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">180s</span>
                      <span className="text-lg font-headline font-black text-primary">{data.summary.playerAOneEighties || 0}</span>
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
                        strokeDashoffset={282.7 - (282.7 * ((data.summary.playerAWins / (data.summary.matchesPlayed || 1))))} 
                        strokeLinecap="round" strokeWidth="8">
                      </circle>
                    </svg>
                    <div className="text-center z-10 transition-transform group-hover:scale-110">
                      <span className="block text-4xl sm:text-5xl font-headline font-black text-primary drop-shadow-sm">
                        {((data.summary.playerAWins / (data.summary.matchesPlayed || 1)) * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Win Rate</span>
                    </div>
                    {/* VS Text */}
                    <div className="absolute -top-6 font-headline italic font-black text-5xl sm:text-6xl text-muted/20 select-none">VS</div>
                  </div>
                  <div className="flex gap-4 w-full">
                    <div className="flex-1 bg-card/60 backdrop-blur-md p-4 rounded-xl text-center border-l-4 border-primary shadow-sm">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Győzelem</span>
                      <span className="text-3xl font-headline font-black text-primary">{data.summary.playerAWins}</span>
                    </div>
                    <div className="flex-1 bg-card/60 backdrop-blur-md p-4 rounded-xl text-center border-r-4 border-destructive/50 shadow-sm">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Vereség</span>
                      <span className="text-3xl font-headline font-black text-muted-foreground">{data.summary.playerBWins}</span>
                    </div>
                  </div>
                </div>

                {/* Player 2 Card */}
                <div className="lg:col-span-4 bg-card rounded-2xl p-8 flex flex-col items-center text-center relative overflow-hidden shadow-lg border border-border/50">
                  <div className="absolute top-0 right-0 w-1 h-full bg-muted-foreground/30"></div>
                  <div className="w-28 h-28 rounded-full overflow-hidden mb-5 ring-4 ring-muted flex items-center justify-center bg-background border border-border/50 shadow-inner">
                    <span className="material-symbols-outlined text-6xl text-muted-foreground">person</span>
                  </div>
                  <h2 className="font-headline text-2xl sm:text-3xl font-bold mb-1 line-clamp-1">{data.playerB.name}</h2>
                  <div className="w-full h-px bg-border/50 my-5"></div>
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="text-left bg-muted/20 p-3 rounded-lg border border-border/30">
                      <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Avg</span>
                      <span className="text-lg font-headline font-black text-foreground">{data.summary.playerBAverage ? data.summary.playerBAverage.toFixed(1) : "—"}</span>
                    </div>
                    <div className="text-right bg-muted/20 p-3 rounded-lg border border-border/30">
                      <span className="block text-[9px] text-muted-foreground font-bold uppercase tracking-widest">180s</span>
                      <span className="text-lg font-headline font-black text-foreground">{data.summary.playerBOneEighties || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Comparison Grids */}
              <div className="grid grid-cols-1 gap-8">
                {/* All-time összehasonlítás Table */}
                <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50 flex flex-col">
                  <div className="px-6 py-5 flex items-center justify-between border-b border-border/50 bg-muted/10">
                    <h3 className="font-headline font-bold text-lg">Összesített Mutatók</h3>
                    <IconChartBar className="text-primary" />
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm border-collapse min-w-[500px]">
                      <thead>
                        <tr className="text-muted-foreground uppercase text-[10px] tracking-widest font-bold bg-muted/5 border-b border-border/30">
                          <th className="text-left py-4 px-6">{t.headToHeadStatsMetric || "Kategória"}</th>
                          <th className="text-right py-4 px-4 line-clamp-1">{data.playerA.name}</th>
                          <th className="text-right py-4 px-6 line-clamp-1">{data.playerB.name}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadAverage || "Összesített Átlag"}</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-primary">{data.summary.playerAAverage ? data.summary.playerAAverage.toFixed(1) : "—"}</td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">{data.summary.playerBAverage ? data.summary.playerBAverage.toFixed(1) : "—"}</td>
                        </tr>
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">Első 9 Átlag</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-foreground">{typeof data.summary.playerAFirstNineAvg === "number" ? data.summary.playerAFirstNineAvg.toFixed(1) : "—"}</td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">{typeof data.summary.playerBFirstNineAvg === "number" ? data.summary.playerBFirstNineAvg.toFixed(1) : "—"}</td>
                        </tr>
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadHighestCheckout || "Legmagasabb Koszálló"}</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-foreground">{data.summary.playerAHighestCheckout || "—"}</td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">{data.summary.playerBHighestCheckout || "—"}</td>
                        </tr>
                        <tr className="hover:bg-muted/30 transition-colors group">
                          <td className="py-4 px-6 font-medium text-xs font-bold uppercase tracking-wider">{t.headToHeadOneEighties || "180-as dobások"}</td>
                          <td className="py-4 px-4 text-right font-headline font-black text-lg text-foreground">{data.summary.playerAOneEighties || 0}</td>
                          <td className="py-4 px-6 text-right font-headline font-black text-lg text-muted-foreground">{data.summary.playerBOneEighties || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Match History Table */}
                <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border/50 flex flex-col">
                  <div className="px-6 py-5 flex items-center justify-between border-b border-border/50 bg-muted/10">
                    <h3 className="font-headline font-bold text-lg">{t.headToHeadMatches || "Közös Meccsek"} ({data.matches.length})</h3>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    </div>
                  </div>
                  <div className="p-0 overflow-hidden flex-1 flex flex-col">
                    {data.matches.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center p-8 text-center text-sm font-bold uppercase tracking-widest text-muted-foreground/50">
                        {t.headToHeadNoMatches || "Nincsenek közös meccsek"}
                      </div>
                    ) : (
                      <div className="max-h-[385px] overflow-y-auto w-full custom-scrollbar">
                        {data.matches.map((match) => {
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
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={async () => {
                  try {
                    const response = await getMatchByIdClientAction({ matchId: match._id });
                    const nextMatch =
                      response &&
                      typeof response === "object" &&
                      "success" in response &&
                      response.success &&
                      "match" in response
                        ? (response as any).match
                        : { _id: match._id };
                    setSelectedMatch(nextMatch);
                    setShowMatchModal(true);
                  } catch {
                    setSelectedMatch({ _id: match._id });
                    setShowMatchModal(true);
                  }
                }}>
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
            </div>`;

const startIndex = lines.findIndex(line => line.includes('<div className="space-y-8 animate-fade-in relative">'));
const endIndex = lines.findIndex(line => line.includes(') : null}'));

if (startIndex >= 0 && startIndex < endIndex) {
    lines.splice(startIndex, endIndex - startIndex, newH2HModalContent);
    fs.writeFileSync(filepath, lines.join('\\n'), 'utf8');
    console.log("Successfully replaced HeadToHeadModal.");
} else {
    console.error("Could not find boundaries.");
}
