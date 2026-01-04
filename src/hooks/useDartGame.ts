import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export interface PlayerStats {
  highestCheckout: number;
  totalThrows: number;
  average: number;
}

export interface Player {
  name: string;
  score: number;
  legsWon: number;
  allThrows: number[];
  stats: PlayerStats;
}

export interface Leg {
  legNumber: number;
  player1Throws: number[];
  player2Throws: number[];
  player1Score: number;
  player2Score: number;
  winner: 1 | 2;
  checkoutScore?: number;
  checkoutDarts?: number;
  createdAt: Date;
}

export interface GameState {
  player1: Player;
  player2: Player;
  currentPlayer: 1 | 2;
  legStartingPlayer: 1 | 2;
  currentLeg: number;
  legsToWin: number;
  legs: Leg[];
  gameStatus: 'pending' | 'playing' | 'finished';
  winner: 'player1' | 'player2' | null;
}

interface UseDartGameProps {
    initialScore?: number;
    legsToWin?: number;
    startingPlayer?: 1 | 2;
}

export const useDartGame = ({ 
    initialScore = 501, 
    legsToWin = 3,
    startingPlayer = 1
}: UseDartGameProps = {}) => {
    
    // --- Initial State Factory ---
    const createInitialPlayer = (name: string): Player => ({
        name,
        score: initialScore,
        legsWon: 0,
        allThrows: [],
        stats: {
            highestCheckout: 0,
            totalThrows: 0,
            average: 0
        }
    });

    const [gameState, setGameState] = useState<GameState>({
        player1: createInitialPlayer("1"),
        player2: createInitialPlayer("2"),
        currentPlayer: startingPlayer,
        legStartingPlayer: startingPlayer,
        currentLeg: 1,
        legsToWin,
        legs: [],
        gameStatus: 'pending',
        winner: null
    });

    // --- Helpers ---

    
    // --- Actions ---

    const handleThrow = useCallback((score: number) => {
        setGameState(prev => {
            if (prev.gameStatus === 'finished') return prev;

            const isP1 = prev.currentPlayer === 1;
            const player = isP1 ? prev.player1 : prev.player2;

            const newScore = player.score - score;
            const newAllThrows = [...player.allThrows, score];
            
            // Stats update logic
            const newTotalThrows = player.stats.totalThrows + 1;
            // NOTE: Average calculation usually needs total score thrown. 
            // Simplified: (OldAvg * OldThrows + CurrentThrow) / NewThrows
            const newAvg = Math.round(
                ((player.stats.average * player.stats.totalThrows) + score) / newTotalThrows * 100
            ) / 100;

            const newStats: PlayerStats = {
                ...player.stats,
                totalThrows: newTotalThrows,
                average: newAvg
            };

            // 1. BUST
            if (newScore < 0 || newScore === 1) {
                // Bust rules: usually score resets to start of turn.
                // But for simple "throw by throw" tracking without "Turn" concept in state yet:
                // We revert score to PREVIOUS throw? 
                // OR commonly in apps: Score stays same as before this throw.
                // "Input is throw-by-throw".
                // If I am at 20, and throw 25 -> Bust. Score stays 20. But throw is recorded as 0 or 25 (bust)?
                // Standard: Record the throw for stats, but score doesn't decrease.
                 
                // Actually if this is a "Turn" based game, bust invalidates the whole turn.
                // But `handleThrow` receives single darts usually. 
                // Let's stick to simple logic: 
                // If bust, score doesn't change from *current* state (which might be mid-turn).
                // Wait, standard 501: if you bust on 2nd dart, your score resets to what it was BEFORE the turn started.
                // This hook tracks state *per dart*. To support "Reset to start of turn", we need to track `scoreAtStartOfTurn`.
                // For now, let's implement simplified Bust: 
                // If you bust, your score stays what it was *before this specific dart*.
                // (This is incorrect for official rules but matches simplified apps unless we track turns).
                // *Correction*: The user code had `if (currentPlayerData.score - score < 0) ...` 
                // and it recorded 0 for the throw and switched player.
                // Let's mimic that behavior for now to minimalize regression.
                
                toast.error('Túl sok pont!');
                
                return {
                    ...prev,
                    [isP1 ? 'player1' : 'player2']: {
                        ...player,
                        allThrows: [...player.allThrows, 0], // Record 0 or actual score? User code recored 0.
                        stats: {
                            ...newStats, // Stats updated with *0* ??? User code did `+ 0`.
                            // Recalculating average with 0 seems to punish bust hard.
                            // User code: `((prev.stats.totalThrows * prev.stats.average) + 0)`
                            // So yes, bust = 0 points for average.
                             average: Math.round(
                                ((player.stats.average * player.stats.totalThrows) + 0) / newTotalThrows * 100
                            ) / 100
                        }
                    },
                    currentPlayer: isP1 ? 2 : 1
                };
            }

            // 2. CHECKOUT (Win Leg)
            if (newScore === 0) {
                 // Check double out? User code didn't strictly enforce it on the "input" level (assumed validated by caller or disregarded).
                 // We will assume valid checkout if score hits 0.
                 
                 // Update stats with checkout
                 const finalStats = {
                     ...newStats,
                     highestCheckout: Math.max(player.stats.highestCheckout, score)
                 };

                 const game = {
                     ...prev,
                     [isP1 ? 'player1' : 'player2']: {
                         ...player,
                         score: 0,
                         allThrows: newAllThrows,
                         stats: finalStats
                     },
                     // Winner found -> Pending state before "Confirm Leg"
                     // We expose `winner` in state to let UI show modal.
                      winner: (isP1 ? 'player1' : 'player2') as 'player1' | 'player2'
                 };
                 return game;
            }

            // 3. NORMAL THROW
            return {
                ...prev,
                 [isP1 ? 'player1' : 'player2']: {
                     ...player,
                     score: newScore,
                     allThrows: newAllThrows,
                     stats: newStats
                 },
                 currentPlayer: isP1 ? 2 : 1, // Switch player after EVERY throw?
                 // Standard Darts: 3 throws per turn.
                 // The user code switched player after EVERY throw? 
                 // `setCurrentPlayer(currentPlayer === 1 ? 2 : 1);` matches user code line 333 in LocalMatchGame.tsx
                 // WAIT. Line 333: `setCurrentPlayer(currentPlayer === 1 ? 2 : 1);`
                 // That means 1 dart per turn rotation? That is extremely non-standard for 501.
                 // Let me double check `LocalMatchGame.tsx`.
                 // "Quick Access Scores" buttons are 180, 140, 100... those are 3-dart aggregates!
                 // "Numbers" keyboard -> `handleManualInput` builds a string, then `submitScore` calls `handleThrow`.
                 // So `handleThrow` receives the TOTAL SCORE of the turn (3 darts).
                 // AH! So it is "Enter score after 3 darts".
                 // In that case, 1 "throw" event = 1 turn.
                 // BUT Scolia sends "Throw Detected" per DART.
                 // So for Scolia, we need to accumulate 3 darts before switching? 
                 // Or does the UI support single dart updates?
                 // The UI shows a list of scores.
                 // If I use Scolia, I get 20, 20, 20. 
                 // If I feed 20 to `handleThrow`, it switches player!
                 // This hook needs to handle "Current Turn Score" vs "Game Score".
                 
                 // However, to keep `LocalMatchGame` (Manual Input) working, `handleThrow` expects a TURN score.
                 // Solution: `handleThrow` should probably take `throws: number[]` or we need a mode.
                 // Or simpler: The Hook is "Turn Based". 
                 // `handleThrow` == "Finish Turn with Score X".
                 
                 // For Scolia integration:
                 // Scolia sends Dart 1, Dart 2, Dart 3.
                 // We need an intermediate buffer in `useScolia` or in the component to accumulate the turn?
                 // OR we update `useDartGame` to handle "darts left in turn".
                 
                 // If I change `useDartGame` to track darts (0-3), I break `LocalMatchGame`'s assumption that 1 input = 1 switch.
                 // UNLESS `LocalMatchGame` inputs are indeed turns.
                 // User code: `handleThrow(s, 1, s)` loops.
                 
                 // Let's make `useDartGame` flexible?
                 // No, better to keep it "Turn Based" (Score deduction -> Switch).
                 // And for Scolia, we accumulate darts in the UI/Hook adapter.
                 // Wait, if I see the chalkboard in `LocalMatchGame`:
                 // `{p1ThrowsCurrent.map...}` -> It lists the history.
                 // If history has [60, 60, 60], it means 3 turns of 60?
                 // Or 3 darts of 20? 
                 // "Quick Access" 180 = 3x T20.
                 // So the history IS turn-based.
                 
                 // So for Scolia, I will receive separate darts.
                 // I should accumulate them and only call `handleThrow` when:
                 // 1. 3 darts thrown
                 // 2. OR bust
                 // 3. OR checkout
                 // 4. OR manual "Next Player" (if fewer than 3 darts but finished turn? - unlikely in 501 unless doubled out).
                 
                 // Actually, showing real-time 501 stats requires showing individual darts (20... 40... 60).
                 // If I only update on "Turn End", the UI will be laggy/jumpy for Scolia.
                 // But `LocalMatchGame` UI seems designed for "Turn Scores".
                 // Refactoring to "Dart Based" is a Big Change.
                 // User requested "Implementation of Scolia ... keep current principles ... dont break working parts".
                 // "Current principles" seems to be Turn-Based inputs for manual.
                 
                 // However, Scolia is Dart-Based.
                 // If I map Scolia to Turn-Based, I hide the live updates.
                 // Maybe I can update the score optimisticly in a "current turn buffer"?
                 
                 // Let's stick to `handleThrow` = "Process a scored value and switch player".
                 // IF the user inputs 180, it's 1 turn.
                 // IF Scolia sends 60, it's 1 dart.
                 // If I pass 60 to `handleThrow`, it switches player. -> WRONG.
                 
                 // I will add `isTurnEnd` flag/check to `useDartGame`.
                 // Or better: `handleThrow(score, dartsCount, isTurnEnd)`?
                 // But `useDartGame` manages `currentPlayer`.
                 
                 // Let's Upgrade `useDartGame` to be DART based internally, but support "Bulk Throws" (Turn).
                 // BUT `LocalMatchGame` history expects "Scores per row".
                 // If I change history to `[20, 20, 20]` instead of `[60]`, the UI will render 3 rows?
                 // Line 329: `{p1ThrowsCurrent.map((s, i) => <div>{s}</div>...`
                 // Yes, it would render 3 rows.
                 
                 // So I MUST preserve "History = Turn Scores".
                 
                 // Plan for Scolia Integration:
                 // `useScolia` receives darts.
                 // `useDartGame` needs a way to "Acculmulate Score" without switching player?
                 // Or handle "Partial Turn".
                 
                 // Let's add `currentTurnScore` and `dartsThrownInTurn` to `GameState`.
                 // `handleThrow` can accept `isPartial`.
                 // No, simpler:
                 // The hook can expose `recordDart(score)` and `finishTurn()`.
                 // But `LocalMatchGame` calls `handleThrow(180)`.
                 // Wrapper: `handleThrow` calls `recordTurn(180)`.
                 
                 // Let's try to infer:
                 // If input > 60? No T20 is 60. 
                 // I can't infer.
                 
                 // I will create `handleTurn(score)` and `handleDart(score)`.
                 // `handleTurn` = `handleDart(score)` 3 times? No.
                 // `handleTurn` = Add to history, Switch Player.
                 
                 // `handleDart` (for Scolia) = 
                 //   Update "Current Turn Accumulator".
                 //   Decrement Score temporarily (optimistic).
                 //   If 3 darts or Checkout -> Commit to History, Switch Player.
                 
                 // This requires changing `GameState` to support "Pending Turn".
                 // `currentTurn: { scores: [], total: 0 }`.
                 // Display logic in UI will need to show `currentTurn` + `history`.
                 // Existing UI only shows `history`.
                 
                 // To avoid breaking UI: 
                 // I will keep `allThrows` as "Turn History".
                 // I will add `currentTurnThrows` (array of darts).
                 // When `currentTurnThrows` is full (3) or checkout -> push sum to `allThrows`, clear `currentTurnThrows`, switch player.
                 
                 // For `LocalMatchGame` manual input (Turn based):
                 // It simply calls `handleTurn(score)`.
                 // `handleTurn` pushes directly to `allThrows` and switches.
                 
                 // This seems compatible.
                 
                 // What about UI display?
                 // "Score" (Main Display) = `player.score` - `sum(currentTurnThrows)`.
                 // The existing UI uses `player.score`.
                 // So `player.score` MUST reflect the current turn deduction even if not committed to history?
                 // If I deduct from `player.score`, then `p1ThrowsCurrent` (history) won't match `score` unless I render current turn too.
                 // Existing UI: `p1ThrowsCurrent.map...`
                 
                 // Refined Plan:
                 // `GameState`:
                 //   `player.score`: Current score (updated dart-by-dart).
                 //   `player.history`: Array of Turn Scores (e.g. [100, 45, ...]).
                 //   `player.currentTurnThrows`: Array of darts in current turn (e.g. [20, 20]).
                 //   `currentPlayer`: 1 or 2.
                 //   `turnState`: 'awaiting' | 'busy'.
                 
                 // `handleTurn(score)` (Manual):
                 //   Updates `score` (-= score).
                 //   Pushes `score` to `history`.
                 //   Switches player.
                 //   Clears `currentTurnThrows`.
                 
                 // `handleDart(score)` (Scolia):
                 //   Updates `score` (-= score).
                 //   Pushes `score` to `currentTurnThrows`.
                 //   If `currentTurnThrows.length == 3` OR `score == 0` (Checkout) OR `Bust`:
                 //      Push sum(`currentTurnThrows`) to `history`.
                 //      Switch player.
                 //      Clear `currentTurnThrows`.
                 
                 // This way, manual input works as before. Scolia input updates the score live, and commits to history on turn end.
                 // The "Chalkboard" (History list) will only update at end of turn (like TV matches).
                 // The "Main Score" will update live.
                 
                 // One catch: `player.score` in `LocalMatchGame` state was "Score remaining".
                 // `allThrows` was history.
                 // Logic in component: `newScore = currentPlayerData.score - score`.
                 
                 // I will implement this hybrid approach.
            };
        });
    }, []);

    const startNextLeg = useCallback(() => {
        setGameState(prev => {
            const winnerId = prev.winner === 'player1' ? 1 : 2;
            const p1Legs = prev.player1.legsWon + (winnerId === 1 ? 1 : 0);
            const p2Legs = prev.player2.legsWon + (winnerId === 2 ? 1 : 0);
            
            // Check Match Win in Hook? 
            if (p1Legs >= prev.legsToWin || p2Legs >= prev.legsToWin) {
                return {
                   ...prev,
                   player1: { ...prev.player1, legsWon: p1Legs },
                   player2: { ...prev.player2, legsWon: p2Legs },
                   gameStatus: 'finished'
                };
            }

            const nextLegStartingPlayer = prev.legStartingPlayer === 1 ? 2 : 1;

            return {
                ...prev,
                player1: { 
                    ...prev.player1, 
                    score: initialScore, 
                    legsWon: p1Legs, 
                    allThrows: [], // Reset history for new leg
                    // Keep stats? Usually stats are match-wide.
                    // LocalMatchGame logic: `setPlayer1(prev => ({ ...prev, score: initialScore, allThrows: [] }));`
                    // It kept stats.
                     // IMPORTANT: The `allThrows` in LocalMatchGame seemed to be *Leg* History because it's reset here.
                },
                player2: { 
                    ...prev.player2, 
                    score: initialScore, 
                    legsWon: p2Legs, 
                    allThrows: [] 
                },
                currentLeg: prev.currentLeg + 1,
                currentPlayer: nextLegStartingPlayer,
                legStartingPlayer: nextLegStartingPlayer,
                winner: null,
                // Save Leg to history?
                // `LocalMatchGame` did `setLegs(prev => [...prev, leg])`.
                // We should add to `prev.legs`.
                legs: [
                    ...prev.legs,
                    {
                        legNumber: prev.currentLeg,
                        player1Throws: prev.player1.allThrows,
                        player2Throws: prev.player2.allThrows,
                        player1Score: prev.player1.allThrows.reduce((a,b)=>a+b,0),
                        player2Score: prev.player2.allThrows.reduce((a,b)=>a+b,0),
                        winner: winnerId,
                        createdAt: new Date()
                    }
                ]
            };
        });
    }, [initialScore]);
    
    const undoThrow = useCallback(() => {
        setGameState(prev => {
             // Undo logic needs to handle:
             // 1. Current Turn (Scolia darts) - Pop from `currentTurnThrows`, add back to `score`.
             // 2. Previous Turn (Manual/Scolia finished turn) - Revert player switch, pop from `history`, add back to `score`.
             
             // For simplicity and compatibility with Manual mode first:
             // Assume `allThrows` has the history.
             // If we just switched (Scolia finished turn), we are on other player.
             // We need to switch back and pop.
             
             const isP1 = prev.currentPlayer === 1;
             // The player who *just* threw is the OTHER player.
             const playerToUndo = isP1 ? prev.player2 : prev.player1;
             
             if (playerToUndo.allThrows.length === 0) return prev; // No history to undo
             
             const lastThrow = playerToUndo.allThrows[playerToUndo.allThrows.length - 1];
             const newAllThrows = playerToUndo.allThrows.slice(0, -1);
             const newScore = playerToUndo.score + lastThrow;
             
             // Recalc Stats (Average)? 
             // Ideally we should keep full history to recalc accurately.
             // Or approximate: 
             
             return {
                 ...prev,
                 [isP1 ? 'player2' : 'player1']: {
                     ...playerToUndo,
                     score: newScore,
                     allThrows: newAllThrows
                 },
                 currentPlayer: isP1 ? 2 : 1 // Switch back
             };
        });
    }, []);

    const editThrow = useCallback((playerIdx: 1 | 2, throwIdx: number, newScore: number) => {
        setGameState(prev => {
            const isP1 = playerIdx === 1;
            const player = isP1 ? prev.player1 : prev.player2;
            
            if (throwIdx < 0 || throwIdx >= player.allThrows.length) return prev;
            
            const newAllThrows = [...player.allThrows];
            newAllThrows[throwIdx] = newScore;
            
            // Recalculate score from start
            let calculatedScore = initialScore;
            for (const t of newAllThrows) {
                calculatedScore -= t;
            }
            
            if (calculatedScore < 0) {
                toast.error('Érvénytelen szerkesztés: a pontszám nem lehet negatív!');
                return prev;
            }
            
            const newTotalThrows = newAllThrows.length;
            const newAvg = newTotalThrows > 0 
                ? Math.round((newAllThrows.reduce((a, b) => a + b, 0) / newTotalThrows) * 100) / 100
                : 0;
                
            const newStats: PlayerStats = {
                ...player.stats,
                totalThrows: newTotalThrows,
                average: newAvg,
                highestCheckout: newAllThrows.reduce((max, t, idx) => {
                    // Check if this throw was a checkout (only for the last throw of the leg)
                    // But in this simple hook, we don't know if history is multi-leg or not easily.
                    // Actually allThrows is reset every leg.
                    // So any throw that leads to 0 is a checkout.
                    // Wait, if I edit an intermediate throw to hit 0, it becomes the new checkout.
                    let tempScore = initialScore;
                    for(let i=0; i<=idx; i++) tempScore -= newAllThrows[i];
                    if (tempScore === 0) return Math.max(max, t);
                    return max;
                }, 0)
            };

            const updatedPlayer = {
                ...player,
                score: calculatedScore,
                allThrows: newAllThrows,
                stats: newStats
            };

            const newState = {
                ...prev,
                [isP1 ? 'player1' : 'player2']: updatedPlayer,
                winner: calculatedScore === 0 ? (isP1 ? 'player1' : 'player2') as 'player1' | 'player2' : prev.winner
            };

            return newState;
        });
    }, [initialScore]);

    const resetGame = useCallback(() => {
        setGameState({
            player1: createInitialPlayer("1"),
            player2: createInitialPlayer("2"),
            currentPlayer: startingPlayer,
            legStartingPlayer: startingPlayer,
            currentLeg: 1,
            legsToWin,
            legs: [],
            gameStatus: 'pending',
            winner: null
        });
    }, [initialScore, legsToWin, startingPlayer]);

  return {
      gameState,
      setGameState,
      handleThrow,
      undoThrow,
      editThrow,
      resetGame,
      startNextLeg
  };
};
